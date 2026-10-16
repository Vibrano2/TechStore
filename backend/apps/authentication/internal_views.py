from decimal import Decimal
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission

from .models import AuthToken, UserProfile
from apps.orders.models import Order, OrderItem, OrderReturn
from apps.catalogue.models import Product, Category, Brand, EMobilityCompliance
from apps.compliance.models import WarrantyClaim
from apps.orders.email import send_order_confirmation_email


class IsAdminOrStaff(BasePermission):
    """
    Allows access only to authenticated staff or superusers,
    or requests with valid internal admin key header.
    """
    def has_permission(self, request, view):
        admin_key = request.headers.get('X-Admin-Key')
        configured_key = getattr(settings, 'ADMIN_SECRET_KEY', None)
        if configured_key and admin_key and admin_key.strip() == configured_key.strip():
            return True

        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class AdminLoginView(APIView):
    permission_classes = []

    def post(self, request):
        username = (request.data.get('username') or request.data.get('email') or '').strip()
        password = (request.data.get('password') or '').strip()

        if not username or not password:
            return Response(
                {"error": "Benutzername und Passwort sind erforderlich."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Try standard Django authentication
        user = authenticate(username=username, password=password)
        if not user:
            # Try looking up by email
            matched = User.objects.filter(email__iexact=username).first()
            if matched and matched.check_password(password):
                user = matched

        # 2. Check for configured master initial admin credentials
        configured_user = getattr(settings, 'ADMIN_USERNAME', 'admin')
        configured_pass = getattr(settings, 'ADMIN_PASSWORD', 'TechnikWelt2026!Admin')
        configured_email = getattr(settings, 'ADMIN_EMAIL', 'admin@technikwelt.shop')

        if not user and (username.lower() in (configured_user.lower(), configured_email.lower())) and password == configured_pass:
            user, _ = User.objects.get_or_create(
                username=configured_user,
                defaults={'email': configured_email, 'is_staff': True, 'is_superuser': True}
            )
            user.is_staff = True
            user.is_superuser = True
            user.set_password(configured_pass)
            user.save()

        if not user:
            return Response(
                {"error": "Ungültige Anmeldedaten. Zugriff verweigert."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not (user.is_staff or user.is_superuser):
            return Response(
                {"error": "Keine Administrator-Berechtigung für dieses Konto."},
                status=status.HTTP_403_FORBIDDEN
            )

        token = AuthToken.create_for_user(user, days_valid=14)

        return Response({
            "success": True,
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.get_full_name() or "Administrator",
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            }
        }, status=status.HTTP_200_OK)


class AdminMeView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        return Response({
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "full_name": request.user.get_full_name() or "Administrator",
            "is_staff": request.user.is_staff,
            "is_superuser": request.user.is_superuser,
            "server_time": timezone.now().isoformat(),
        })


class AdminStatsView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        seven_days_ago = now - timedelta(days=7)

        # Revenue calculation (paid or captured orders)
        paid_orders = Order.objects.filter(payment_status__in=['paid', 'captured'])
        total_revenue = paid_orders.aggregate(models.Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')

        # Recent 7 days revenue
        revenue_7d = paid_orders.filter(created_at__gte=seven_days_ago).aggregate(models.Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')

        total_orders = Order.objects.count()
        orders_today = Order.objects.filter(created_at__date=today).count()
        pending_payment_proofs = Order.objects.filter(payment_status='proof_submitted').count()
        pending_orders = Order.objects.filter(status__in=['order_received', 'payment_confirmed', 'processing']).count()

        active_returns = OrderReturn.objects.exclude(status__in=['refunded', 'rejected']).count()
        active_warranties = WarrantyClaim.objects.exclude(status__in=['closed', 'rejected']).count()

        low_stock_products = Product.objects.filter(stock__lte=5).count()
        total_products = Product.objects.count()
        total_customers = User.objects.filter(is_staff=False).count()

        # Daily revenue points for the last 7 days
        daily_points = []
        for i in range(6, -1, -1):
            day_date = today - timedelta(days=i)
            day_rev = Order.objects.filter(
                payment_status__in=['paid', 'captured'],
                created_at__date=day_date
            ).aggregate(models.Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')
            day_orders = Order.objects.filter(created_at__date=day_date).count()
            daily_points.append({
                "date": day_date.strftime('%d.%m.'),
                "day_name": day_date.strftime('%a'),
                "revenue": float(day_rev),
                "orders": day_orders,
            })

        # Orders by status breakdown
        status_counts = {}
        for s_code, _ in Order.ORDER_STATUS_CHOICES:
            status_counts[s_code] = Order.objects.filter(status=s_code).count()

        return Response({
            "metrics": {
                "total_revenue": float(total_revenue),
                "revenue_7d": float(revenue_7d),
                "total_orders": total_orders,
                "orders_today": orders_today,
                "pending_payment_proofs": pending_payment_proofs,
                "pending_orders": pending_orders,
                "active_returns": active_returns,
                "active_warranties": active_warranties,
                "low_stock_products": low_stock_products,
                "total_products": total_products,
                "total_customers": total_customers,
            },
            "daily_points": daily_points,
            "status_counts": status_counts,
        })


class AdminOrdersView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        qs = Order.objects.all().prefetch_related('items').order_by('-created_at')

        status_param = request.query_params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status__iexact=status_param)

        payment_status = request.query_params.get('payment_status')
        if payment_status and payment_status != 'all':
            qs = qs.filter(payment_status__iexact=payment_status)

        payment_method = request.query_params.get('payment_method')
        if payment_method and payment_method != 'all':
            qs = qs.filter(payment_method__iexact=payment_method)

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(id__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(city__icontains=search)
            )

        orders_data = []
        for o in qs[:150]:
            items_list = []
            for it in o.items.all():
                items_list.append({
                    "id": it.id,
                    "product_name": it.product_name,
                    "quantity": it.quantity,
                    "unit_price": float(it.unit_price),
                    "total_price": float(it.unit_price * it.quantity),
                })

            proof_url = None
            if o.payment_proof:
                proof_url = o.payment_proof.url if hasattr(o.payment_proof, 'url') else str(o.payment_proof)

            orders_data.append({
                "id": o.id,
                "created_at": o.created_at.isoformat(),
                "status": o.status,
                "payment_status": o.payment_status,
                "payment_method": o.payment_method,
                "customer_name": f"{o.first_name} {o.last_name}".strip(),
                "email": o.email,
                "phone": o.phone,
                "shipping_address": {
                    "street": o.street,
                    "postal_code": o.postal_code,
                    "city": o.city,
                    "country": o.country,
                },
                "subtotal": float(o.subtotal),
                "shipping_total": float(o.shipping_total),
                "tax_total": float(o.tax_total),
                "grand_total": float(o.grand_total),
                "currency": o.currency,
                "tracking_number": o.tracking_number,
                "payment_proof_url": proof_url,
                "payment_proof_note": o.payment_proof_note,
                "payment_proof_uploaded_at": o.payment_proof_uploaded_at.isoformat() if o.payment_proof_uploaded_at else None,
                "items": items_list,
            })

        return Response({
            "count": len(orders_data),
            "orders": orders_data,
        })


class AdminOrderDetailView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request, order_id):
        o = Order.objects.filter(id__iexact=order_id).prefetch_related('items').first()
        if not o:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        items_list = []
        for it in o.items.all():
            items_list.append({
                "id": it.id,
                "product_name": it.product_name,
                "quantity": it.quantity,
                "unit_price": float(it.unit_price),
                "total_price": float(it.unit_price * it.quantity),
            })

        proof_url = None
        if o.payment_proof:
            proof_url = o.payment_proof.url if hasattr(o.payment_proof, 'url') else str(o.payment_proof)

        return Response({
            "id": o.id,
            "created_at": o.created_at.isoformat(),
            "status": o.status,
            "payment_status": o.payment_status,
            "payment_method": o.payment_method,
            "customer_name": f"{o.first_name} {o.last_name}".strip(),
            "email": o.email,
            "phone": o.phone,
            "shipping_address": {
                "street": o.street,
                "postal_code": o.postal_code,
                "city": o.city,
                "country": o.country,
            },
            "subtotal": float(o.subtotal),
            "shipping_total": float(o.shipping_total),
            "tax_total": float(o.tax_total),
            "grand_total": float(o.grand_total),
            "currency": o.currency,
            "tracking_number": o.tracking_number,
            "payment_proof_url": proof_url,
            "payment_proof_note": o.payment_proof_note,
            "payment_proof_uploaded_at": o.payment_proof_uploaded_at.isoformat() if o.payment_proof_uploaded_at else None,
            "items": items_list,
        })


class AdminOrderStatusView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request, order_id):
        order = Order.objects.filter(id__iexact=order_id).first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        tracking_number = request.data.get('tracking_number')

        if new_status:
            order.status = new_status
        if tracking_number is not None:
            order.tracking_number = tracking_number.strip()

        order.save()

        return Response({
            "success": True,
            "message": f"Bestellstatus für {order.id} aktualisiert auf '{order.status}'.",
            "order_id": order.id,
            "status": order.status,
            "tracking_number": order.tracking_number,
        })


class AdminOrderApprovePaymentView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request, order_id):
        order = Order.objects.filter(id__iexact=order_id).first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        order.payment_status = 'paid'
        if order.status in ('order_received', 'pending'):
            order.status = 'processing'
        order.save()

        # Dispatch confirmation email with invoice upon payment confirmation
        email_result = send_order_confirmation_email(order)

        return Response({
            "success": True,
            "message": f"Zahlung für Bestellung {order.id} erfolgreich genehmigt.",
            "payment_status": order.payment_status,
            "order_status": order.status,
            "email_dispatched": email_result.get('success', False),
        })


class AdminOrderRejectPaymentView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request, order_id):
        order = Order.objects.filter(id__iexact=order_id).first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', 'Zahlungsnachweis unvollständig oder unleserlich.')
        order.payment_status = 'failed'
        order.payment_proof_note = f"Abgelehnt: {reason}"
        order.save()

        return Response({
            "success": True,
            "message": f"Zahlungsnachweis für {order.id} wurde abgelehnt.",
            "payment_status": order.payment_status,
            "note": order.payment_proof_note,
        })


class AdminOrderResendInvoiceView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request, order_id):
        order = Order.objects.filter(id__iexact=order_id).first()
        if not order:
            return Response({"error": "Bestellung nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        result = send_order_confirmation_email(order)
        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminProductsView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        qs = Product.objects.all().select_related('category', 'brand', 'emobility_compliance').order_by('name')

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(name__icontains=search) |
                models.Q(id__icontains=search) |
                models.Q(brand__name__icontains=search) |
                models.Q(category__name__icontains=search)
            )

        category = request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category__slug__iexact=category)

        stock_filter = request.query_params.get('stock_filter')
        if stock_filter == 'low':
            qs = qs.filter(stock__lte=5, stock__gt=0)
        elif stock_filter == 'out':
            qs = qs.filter(stock=0)

        products_data = []
        for p in qs[:200]:
            compliance = getattr(p, 'emobility_compliance', None)
            first_image = p.images.first()
            image_url = first_image.url if first_image else ''

            products_data.append({
                "id": p.id,
                "slug": p.slug,
                "name": p.name,
                "brand": p.brand.name if p.brand else 'TechnikWelt',
                "category": p.category.name if p.category else 'Allgemein',
                "category_slug": p.category.slug if p.category else 'allgemein',
                "price": float(p.price),
                "original_price": float(p.original_price) if p.original_price else None,
                "stock": p.stock,
                "status": p.status,
                "featured": p.featured,
                "image": image_url,
                "road_legal": compliance.road_legal if compliance else None,
                "abe_number": compliance.abe_number if compliance else None,
                "updated_at": p.updated_at.isoformat(),
            })

        return Response({
            "count": len(products_data),
            "products": products_data,
        })


