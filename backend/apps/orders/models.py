import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models
from apps.catalogue.models import Product, ProductVariant


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_key = models.CharField(max_length=100, blank=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='carts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Warenkorb'
        verbose_name_plural = 'Warenkörbe'

    def __str__(self):
        return f"Cart {self.id}"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self):
        return sum(item.total_price for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Warenkorb-Position'
        verbose_name_plural = 'Warenkorb-Positionen'
        unique_together = ('cart', 'product', 'variant')

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"

    @property
    def unit_price(self):
        if self.variant and self.variant.price is not None:
            return self.variant.price
        return self.product.price

    @property
    def total_price(self):
        return self.unit_price * self.quantity


class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('pending', 'Ausstehend'),
        ('confirmed', 'Bestätigt'),
        ('processing', 'In Bearbeitung'),
        ('shipped', 'Versendet'),
        ('delivered', 'Zugestellt'),
        ('cancelled', 'Storniert'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Zahlung ausstehend'),
        ('proof_submitted', 'Zahlungsnachweis eingereicht'),
        ('paid', 'Bezahlt'),
        ('failed', 'Fehlgeschlagen'),
        ('refunded', 'Erstattet'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('paypal', 'PayPal'),
        ('klarna', 'Klarna (Rechnung / Sofort)'),
        ('credit_card', 'Kreditkarte (Visa/Mastercard)'),
        ('sepa', 'SEPA Lastschrift'),
        ('apple_pay', 'Apple Pay / Google Pay'),
        ('bank_transfer', 'Manuelle Banküberweisung (Vorkasse)'),
    ]

    id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    email = models.EmailField()
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='paypal')

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text='Inkl. 19% MwSt.')
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')

    # Shipping Address (German format)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    street = models.CharField(max_length=255, help_text='Straße und Hausnummer')
    postal_code = models.CharField(max_length=10, help_text='Postleitzahl (z. B. 10115)')
    city = models.CharField(max_length=100, help_text='Stadt (z. B. Berlin)')
    country = models.CharField(max_length=50, default='Deutschland')
    phone = models.CharField(max_length=50, blank=True)

    tracking_number = models.CharField(max_length=100, blank=True)
    payment_proof = models.FileField(upload_to='payment_proofs/', null=True, blank=True, help_text='Zahlungsnachweis / Überweisungsbeleg')
    payment_proof_uploaded_at = models.DateTimeField(null=True, blank=True)
    payment_proof_note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bestellung'
        verbose_name_plural = 'Bestellungen'
        ordering = ['-created_at']

    def __str__(self):
        return f"Bestellung {self.id} ({self.grand_total} EUR)"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        verbose_name = 'Bestellposition'
        verbose_name_plural = 'Bestellpositionen'

    def __str__(self):
        return f"{self.quantity}x {self.product_name}"


class OrderReturn(models.Model):
    RETURN_REASON_CHOICES = [
        ('not_liked', 'Artikel gefällt nicht'),
        ('not_as_described', 'Entspricht nicht der Beschreibung'),
        ('wrong_item', 'Falscher Artikel geliefert'),
        ('defective_on_arrival', 'Defekt bei Lieferung (Transportschaden)'),
        ('better_price', 'Günstigeren Preis gefunden'),
        ('ordered_by_mistake', 'Versehentlich bestellt'),
        ('other', 'Sonstiger Grund'),
    ]

    RETURN_STATUS_CHOICES = [
        ('requested', 'Rücksendeantrag eingereicht'),
        ('label_created', 'Rücksendeetikett bereitgestellt'),
        ('in_transit', 'Rücksendung unterwegs'),
        ('received', 'Im Logistikzentrum eingetroffen'),
        ('inspected', 'Ware geprüft'),
        ('refunded', 'Erstattung abgeschlossen'),
        ('rejected', 'Rücksendung abgelehnt'),
    ]

    REFUND_METHOD_CHOICES = [
        ('original_payment', 'Ursprüngliche Zahlungsmethode'),
        ('store_credit', 'Guthaben auf Kundenkonto'),
    ]

    id = models.CharField(max_length=64, primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='returns')
    customer_email = models.EmailField()
    customer_name = models.CharField(max_length=255)
    reason = models.CharField(max_length=40, choices=RETURN_REASON_CHOICES, default='not_liked')
    customer_notes = models.TextField(blank=True)
    refund_method = models.CharField(max_length=30, choices=REFUND_METHOD_CHOICES, default='original_payment')
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    items_data = models.JSONField(default=list, help_text='Liste der zurückgesendeten Artikel mit Stückzahl und Preis')
    status = models.CharField(max_length=30, choices=RETURN_STATUS_CHOICES, default='label_created')
    return_tracking_number = models.CharField(max_length=100, blank=True)
    carrier = models.CharField(max_length=50, default='DHL Retoure Deutschland')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Rücksendung / Retoure'
        verbose_name_plural = 'Rücksendungen'
        ordering = ['-created_at']

    def __str__(self):
        return f"Retoure {self.id} zu {self.order.id} ({self.refund_amount} EUR)"

