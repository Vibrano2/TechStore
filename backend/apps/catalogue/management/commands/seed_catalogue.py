import json
import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.conf import settings
from apps.catalogue.models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    EMobilityCompliance,
)
from apps.compliance.models import LegalNotice


class Command(BaseCommand):
    help = 'Seeds database with TechStore catalogue data and German e-commerce compliance notices'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting catalogue database seeding...'))

        seed_file = os.path.join(settings.BASE_DIR, 'catalogue_seed.json')
        if not os.path.exists(seed_file):
            self.stderr.write(self.style.ERROR(f'Seed file not found: {seed_file}'))
            return

        with open(seed_file, 'r', encoding='utf-8') as f:
            products_data = json.load(f)

        category_cache = {}
        brand_cache = {}

        created_products_count = 0

        for item in products_data:
            cat_name = item.get('category', 'Allgemein')
            if cat_name not in category_cache:
                cat_slug = slugify(cat_name) or 'allgemein'
                category, _ = Category.objects.get_or_create(
                    slug=cat_slug,
                    defaults={'name': cat_name, 'description': f'Produkte in der Kategorie {cat_name}'}
                )
                category_cache[cat_name] = category

            brand_name = item.get('brand', 'TechStore')
            if brand_name not in brand_cache:
                b_slug = slugify(brand_name) or 'techstore'
                brand, _ = Brand.objects.get_or_create(
                    slug=b_slug,
                    defaults={'name': brand_name}
                )
                brand_cache[brand_name] = brand

            prod_id = item.get('id')
            slug = item.get('slug') or slugify(item['name'])

            base_slug = slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(id=prod_id).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            price = Decimal(str(item.get('price', '0.00')))
            orig_price = Decimal(str(item['originalPrice'])) if item.get('originalPrice') else None

            product, _ = Product.objects.update_or_create(
                id=prod_id,
                defaults={
                    'slug': slug,
                    'name': item['name'],
                    'brand': brand_cache[brand_name],
                    'category': category_cache[cat_name],
                    'short_description': item.get('shortDescription', ''),
                    'description': item.get('description', ''),
                    'price': price,
                    'original_price': orig_price,
                    'currency': item.get('currency', 'EUR'),
                    'rating': Decimal(str(item.get('rating', '5.0'))),
                    'review_count': item.get('reviewCount', 0),
                    'stock': item.get('stock', 10),
                    'warranty': item.get('warranty', '2 Jahre gesetzliche Gewährleistung'),
                    'delivery': item.get('delivery', 'Lieferung in 2-3 Werktagen'),
                    'featured': item.get('featured', False),
                    'is_new': item.get('isNew', False),
                    'badges': item.get('badges', []),
                    'status': 'active',
                }
            )

            ProductImage.objects.filter(product=product).delete()
            for idx, img_url in enumerate(item.get('images', [])):
                ProductImage.objects.create(
                    product=product,
                    url=img_url,
                    order=idx
                )

            ProductSpecification.objects.filter(product=product).delete()
            specs = item.get('specifications', {})
            for spec_key, spec_val in specs.items():
                ProductSpecification.objects.create(
                    product=product,
                    name=spec_key,
                    value=str(spec_val),
                    group='Technische Daten'
                )

            ProductVariant.objects.filter(product=product).delete()
            for v in item.get('variants', []):
                ProductVariant.objects.create(
                    id=v.get('id', f"{product.id}-var-{v.get('name')}"),
                    product=product,
                    name=v.get('name', 'Standard'),
                    price=Decimal(str(v['price'])) if v.get('price') is not None else None,
                    stock=v.get('stock', 10),
                )

            e_comp = item.get('eMobilityCompliance')
            is_emobility = 'mobilität' in cat_name.lower() or 'scooter' in product.name.lower() or 'roller' in product.name.lower()

            if e_comp or is_emobility:
                EMobilityCompliance.objects.update_or_create(
                    product=product,
                    defaults={
                        'road_legal': e_comp.get('roadLegal', False) if e_comp else False,
                        'abe_available': e_comp.get('abeAvailable', False) if e_comp else False,
                        'insurance_required': e_comp.get('insuranceRequired', False) if e_comp else False,
                        'registration_required': e_comp.get('registrationRequired', False) if e_comp else False,
                        'intended_use': e_comp.get('intendedUse', 'Private Flächen / Gemäß eKFV') if e_comp else 'Private Flächen / Gemäß eKFV',
                    }
                )

            created_products_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {created_products_count} products.'))
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(category_cache)} categories and {len(brand_cache)} brands.'))

        self.stdout.write(self.style.NOTICE('Seeding German Legal Notices...'))
        legal_notices = [
            (
                'impressum',
                'Impressum nach § 5 DDG (ehemals TMG)',
                'TechStore Deutschland GmbH\n'
                'Technologiepark 1, 10115 Berlin, Deutschland\n'
                'Vertreten durch die Geschäftsführung: Max Mustermann\n'
                'Handelsregister: Amtsgericht Charlottenburg, HRB 123456 B\n'
                'Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: DE 999 888 777\n'
                'Kontakt: service@techstore-germany.de | Tel: +49 (0) 30 1234567'
            ),
            (
                'datenschutz',
                'Datenschutzerklärung gemäß EU-DSGVO',
                'Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist die TechStore Deutschland GmbH. '
                'Wir verarbeiten personenbezogene Daten unserer Nutzer nur, soweit dies zur Bereitstellung einer funktionsfähigen '
                'Website sowie unserer Inhalte und Leistungen (Bestellabwicklung, Gewährleistung) erforderlich ist. '
                'Zahlungsdaten werden über zertifizierte Zahlungsdienstleister (PCI-DSS) abgewickelt.'
            ),
            (
                'agb',
                'Allgemeine Geschäftsbedingungen (AGB)',
                'Geltungsbereich: Diese AGB gelten für alle Bestellungen über den Online-Shop TechStore in Deutschland. '
                'Vertragspartner: Der Kaufvertrag kommt zustande mit der TechStore Deutschland GmbH. '
                'Preise und Versandkosten: Die angegebenen Preise enthalten die gesetzliche deutsche Mehrwertsteuer (19% MwSt.). '
                'Eigentumsvorbehalt: Bis zur vollständigen Bezahlung bleibt die Ware unser Eigentum.'
            ),
            (
                'widerruf',
                'Widerrufsbelehrung & Muster-Widerrufsformular',
                'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. '
                'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, '
                'der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.'
            ),
            (
                'versand',
                'Versand- und Zahlungsbedingungen',
                'Wir liefern innerhalb Deutschlands mit DHL und DPD. Die Standardlieferzeit beträgt 2-3 Werktage. '
                'Kostenloser Versand ab einem Bestellwert von 50,00 EUR. Darunter betragen die Versandkosten 4,90 EUR. '
                'Akzeptierte Zahlungsarten: Stripe (Kreditkarte, Apple Pay, Google Pay), Klarna (Rechnung / Sofort), Kreditkarte, SEPA-Lastschrift, Vorkasse (Banküberweisung).'
            ),
            (
                'elektrog',
                'ElektroG & BattG Hinweise zur Entsorgung',
                'Hinweise zur Entsorgung von Altgeräten und Batterien: Elektro- und Elektronikgeräte dürfen nicht über den '
                'Hausmüll entsorgt werden (Symbol der durchgestrichenen Mülltonne). Sie sind zur Rückgabe gebrauchter '
                'Batterien und Altgeräte gesetzlich verpflichtet.'
            ),
        ]

        for n_type, title, content in legal_notices:
            LegalNotice.objects.update_or_create(
                notice_type=n_type,
                defaults={'title': title, 'content': content}
            )

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(legal_notices)} German legal notices.'))
