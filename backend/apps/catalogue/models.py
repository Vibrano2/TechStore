from decimal import Decimal
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Kategorie'
        verbose_name_plural = 'Kategorien'
        ordering = ['name']

    def __str__(self):
        return self.name


class Brand(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Marke'
        verbose_name_plural = 'Marken'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    STATUS_CHOICES = [
        ('active', 'Aktiv'),
        ('draft', 'Entwurf'),
        ('archived', 'Archiviert'),
    ]

    id = models.CharField(max_length=64, primary_key=True)
    slug = models.SlugField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    short_description = models.TextField(blank=True)
    description = models.TextField(blank=True)

    # Monetary values with German/EUR precision (2 decimal places)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='EUR')

    rating = models.DecimalField(max_digits=3, decimal_places=1, default=Decimal('5.0'))
    review_count = models.PositiveIntegerField(default=0)
    stock = models.PositiveIntegerField(default=0)

    warranty = models.CharField(max_length=255, default='2 Jahre Herstellergarantie')
    delivery = models.CharField(max_length=255, default='Lieferung in 2-3 Werktagen')

    featured = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    badges = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Produkt'
        verbose_name_plural = 'Produkte'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.price} EUR)"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    url = models.CharField(max_length=1000)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Produktbild'
        verbose_name_plural = 'Produktbilder'
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.product.name} - Image {self.order}"


class ProductSpecification(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='specifications')
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=500)
    group = models.CharField(max_length=100, blank=True, default='Allgemein')

    class Meta:
        verbose_name = 'Spezifikation'
        verbose_name_plural = 'Spezifikationen'
        ordering = ['group', 'name']

    def __str__(self):
        return f"{self.product.name}: {self.name} = {self.value}"


class ProductVariant(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    vat_rate = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('19.00'))

    class Meta:
        verbose_name = 'Produktvariante'
        verbose_name_plural = 'Produktvarianten'

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class EMobilityCompliance(models.Model):
    """
    German e-mobility legal compliance details (StVZO / eKFV).
    Ensures unverified products are never presented as road legal.
    """
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='emobility_compliance')
    road_legal = models.BooleanField(default=False, help_text='Straßenzulassung nach eKFV / StVZO in Deutschland')
    abe_available = models.BooleanField(default=False, help_text='Allgemeine Betriebserlaubnis vorhanden')
    insurance_required = models.BooleanField(default=False, help_text='Versicherungspflichtig (Versicherungsplakette)')
    registration_required = models.BooleanField(default=False, help_text='Zulassungspflichtig')
    intended_use = models.CharField(max_length=255, default='Private Grundstücke / StVZO Konform')
    max_speed_kmh = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

    class Meta:
        verbose_name = 'E-Mobilität Konformität'
        verbose_name_plural = 'E-Mobilität Konformitäten'

    def __str__(self):
        return f"{self.product.name} - Road legal: {self.road_legal}"


class ProductReview(models.Model):
    """
    Customer product review with rating (1-5), verified purchaser check (UWG §5b Abs. 3),
    and moderation status.
    """
    STATUS_CHOICES = [
        ('approved', 'Freigegeben'),
        ('pending', 'Prüfung ausstehend'),
        ('rejected', 'Abgelehnt'),
    ]

    id = models.CharField(max_length=64, primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='product_reviews'
    )
    author_name = models.CharField(max_length=100)
    author_email = models.EmailField()
    rating = models.PositiveSmallIntegerField(default=5)  # 1 to 5 stars
    title = models.CharField(max_length=200)
    comment = models.TextField()
    is_verified_buyer = models.BooleanField(
        default=False,
        help_text='Verifizierter Kauf gem. § 5b Abs. 3 UWG'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    helpful_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Produktbewertung'
        verbose_name_plural = 'Produktbewertungen'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}★ {self.title} von {self.author_name} für {self.product.name}"