class AdminProductUpdateView(APIView):
    permission_classes = [IsAdminOrStaff]

    def patch(self, request, product_id):
        product = Product.objects.filter(id__iexact=product_id).first()
        if not product:
            product = Product.objects.filter(slug__iexact=product_id).first()
        if not product:
            return Response({"error": "Produkt nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        if 'stock' in request.data:
            try:
                product.stock = max(0, int(request.data['stock']))
            except (ValueError, TypeError):
                return Response({"error": "Ungültiger Lagerbestand."}, status=status.HTTP_400_BAD_REQUEST)

        if 'price' in request.data:
            try:
                product.price = Decimal(str(request.data['price'])).quantize(Decimal('0.01'))
            except Exception:
                return Response({"error": "Ungültiger Preis."}, status=status.HTTP_400_BAD_REQUEST)

        if 'original_price' in request.data:
            val = request.data['original_price']
            product.original_price = Decimal(str(val)).quantize(Decimal('0.01')) if val else None

        if 'status' in request.data:
            new_st = request.data['status']
            if new_st in ('active', 'draft', 'archived'):
                product.status = new_st

        if 'featured' in request.data:
            product.featured = bool(request.data['featured'])

        if 'road_legal' in request.data:
            compliance, _ = EMobilityCompliance.objects.get_or_create(product=product)
            compliance.road_legal = bool(request.data['road_legal'])
            compliance.save()

        product.save()

        compliance = getattr(product, 'emobility_compliance', None)
        return Response({
            "success": True,
            "message": f"Produkt '{product.name}' erfolgreich aktualisiert.",
            "product": {
                "id": product.id,
                "name": product.name,
                "stock": product.stock,
                "price": float(product.price),
                "original_price": float(product.original_price) if product.original_price else None,
                "status": product.status,
                "featured": product.featured,
                "road_legal": compliance.road_legal if compliance else None,
            }
        })


class AdminReturnsView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        qs = OrderReturn.objects.all().select_related('order').order_by('-created_at')

        status_param = request.query_params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status__iexact=status_param)

        returns_data = []
        for r in qs[:100]:
            returns_data.append({
                "id": r.id,
                "order_id": r.order.id,
                "customer_name": r.customer_name,
                "customer_email": r.customer_email,
                "reason": r.get_reason_display(),
                "reason_code": r.reason,
                "customer_notes": r.customer_notes,
                "status": r.status,
                "status_display": r.get_status_display(),
                "refund_amount": float(r.refund_amount),
                "refund_method": r.get_refund_method_display(),
                "carrier": r.carrier,
                "return_tracking_number": r.return_tracking_number,
                "created_at": r.created_at.isoformat(),
            })

        return Response({
            "count": len(returns_data),
            "returns": returns_data,
        })


class AdminReturnStatusView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request, return_id):
        ret = OrderReturn.objects.filter(id__iexact=return_id).first()
        if not ret:
            return Response({"error": "Retoure nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status:
            ret.status = new_status
            ret.save()

        return Response({
            "success": True,
            "message": f"Retourenstatus für {ret.id} auf '{ret.get_status_display()}' geändert.",
            "id": ret.id,
            "status": ret.status,
        })


class AdminWarrantyClaimsView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        qs = WarrantyClaim.objects.all().select_related('product').order_by('-created_at')

        status_param = request.query_params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status__iexact=status_param)

        claims_data = []
        for c in qs[:100]:
            claims_data.append({
                "id": c.id,
                "claim_number": c.claim_number,
                "order_id": c.order_id,
                "customer_name": c.customer_name,
                "customer_email": c.customer_email,
                "product_name": c.product.name if c.product else '',
                "serial_number": c.serial_number,
                "defect_category": c.get_defect_category_display(),
                "remedy_preference": c.get_remedy_preference_display(),
                "description": c.description,
                "status": c.status,
                "status_display": c.get_status_display(),
                "created_at": c.created_at.isoformat(),
            })

        return Response({
            "count": len(claims_data),
            "claims": claims_data,
        })


class AdminWarrantyClaimStatusView(APIView):
    permission_classes = [IsAdminOrStaff]

    def post(self, request, claim_id):
        claim = WarrantyClaim.objects.filter(
            models.Q(id__iexact=claim_id) | models.Q(claim_number__iexact=claim_id)
        ).first()
        if not claim:
            return Response({"error": "Garantieantrag nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status:
            claim.status = new_status
            claim.save()

        return Response({
            "success": True,
            "message": f"Status für Garantieantrag {claim.claim_number} aktualisiert.",
            "id": claim.id,
            "status": claim.status,
        })


class AdminCustomersView(APIView):
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        users = User.objects.filter(is_staff=False).select_related('profile').order_by('-date_joined')

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            users = users.filter(
                models.Q(email__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search)
            )

        customers_data = []
        for u in users[:100]:
            orders_qs = Order.objects.filter(models.Q(user=u) | models.Q(email__iexact=u.email))
            order_count = orders_qs.count()
            spent_total = orders_qs.filter(payment_status__in=['paid', 'captured']).aggregate(models.Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')

            profile = getattr(u, 'profile', None)

            customers_data.append({
                "id": u.id,
                "email": u.email,
                "full_name": f"{u.first_name} {u.last_name}".strip() or u.email,
                "phone": profile.phone if profile else '',
                "city": profile.city if profile else '',
                "country": profile.country if profile else 'DE',
                "date_joined": u.date_joined.isoformat(),
                "order_count": order_count,
                "total_spent": float(spent_total),
            })

        return Response({
            "count": len(customers_data),
            "customers": customers_data,
        })
