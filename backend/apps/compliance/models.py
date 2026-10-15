from django.db import models
from apps.catalogue.models import Product


class LegalNotice(models.Model):
    NOTICE_TYPES = [
        ('impressum', 'Impressum (§ 5 DDG / TMG)'),
        ('datenschutz', 'Datenschutzerklärung (DSGVO)'),
        ('agb', 'Allgemeine Geschäftsbedingungen (AGB)'),
        ('widerruf', 'Widerrufsbelehrung & Muster-Widerrufsformular'),
        ('versand', 'Zahlung & Versandinformationen'),
        ('elektrog', 'ElektroG & BattG Entsorgungshinweise'),
    ]

    notice_type = models.CharField(max_length=50, choices=NOTICE_TYPES, unique=True)
    title = models.CharField(max_length=255)
    content = models.TextField(help_text='Rechtssicherer Textinhalt')
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Rechtlicher Hinweis'
        verbose_name_plural = 'Rechtliche Hinweise'

    def __str__(self):
        return self.title


class WarrantyClaim(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Eingereicht'),
        ('under_review', 'In Prüfung'),
        ('approved', 'Genehmigt'),
        ('repairing', 'In Reparatur'),
        ('replaced', 'Austauschgerät versandt'),
        ('rejected', 'Abgelehnt'),
        ('completed', 'Abgeschlossen'),
    ]

    REMEDY_CHOICES = [
        ('repair', 'Reparatur / Nachbesserung (§ 439 Abs. 1 BGB)'),
        ('replacement', 'Ersatzlieferung / Neugerät (§ 439 Abs. 1 BGB)'),
    ]

    DEFECT_CATEGORIES = [
        ('technical_fault', 'Technischer Defekt / Gerät startet nicht'),
        ('display_fault', 'Displayfehler / Pixelfehler / Touchscreen'),
        ('battery_power', 'Akku lädt nicht / Schaltet unerwartet ab'),
        ('transport_damage', 'Transportschaden / Gehäuse beschädigt'),
        ('connectivity', 'WLAN / Bluetooth / Verbindungsproblem'),
        ('other', 'Sonstiger Mangel'),
    ]

    claim_number = models.CharField(max_length=64, unique=True)
    customer_email = models.EmailField()
    customer_name = models.CharField(max_length=255)
    order_id = models.CharField(max_length=64, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='warranty_claims')
    serial_number = models.CharField(max_length=120, blank=True)
    defect_category = models.CharField(max_length=60, choices=DEFECT_CATEGORIES, default='technical_fault')
    remedy_preference = models.CharField(max_length=30, choices=REMEDY_CHOICES, default='repair')
    description = models.TextField(help_text='Fehlerbeschreibung des Mangels')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='submitted')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Garantie- / Gewährleistungsantrag'
        verbose_name_plural = 'Garantie- & Gewährleistungsanträge'
        ordering = ['-created_at']

    def __str__(self):
        return f"Garantie {self.claim_number} - {self.product.name}"
