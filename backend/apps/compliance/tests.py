from django.test import TestCase
from rest_framework.test import APIClient
from apps.compliance.models import LegalNotice


class ComplianceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        LegalNotice.objects.create(
            notice_type='impressum',
            title='Impressum (§ 5 DDG)',
            content='TechStore Deutschland GmbH'
        )

    def test_retrieve_legal_notice(self):
        res = self.client.get('/api/v1/legal/impressum/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['notice_type'], 'impressum')
        self.assertIn('TechStore Deutschland GmbH', res.data['content'])

    def test_api_root_health(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['market'], 'Germany (DE)')
        self.assertEqual(data['currency'], 'EUR')

    def test_warranty_claim_lifecycle(self):
        from apps.catalogue.models import Category, Product
        cat = Category.objects.create(name='Smartphones', slug='smartphones')
        prod = Product.objects.create(
            id='prod-phone-1',
            slug='pixel-phone',
            name='Google Pixel 8 Pro',
            category=cat,
            price='899.00',
            stock=5,
            status='active'
        )

        # 1. Submit claim with statutory remedy preference (§ 439 BGB)
        claim_payload = {
            'customer_email': 'garantie.kunde@technikwelt.de',
            'customer_name': 'Hans Schmidt',
            'order_id': 'TS-DE-889922',
            'product': prod.id,
            'serial_number': 'SN-PIX-99881122',
            'defect_category': 'battery_power',
            'remedy_preference': 'repair',
            'description': 'Gerät schaltet sich bei 30% Akkustand plötzlich ab.'
        }
        res = self.client.post('/api/v1/warranty-claims/', claim_payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['claim_number'].startswith('WAR-DE-'))
        self.assertEqual(res.data['status'], 'submitted')
        self.assertEqual(res.data['defect_category'], 'battery_power')
        self.assertEqual(res.data['remedy_preference'], 'repair')
        self.assertIn('Akku', res.data['defect_category_display'])
        self.assertIn('Reparatur', res.data['remedy_preference_display'])

        claim_number = res.data['claim_number']

        # 2. Track claim
        track_res = self.client.get(f'/api/v1/warranty-claims/track/?claim_number={claim_number}&email=garantie.kunde@technikwelt.de')
        self.assertEqual(track_res.status_code, 200)
        self.assertEqual(track_res.data['claim_number'], claim_number)

        # 3. List claims for email
        list_res = self.client.get('/api/v1/warranty-claims/?email=garantie.kunde@technikwelt.de')
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]['claim_number'], claim_number)

