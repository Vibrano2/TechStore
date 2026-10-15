from decimal import Decimal
import re
from rest_framework import serializers
from apps.catalogue.models import Product, ProductVariant
from apps.catalogue.serializers import ProductListSerializer
from .models import Cart, CartItem, Order, OrderItem, OrderReturn


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.CharField(write_only=True)
    variant_id = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id',
            'product',
            'product_id',
            'variant_id',
            'quantity',
            'unit_price',
            'total_price',
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'session_key', 'items', 'total_items', 'subtotal', 'updated_at']


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.CharField(required=True)
    variant_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    quantity = serializers.IntegerField(required=False, default=1, min_value=1)

    def validate_product_id(self, value):
        if not Product.objects.filter(id=value, status='active').exists():
            raise serializers.ValidationError("Produkt nicht gefunden oder derzeit nicht verfügbar.")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    name = serializers.CharField(source='product_name', read_only=True)
    price = serializers.FloatField(source='unit_price', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'name',
            'product_name',
            'brand',
            'image',
            'variant',
            'quantity',
            'price',
            'unit_price',
            'tax_amount',
        ]

    def get_image(self, obj):
        img = obj.product.images.first()
        return img.url if img else ''

    def get_brand(self, obj):
        return obj.product.brand.name if obj.product.brand else ''


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    orderNumber = serializers.CharField(source='id', read_only=True)
    date = serializers.SerializerMethodField()
    subtotal = serializers.FloatField(read_only=True)
    vatAmount = serializers.FloatField(source='tax_total', read_only=True)
    shipping = serializers.FloatField(source='shipping_total', read_only=True)
    total = serializers.FloatField(source='grand_total', read_only=True)
    customer = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'orderNumber',
            'date',
            'email',
            'status',
            'payment_status',
            'payment_method',
            'payment_proof',
            'payment_proof_uploaded_at',
            'payment_proof_note',
            'subtotal',
            'shipping',
            'shipping_total',
            'vatAmount',
            'tax_total',
            'discount_total',
            'total',
            'grand_total',
            'currency',
            'first_name',
            'last_name',
            'street',
            'postal_code',
            'city',
            'country',
            'phone',
            'customer',
            'tracking_number',
            'created_at',
            'updated_at',
            'items',
        ]

    def get_date(self, obj):
        return obj.created_at.strftime('%d. %B %Y') if obj.created_at else ''

    def get_customer(self, obj):
        return {
            'email': obj.email,
            'firstName': obj.first_name,
            'lastName': obj.last_name,
            'street': obj.street,
            'postalCode': obj.postal_code,
            'city': obj.city,
            'country': obj.country,
            'phone': obj.phone,
        }


class CreateOrderSerializer(serializers.Serializer):
    cart_id = serializers.UUIDField(required=False, allow_null=True)
    items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text='Direkte Positionsliste falls kein gespeicherter Cart übergeben wird'
    )
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=True)
    street = serializers.CharField(max_length=255, required=True)
    postal_code = serializers.CharField(max_length=10, required=True)
    city = serializers.CharField(max_length=100, required=True)
    country = serializers.CharField(max_length=50, default='Deutschland')
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    shipping_method = serializers.CharField(max_length=50, required=False, default='standard')
    payment_method = serializers.CharField(max_length=50, required=False, default='paypal')

    def validate_postal_code(self, value):
        cleaned = value.strip()
        # German PLZ is 5 digits
        if not re.match(r'^\d{5}$', cleaned):
            raise serializers.ValidationError("Bitte geben Sie eine gültige 5-stellige deutsche Postleitzahl an.")
        return cleaned

    def validate_payment_method(self, value):
        val = value.strip().lower().replace(' ', '_').replace('-', '_')
        mapping = {
            'paypal': 'paypal',
            'klarna': 'klarna',
            'kreditkarte': 'credit_card',
            'credit_card': 'credit_card',
            'creditcard': 'credit_card',
            'sepa': 'sepa',
            'sepa_lastschrift': 'sepa',
            'apple_pay': 'apple_pay',
            'google_pay': 'apple_pay',
            'apple_pay_/_google_pay': 'apple_pay',
            'bank_transfer': 'bank_transfer',
            'vorkasse': 'bank_transfer',
            'manuelle_banküberweisung': 'bank_transfer',
            'manuelle_bankueberweisung': 'bank_transfer',
            'manuelle_banküberweisung_(vorkasse)': 'bank_transfer',
            'manuelle_bankueberweisung_(vorkasse)': 'bank_transfer',
            'banküberweisung': 'bank_transfer',
            'bankueberweisung': 'bank_transfer',
            'manual_transfer': 'bank_transfer',
            'manual_bank_transfer': 'bank_transfer',
            'transfer': 'bank_transfer',
        }
        if val in mapping:
            return mapping[val]
        if 'transfer' in val or 'bank' in val or 'vorkasse' in val or 'überweis' in val or 'ueberweis' in val:
            return 'bank_transfer'
        return 'paypal'

    def validate(self, attrs):
        cart_id = attrs.get('cart_id')
        items = attrs.get('items')
        if not cart_id and not items:
            raise serializers.ValidationError("Es muss entweder eine cart_id oder eine items-Liste übergeben werden.")
        return attrs


class OrderReturnSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source='order.id', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    refund_method_display = serializers.CharField(source='get_refund_method_display', read_only=True)

    class Meta:
        model = OrderReturn
        fields = [
            'id',
            'order',
            'order_id',
            'customer_email',
            'customer_name',
            'reason',
            'reason_display',
            'customer_notes',
            'refund_method',
            'refund_method_display',
            'refund_amount',
            'items_data',
            'status',
            'status_display',
            'return_tracking_number',
            'carrier',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status', 'return_tracking_number', 'carrier', 'created_at', 'updated_at']


class CreateOrderReturnSerializer(serializers.Serializer):
    order_id = serializers.CharField(required=True)
    customer_email = serializers.EmailField(required=True)
    reason = serializers.ChoiceField(choices=OrderReturn.RETURN_REASON_CHOICES, default='not_liked')
    customer_notes = serializers.CharField(required=False, allow_blank=True, default='')
    refund_method = serializers.ChoiceField(choices=OrderReturn.REFUND_METHOD_CHOICES, default='original_payment')
    items = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    def validate_order_id(self, value):
        order = Order.objects.filter(id__iexact=value.strip()).first()
        if not order:
            raise serializers.ValidationError("Die angegebene Bestellnummer existiert nicht.")
        return value.strip()

