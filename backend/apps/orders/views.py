from decimal import Decimal
import secrets
import requests
from django.conf import settings
from django.db import transaction, models
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.catalogue.models import Product, ProductVariant
from .models import Cart, CartItem, Order, OrderItem, OrderReturn
from .serializers import (
    CartSerializer,
    AddToCartSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    OrderReturnSerializer,
    CreateOrderReturnSerializer,
)
from .invoice import generate_invoice_pdf
from .return_label import generate_return_label_pdf
from .email import send_order_confirmation_email, send_return_label_email


class CartViewSet(viewsets.GenericViewSet):
    queryset = Cart.objects.all().prefetch_related('items__product', 'items__variant')
    serializer_class = CartSerializer

    @action(detail=False, methods=['get'])
    def current(self, request):
        cart_id = request.query_params.get('cart_id')
        session_key = request.session.session_key or ''
        
        cart = None
        if cart_id:
            cart = Cart.objects.filter(id=cart_id).first()
        
        if not cart and session_key:
            cart = Cart.objects.filter(session_key=session_key).first()

        if not cart:
            cart = Cart.objects.create(session_key=session_key)

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        cart_id = request.data.get('cart_id')
        cart = None
        if cart_id:
            cart = Cart.objects.filter(id=cart_id).first()
        if not cart:
            cart = Cart.objects.create()

        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product_id']
        variant_id = serializer.validated_data.get('variant_id')
        quantity = serializer.validated_data.get('quantity', 1)

        product = Product.objects.get(id=product_id)
        variant = ProductVariant.objects.filter(id=variant_id).first() if variant_id else None

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={'quantity': quantity}
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        cart_id = request.data.get('cart_id')
        item_id = request.data.get('item_id')
        quantity = request.data.get('quantity')

        if not cart_id or not item_id or quantity is None:
            return Response(
                {"error": "cart_id, item_id, und quantity sind erforderlich."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart = Cart.objects.filter(id=cart_id).first()
        if not cart:
            return Response({"error": "Warenkorb nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        item = CartItem.objects.filter(cart=cart, id=item_id).first()
        if not item:
            return Response({"error": "Position nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        try:
            qty = int(quantity)
            if qty <= 0:
                item.delete()
            else:
                item.quantity = qty
                item.save()
        except ValueError:
            return Response({"error": "Ungültige Anzahl."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart_id = request.data.get('cart_id')
        item_id = request.data.get('item_id')

        cart = Cart.objects.filter(id=cart_id).first()
        if not cart:
            return Response({"error": "Warenkorb nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        CartItem.objects.filter(cart=cart, id=item_id).delete()
        return Response(CartSerializer(cart).data)


class OrderViewSet(viewsets.GenericViewSet):
    queryset = Order.objects.all().prefetch_related('items__product__images', 'items__product__brand')
    serializer_class = OrderSerializer

    def list(self, request):
        """
        List orders for the authenticated user, or allow lookup by email query parameter.
        """
        if request.user and request.user.is_authenticated:
            orders = Order.objects.filter(
                models.Q(user=request.user) | models.Q(email__iexact=request.user.email)
            ).prefetch_related('items__product__images', 'items__product__brand').order_by('-created_at')
        else:
            email = request.query_params.get('email')
            if not email:
                return Response(
                    {"error": "Authentifizierung oder E-Mail-Filter erforderlich."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            orders = Order.objects.filter(
                email__iexact=email.strip()
            ).prefetch_related('items__product__images', 'items__product__brand').order_by('-created_at')

        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """
        Retrieve a single order by ID with ownership checks.
        """
        order = Order.objects.filter(id__iexact=pk).prefetch_related('items__product__images', 'items__product__brand').first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if order.user != request.user and order.email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email')
            if not email or email.strip().lower() != order.email.lower():
                return Response({"error": "Zugriff verweigert. Bitte E-Mail angeben."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart_id = data.get('cart_id')
        raw_items = data.get('items')
        shipping_method = data.get('shipping_method', 'standard')
        payment_method = data.get('payment_method', 'stripe')

        order_items_data = []

        if cart_id:
            cart = Cart.objects.filter(id=cart_id).first()
            if not cart or cart.items.count() == 0:
                return Response(
                    {"error": "Der Warenkorb ist leer oder nicht vorhanden."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            for ci in cart.items.all():
                order_items_data.append({
                    'product': ci.product,
                    'variant': ci.variant,
                    'product_name': ci.product.name,
                    'quantity': ci.quantity,
                    'unit_price': ci.unit_price,
                })
        elif raw_items:
            for item in raw_items:
                product_id = item.get('product_id')
                product = Product.objects.filter(id=product_id).first()
                if not product and product_id:
                    product = Product.objects.filter(slug=product_id).first()
                if not product and item.get('name'):
                    product = Product.objects.filter(name__iexact=item.get('name')).first()
                if not product:
                    product = Product.objects.first()
                if not product:
                    continue

                variant_id = item.get('variant_id')
                variant = ProductVariant.objects.filter(id=variant_id).first() if variant_id else None
                passed_price = item.get('price')
                if passed_price is not None:
                    try:
                        unit_price = Decimal(str(passed_price))
                    except Exception:
                        unit_price = variant.price if (variant and variant.price is not None) else product.price
                else:
                    unit_price = variant.price if (variant and variant.price is not None) else product.price

                qty = int(item.get('quantity', 1))
                item_name = item.get('name') or product.name

                order_items_data.append({
                    'product': product,
                    'variant': variant,
                    'product_name': item_name,
                    'quantity': qty,
                    'unit_price': unit_price,
                })

        if not order_items_data:
            return Response({"error": "Keine gültigen Positionen für die Bestellung."}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = sum(Decimal(str(item['unit_price'])) * item['quantity'] for item in order_items_data)

        if shipping_method == 'express':
            shipping_total = Decimal('9.99')
        else:
            shipping_total = Decimal('0.00') if subtotal >= Decimal('50.00') else Decimal('4.90')

        grand_total = subtotal + shipping_total

        tax_total = (grand_total - (grand_total / Decimal('1.19'))).quantize(Decimal('0.01'))

        today_str = timezone.now().strftime('%Y%m%d')
        random_suffix = secrets.token_hex(2).upper()
        order_id = f"TS-{today_str}-{random_suffix}"

        user = request.user if request.user and request.user.is_authenticated else None

        with transaction.atomic():
            order = Order.objects.create(
                id=order_id,
                user=user,
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                street=data['street'],
                postal_code=data['postal_code'],
                city=data['city'],
                country=data.get('country', 'Deutschland'),
                phone=data.get('phone', ''),
                payment_method=payment_method,
                payment_status='paid' if payment_method in ('stripe', 'credit_card', 'klarna', 'apple_pay') else 'pending',
                status='confirmed',
                subtotal=subtotal,
                shipping_total=shipping_total,
                tax_total=tax_total,
                grand_total=grand_total,
                currency='EUR',
                tracking_number=f"DHL-DE-{secrets.token_hex(4).upper()}"
            )

            for oi in order_items_data:
                item_total = Decimal(str(oi['unit_price'])) * oi['quantity']
                item_tax = (item_total - (item_total / Decimal('1.19'))).quantize(Decimal('0.01'))
                OrderItem.objects.create(
                    order=order,
                    product=oi['product'],
                    variant=oi['variant'],
                    product_name=oi['product_name'],
                    quantity=oi['quantity'],
                    unit_price=oi['unit_price'],
                    tax_amount=item_tax
                )

            if cart_id and 'cart' in locals() and cart:
                cart.items.all().delete()

        created_order = Order.objects.filter(id=order.id).prefetch_related('items__product__images', 'items__product__brand').first()

        try:
            send_order_confirmation_email(created_order)
        except Exception:
            pass

        return Response(OrderSerializer(created_order).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='create-stripe-session')
    def create_stripe_session(self, request):
        """
        Creates an Order in pending_payment state and initializes a real Stripe Checkout Session
        using the server's configured STRIPE_SECRET_KEY.
        """
        stripe_secret = getattr(settings, 'STRIPE_SECRET_KEY', '') or ''
        if not stripe_secret:
            return Response({
                "success": False,
                "error": "Stripe-Zahlungsgateway ist auf dem Server noch nicht konfiguriert."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart_id = data.get('cart_id')
        raw_items = data.get('items')
        shipping_method = data.get('shipping_method', 'standard')

        order_items_data = []

        if cart_id:
            cart = Cart.objects.filter(id=cart_id).first()
            if not cart or cart.items.count() == 0:
                return Response(
                    {"error": "Der Warenkorb ist leer oder nicht vorhanden."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            for ci in cart.items.all():
                order_items_data.append({
                    'product': ci.product,
                    'variant': ci.variant,
                    'product_name': ci.product.name,
                    'quantity': ci.quantity,
                    'unit_price': ci.unit_price,
                })
        elif raw_items:
            for item in raw_items:
                product_id = item.get('product_id')
                product = Product.objects.filter(id=product_id).first()
                if not product and product_id:
                    product = Product.objects.filter(slug=product_id).first()
                if not product and item.get('name'):
                    product = Product.objects.filter(name__iexact=item.get('name')).first()
                if not product:
                    product = Product.objects.first()
                if not product:
                    continue

                variant_id = item.get('variant_id')
                variant = ProductVariant.objects.filter(id=variant_id).first() if variant_id else None
                passed_price = item.get('price')
                if passed_price is not None:
                    try:
                        unit_price = Decimal(str(passed_price))
                    except Exception:
                        unit_price = variant.price if (variant and variant.price is not None) else product.price
                else:
                    unit_price = variant.price if (variant and variant.price is not None) else product.price

                qty = int(item.get('quantity', 1))
                item_name = item.get('name') or product.name

                order_items_data.append({
                    'product': product,
                    'variant': variant,
                    'product_name': item_name,
                    'quantity': qty,
                    'unit_price': unit_price,
                })

        if not order_items_data:
            return Response({"error": "Keine gültigen Positionen für die Bestellung."}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = sum(Decimal(str(item['unit_price'])) * item['quantity'] for item in order_items_data)

        if shipping_method == 'express':
            shipping_total = Decimal('9.99')
        else:
            shipping_total = Decimal('0.00') if subtotal >= Decimal('50.00') else Decimal('4.90')

        grand_total = subtotal + shipping_total
        tax_total = (grand_total - (grand_total / Decimal('1.19'))).quantize(Decimal('0.01'))

        today_str = timezone.now().strftime('%Y%m%d')
        random_suffix = secrets.token_hex(2).upper()
        order_id = f"TS-{today_str}-{random_suffix}"

        user = request.user if request.user and request.user.is_authenticated else None

        with transaction.atomic():
            order = Order.objects.create(
                id=order_id,
                user=user,
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                street=data['street'],
                postal_code=data['postal_code'],
                city=data['city'],
                country=data.get('country', 'Deutschland'),
                phone=data.get('phone', ''),
                payment_method='stripe',
                payment_status='pending',
                status='pending_payment',
                subtotal=subtotal,
                shipping_total=shipping_total,
                tax_total=tax_total,
                grand_total=grand_total,
                currency='EUR',
                tracking_number=f"DHL-DE-{secrets.token_hex(4).upper()}"
            )

            for oi in order_items_data:
                item_total = Decimal(str(oi['unit_price'])) * oi['quantity']
                item_tax = (item_total - (item_total / Decimal('1.19'))).quantize(Decimal('0.01'))
                OrderItem.objects.create(
                    order=order,
                    product=oi['product'],
                    variant=oi['variant'],
                    product_name=oi['product_name'],
                    quantity=oi['quantity'],
                    unit_price=oi['unit_price'],
                    tax_amount=item_tax
                )

            if cart_id and 'cart' in locals() and cart:
                cart.items.all().delete()

        # Build Stripe Checkout Session
        origin = request.headers.get('Origin') or request.META.get('HTTP_ORIGIN') or getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173')
        origin = origin.rstrip('/')

        success_url = f"{origin}/checkout?payment_status=success&session_id={{CHECKOUT_SESSION_ID}}&order_id={order.id}"
        cancel_url = f"{origin}/checkout?payment_status=cancelled&order_id={order.id}"

        stripe_data = {
            'mode': 'payment',
            'customer_email': order.email,
            'client_reference_id': order.id,
            'metadata[order_id]': order.id,
            'metadata[customer_email]': order.email,
            'success_url': success_url,
            'cancel_url': cancel_url,
            'locale': 'de',
        }

        for idx, oi in enumerate(order_items_data):
            unit_cents = int(round(float(oi['unit_price']) * 100))
            stripe_data[f'line_items[{idx}][price_data][currency]'] = 'eur'
            stripe_data[f'line_items[{idx}][price_data][product_data][name]'] = oi['product_name']
            stripe_data[f'line_items[{idx}][price_data][unit_amount]'] = str(unit_cents)
            stripe_data[f'line_items[{idx}][quantity]'] = str(oi['quantity'])

        if shipping_total > 0:
            ship_idx = len(order_items_data)
            ship_cents = int(round(float(shipping_total) * 100))
            ship_label = 'DHL Expressversand (2-5 Werktage)' if shipping_method == 'express' else 'DHL Standardversand (3-15 Werktage)'
            stripe_data[f'line_items[{ship_idx}][price_data][currency]'] = 'eur'
            stripe_data[f'line_items[{ship_idx}][price_data][product_data][name]'] = ship_label
            stripe_data[f'line_items[{ship_idx}][price_data][unit_amount]'] = str(ship_cents)
            stripe_data[f'line_items[{ship_idx}][quantity]'] = '1'

        try:
            stripe_res = requests.post(
                'https://api.stripe.com/v1/checkout/sessions',
                headers={'Authorization': f'Bearer {stripe_secret}'},
                data=stripe_data,
                timeout=15
            )
            stripe_json = stripe_res.json()
            if stripe_res.status_code != 200 or 'error' in stripe_json:
                error_msg = stripe_json.get('error', {}).get('message', 'Fehler beim Erstellen der Stripe-Sitzung.')
                return Response({"success": False, "error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                "success": True,
                "checkout_url": stripe_json.get('url'),
                "session_id": stripe_json.get('id'),
                "order_id": order.id,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "success": False,
                "error": f"Verbindungsfehler zu Stripe: {str(e)}"
            }, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['post'], url_path='verify-stripe-session')
    def verify_stripe_session(self, request):
        """
        Verify Stripe session payment status with Stripe API, mark order as paid and confirmed,
        and send confirmation email with invoice.
        """
        session_id = request.data.get('session_id') or request.query_params.get('session_id')
        order_id = request.data.get('order_id') or request.query_params.get('order_id')

        if not session_id or not order_id:
            return Response({"success": False, "error": "session_id und order_id sind erforderlich."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(id__iexact=order_id).prefetch_related('items__product__images', 'items__product__brand').first()
        if not order:
            return Response({"success": False, "error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        stripe_secret = getattr(settings, 'STRIPE_SECRET_KEY', '') or ''
        if not stripe_secret:
            return Response({"success": False, "error": "Stripe nicht konfiguriert."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            stripe_res = requests.get(
                f'https://api.stripe.com/v1/checkout/sessions/{session_id}',
                headers={'Authorization': f'Bearer {stripe_secret}'},
                timeout=15
            )
            session_data = stripe_res.json()
            if stripe_res.status_code != 200 or 'error' in session_data:
                return Response({"success": False, "error": session_data.get('error', {}).get('message', 'Sitzung ungültig.')}, status=status.HTTP_400_BAD_REQUEST)

            payment_status = session_data.get('payment_status')
            if payment_status == 'paid':
                order.payment_status = 'paid'
                order.status = 'confirmed'
                order.payment_method = 'stripe'
                order.save()

                try:
                    send_order_confirmation_email(order)
                except Exception:
                    pass

                return Response({
                    "success": True,
                    "order": OrderSerializer(order).data,
                    "payment_status": "paid"
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "payment_status": payment_status,
                    "error": "Die Zahlung wurde von Stripe noch nicht bestätigt."
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"success": False, "error": f"Fehler bei der Überprüfung der Stripe-Zahlung: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        """
        Download legally compliant German GoBD and §14 UStG PDF invoice.
        Accessible by order owner (authenticated) or guest with matching email verification.
        """
        order = Order.objects.filter(id__iexact=pk).prefetch_related('items__product__images', 'items__product__brand').first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if order.user != request.user and order.email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email')
            if not email or email.strip().lower() != order.email.lower():
                return Response({"error": "Zugriff verweigert. Bitte E-Mail angeben."}, status=status.HTTP_403_FORBIDDEN)

        pdf_bytes = generate_invoice_pdf(order)
        filename = f"Rechnung_{order.id.replace('TS-', 'RE-')}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        response['Content-Length'] = len(pdf_bytes)
        return response

    @action(detail=True, methods=['post'])
    def resend_confirmation(self, request, pk=None):
        """
        Resend order confirmation email with attached GoBD PDF invoice.
        """
        order = Order.objects.filter(id__iexact=pk).first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if order.user != request.user and order.email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email') or request.data.get('email')
            if not email or email.strip().lower() != order.email.lower():
                return Response({"error": "Zugriff verweigert. Bitte E-Mail angeben."}, status=status.HTTP_403_FORBIDDEN)

        result = send_order_confirmation_email(order)
        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='upload-proof')
    def upload_proof(self, request, pk=None):
        """
        Upload payment proof (receipt/bank transfer screenshot/PDF) for an order.
        """
        order = Order.objects.filter(id__iexact=pk).first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if order.user != request.user and order.email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email') or request.data.get('email')
            if email and email.strip().lower() != order.email.lower():
                return Response({"error": "Zugriff verweigert. E-Mail stimmt nicht überein."}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get('file') or request.FILES.get('proof')
        note = request.data.get('note', '')

        if file_obj:
            order.payment_proof = file_obj
            order.payment_proof_note = note or file_obj.name
        else:
            filename = request.data.get('filename') or 'ueberweisungsbeleg.pdf'
            order.payment_proof_note = note or filename

        order.payment_status = 'proof_submitted'
        order.payment_proof_uploaded_at = timezone.now()
        order.save()

        return Response({
            "success": True,
            "message": "Zahlungsnachweis erfolgreich übermittelt. Wir prüfen Ihren Beleg und geben die Bestellung frei.",
            "payment_status": order.payment_status,
            "uploaded_at": order.payment_proof_uploaded_at.isoformat(),
            "filename": file_obj.name if file_obj else (request.data.get('filename') or 'ueberweisungsbeleg.pdf')
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def track(self, request):
        order_id = request.query_params.get('order_id')
        email = request.query_params.get('email')

        if not order_id:
            return Response({"error": "order_id ist erforderlich."}, status=status.HTTP_400_BAD_REQUEST)

        qs = Order.objects.filter(id__iexact=order_id).prefetch_related('items__product__images', 'items__product__brand')
        if email:
            qs = qs.filter(email__iexact=email.strip())

        order = qs.first()
        if not order:
            return Response(
                {"error": "Keine passende Bestellung unter diesen Angaben gefunden."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(OrderSerializer(order).data)


class OrderReturnViewSet(viewsets.ModelViewSet):
    queryset = OrderReturn.objects.all().select_related('order')
    serializer_class = OrderReturnSerializer

    def list(self, request):
        """
        List returns for authenticated user, or by email/order_id query param for guests.
        """
        if request.user and request.user.is_authenticated:
            returns = OrderReturn.objects.filter(
                models.Q(order__user=request.user) |
                models.Q(customer_email__iexact=request.user.email)
            ).select_related('order').order_by('-created_at')
        else:
            email = request.query_params.get('email')
            order_id = request.query_params.get('order_id')
            if not email and not order_id:
                return Response(
                    {"error": "Authentifizierung, E-Mail-Filter oder Bestellnummer erforderlich."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            qs = OrderReturn.objects.all().select_related('order')
            if email:
                qs = qs.filter(customer_email__iexact=email.strip())
            if order_id:
                qs = qs.filter(order_id__iexact=order_id.strip())
            returns = qs.order_by('-created_at')

        serializer = self.get_serializer(returns, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        ret = OrderReturn.objects.filter(id__iexact=pk).select_related('order').first()
        if not ret:
            return Response({"error": "Rücksendung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if ret.order.user != request.user and ret.customer_email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email')
            if not email or email.strip().lower() != ret.customer_email.lower():
                return Response({"error": "Zugriff verweigert. Bitte E-Mail angeben."}, status=status.HTTP_403_FORBIDDEN)

        return Response(self.get_serializer(ret).data)

    def create(self, request):
        serializer = CreateOrderReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order = Order.objects.filter(id__iexact=data['order_id']).prefetch_related('items').first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if order.email.strip().lower() != data['customer_email'].strip().lower():
            return Response(
                {"error": "Die angegebene E-Mail-Adresse stimmt nicht mit den Bestelldaten überein."},
                status=status.HTTP_400_BAD_REQUEST
            )

        items = data.get('items', [])
        refund_amount = Decimal('0.00')

        if items:
            for item in items:
                qty = int(item.get('quantity', 1))
                price = Decimal(str(item.get('unit_price') or item.get('price', '0.00')))
                refund_amount += (price * qty)
        else:
            refund_amount = order.subtotal
            items = [
                {
                    'product_id': it.product.id,
                    'product_name': it.product_name,
                    'quantity': it.quantity,
                    'unit_price': float(it.unit_price)
                }
                for it in order.items.all()
            ]

        customer_name = f"{order.first_name} {order.last_name}".strip()
        return_id = f"RET-DE-{secrets.token_hex(4).upper()}"
        tracking_num = f"00340434{secrets.token_hex(6).upper()}"

        return_obj = OrderReturn.objects.create(
            id=return_id,
            order=order,
            customer_email=data['customer_email'].strip().lower(),
            customer_name=customer_name,
            reason=data.get('reason', 'not_liked'),
            customer_notes=data.get('customer_notes', ''),
            refund_method=data.get('refund_method', 'original_payment'),
            refund_amount=refund_amount,
            items_data=items,
            status='label_created',
            return_tracking_number=tracking_num,
            carrier='DHL Retoure Deutschland'
        )

        try:
            send_return_label_email(return_obj)
        except Exception:
            pass

        return Response(OrderReturnSerializer(return_obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def label(self, request, pk=None):
        """
        Download German DHL Retourenschein & Paketlabel PDF.
        """
        ret = OrderReturn.objects.filter(id__iexact=pk).select_related('order').first()
        if not ret:
            return Response({"error": "Rücksendung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if ret.order.user != request.user and ret.customer_email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email')
            if not email or email.strip().lower() != ret.customer_email.lower():
                return Response({"error": "Zugriff verweigert. Bitte E-Mail angeben."}, status=status.HTTP_403_FORBIDDEN)

        pdf_bytes = generate_return_label_pdf(ret)
        filename = f"DHL_Retourenschein_{ret.id}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        response['Content-Length'] = len(pdf_bytes)
        return response

    @action(detail=True, methods=['post'])
    def resend_label(self, request, pk=None):
        """
        Resend DHL return label email with attached PDF Retourenschein.
        """
        ret = OrderReturn.objects.filter(id__iexact=pk).select_related('order').first()
        if not ret:
            return Response({"error": "Rücksendung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            if ret.order.user != request.user and ret.customer_email.lower() != request.user.email.lower():
                return Response({"error": "Zugriff verweigert."}, status=status.HTTP_403_FORBIDDEN)
        else:
            email = request.query_params.get('email') or request.data.get('email')
            if not email or email.strip().lower() != ret.customer_email.lower():
                return Response({"error": "Zugriff verweigert. Bitte E-Mail angeben."}, status=status.HTTP_403_FORBIDDEN)

        result = send_return_label_email(ret)
        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def track(self, request):
        return_id = request.query_params.get('return_id')
        email = request.query_params.get('email')

        if not return_id:
            return Response({"error": "return_id ist erforderlich."}, status=status.HTTP_400_BAD_REQUEST)

        qs = OrderReturn.objects.filter(id__iexact=return_id.strip()).select_related('order')
        if email:
            qs = qs.filter(customer_email__iexact=email.strip())

        ret = qs.first()
        if not ret:
            return Response(
                {"error": "Keine passende Rücksendung unter diesen Angaben gefunden."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(OrderReturnSerializer(ret).data)

