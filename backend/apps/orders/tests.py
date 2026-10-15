from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.catalogue.models import Category, Product
from apps.orders.models import Cart, Order


class OrdersAndCartAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name='Audio', slug='audio')
        self.product = Product.objects.create(
            id='prod-audio-1',
            slug='sony-headphones',
            name='Sony WH-1000XM5',
            category=self.category,
            price=Decimal('299.00'),
            currency='EUR',
            stock=10,
            status='active'
        )

    def test_cart_operations(self):
        res = self.client.get('/api/v1/cart/current/')
        self.assertEqual(res.status_code, 200)
        cart_id = res.data['id']

        add_res = self.client.post('/api/v1/cart/add_item/', {
            'cart_id': cart_id,
            'product_id': 'prod-audio-1',
            'quantity': 2
        }, format='json')
        self.assertEqual(add_res.status_code, 200)
        self.assertEqual(add_res.data['total_items'], 2)
        self.assertEqual(Decimal(str(add_res.data['subtotal'])), Decimal('598.00'))

    def test_checkout_validation_and_creation(self):
        order_payload = {
            'email': 'kunde@beispiel.de',
            'first_name': 'Max',
            'last_name': 'Mustermann',
            'street': 'Hauptstraße 42',
            'postal_code': '10115',
            'city': 'Berlin',
            'country': 'Deutschland',
            'payment_method': 'paypal',
            'items': [
                {
                    'product_id': 'prod-audio-1',
                    'quantity': 1
                }
            ]
        }

        res = self.client.post('/api/v1/orders/checkout/', order_payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['id'].startswith('TS-'))
        self.assertEqual(res.data['currency'], 'EUR')
        self.assertEqual(Decimal(str(res.data['subtotal'])), Decimal('299.00'))
        self.assertEqual(Decimal(str(res.data['shipping_total'])), Decimal('0.00'))  # Free over 50 EUR

        track_res = self.client.get(f"/api/v1/orders/track/?order_id={res.data['id']}&email=kunde@beispiel.de")
        self.assertEqual(track_res.status_code, 200)
        self.assertEqual(track_res.data['id'], res.data['id'])

    def test_invalid_german_postal_code(self):
        invalid_payload = {
            'email': 'kunde@beispiel.de',
            'first_name': 'Max',
            'last_name': 'Mustermann',
            'street': 'Hauptstraße 42',
            'postal_code': 'ABC-12',  # Invalid PLZ
            'city': 'Berlin',
            'items': [{'product_id': 'prod-audio-1', 'quantity': 1}]
        }
        res = self.client.post('/api/v1/orders/checkout/', invalid_payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('postal_code', res.data)

    def test_order_return_creation_and_label_pdf(self):
        order_res = self.client.post('/api/v1/orders/checkout/', {
            'email': 'retoure.test@technikwelt.de',
            'first_name': 'Erika',
            'last_name': 'Mustermann',
            'street': 'Kurfürstendamm 100',
            'postal_code': '10709',
            'city': 'Berlin',
            'items': [{'product_id': 'prod-audio-1', 'quantity': 1}]
        }, format='json')
        self.assertEqual(order_res.status_code, 201)
        order_id = order_res.data['id']

        return_payload = {
            'order_id': order_id,
            'customer_email': 'retoure.test@technikwelt.de',
            'reason': 'not_liked',
            'customer_notes': 'Kopfhörer drücken am Bügel',
            'refund_method': 'original_payment',
            'items': [{'product_id': 'prod-audio-1', 'product_name': 'Sony WH-1000XM5', 'quantity': 1, 'unit_price': 299.00}]
        }
        ret_res = self.client.post('/api/v1/returns/', return_payload, format='json')
        self.assertEqual(ret_res.status_code, 201)
        return_id = ret_res.data['id']
        self.assertTrue(return_id.startswith('RET-DE-'))
        self.assertTrue(ret_res.data['return_tracking_number'].startswith('00340434'))
        self.assertEqual(Decimal(str(ret_res.data['refund_amount'])), Decimal('299.00'))

        track_res = self.client.get(f'/api/v1/returns/track/?return_id={return_id}&email=retoure.test@technikwelt.de')
        self.assertEqual(track_res.status_code, 200)
        self.assertEqual(track_res.data['id'], return_id)

        pdf_res = self.client.get(f'/api/v1/returns/{return_id}/label/?email=retoure.test@technikwelt.de')
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res['Content-Type'], 'application/pdf')
        self.assertTrue(pdf_res.content.startswith(b'%PDF-'))
        self.assertIn('inline; filename="DHL_Retourenschein_', pdf_res['Content-Disposition'])

        unauth_res = self.client.get(f'/api/v1/returns/{return_id}/label/?email=wrong@email.de')
        self.assertEqual(unauth_res.status_code, 403)

        resend_res = self.client.post(
            f'/api/v1/returns/{return_id}/resend_label/',
            {'email': 'retoure.test@technikwelt.de'},
            format='json'
        )
        self.assertEqual(resend_res.status_code, 200)
        self.assertTrue(resend_res.data['success'])
        self.assertEqual(resend_res.data['return_id'], return_id)
        self.assertEqual(resend_res.data['label_filename'], f"DHL_Retourenschein_{return_id}.pdf")
        self.assertGreater(resend_res.data['label_bytes'], 1000)

        unauth_resend = self.client.post(
            f'/api/v1/returns/{return_id}/resend_label/',
            {'email': 'stranger@technikwelt.de'},
            format='json'
        )
        self.assertEqual(unauth_resend.status_code, 403)

    def test_order_confirmation_email_dispatch_and_resend(self):
        order_res = self.client.post('/api/v1/orders/checkout/', {
            'email': 'email.test@technikwelt.de',
            'first_name': 'Hans',
            'last_name': 'Müller',
            'street': 'Bayerstraße 12',
            'postal_code': '80335',
            'city': 'München',
            'payment_method': 'paypal',
            'items': [{'product_id': 'prod-audio-1', 'quantity': 1}]
        }, format='json')
        self.assertEqual(order_res.status_code, 201)
        order_id = order_res.data['id']

        resend_res = self.client.post(
            f'/api/v1/orders/{order_id}/resend_confirmation/',
            {'email': 'email.test@technikwelt.de'},
            format='json'
        )
        self.assertEqual(resend_res.status_code, 200)
        self.assertTrue(resend_res.data['success'])
        self.assertEqual(resend_res.data['order_id'], order_id)
        self.assertGreater(resend_res.data['invoice_bytes'], 1000)
        self.assertTrue(resend_res.data['invoice_filename'].endswith('.pdf'))

        unauth_res = self.client.post(
            f'/api/v1/orders/{order_id}/resend_confirmation/',
            {'email': 'wrong@technikwelt.de'},
            format='json'
        )
        self.assertEqual(unauth_res.status_code, 403)

    def test_manual_bank_transfer_order_and_invoice(self):
        order_payload = {
            'email': 'transfer.test@technikwelt.de',
            'first_name': 'Sophie',
            'last_name': 'Weber',
            'street': 'Goethestraße 5',
            'postal_code': '60313',
            'city': 'Frankfurt am Main',
            'payment_method': 'Manuelle Banküberweisung (Vorkasse)',
            'items': [{'product_id': 'prod-audio-1', 'quantity': 1}]
        }
        res = self.client.post('/api/v1/orders/checkout/', order_payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['payment_method'], 'bank_transfer')

        order = Order.objects.get(id=res.data['id'])
        self.assertEqual(order.payment_method, 'bank_transfer')

        from apps.orders.invoice import generate_invoice_pdf
        pdf_bytes = generate_invoice_pdf(order)
        self.assertTrue(pdf_bytes.startswith(b'%PDF-'))
        self.assertGreater(len(pdf_bytes), 1000)

        from apps.orders.email import send_order_confirmation_email
        email_result = send_order_confirmation_email(order)
        self.assertTrue(email_result['success'])

    def test_upload_payment_proof(self):
        order_payload = {
            'email': 'proof.test@technikwelt.de',
            'first_name': 'Leon',
            'last_name': 'Bauer',
            'street': 'Schillerstr. 12',
            'postal_code': '80336',
            'city': 'München',
            'payment_method': 'bank_transfer',
            'items': [{'product_id': 'prod-audio-1', 'quantity': 1}]
        }
        res = self.client.post('/api/v1/orders/checkout/', order_payload, format='json')
        self.assertEqual(res.status_code, 201)
        order_id = res.data['id']

        proof_res = self.client.post(f'/api/v1/orders/{order_id}/upload-proof/', {
            'email': 'proof.test@technikwelt.de',
            'filename': 'ueberweisung_beleg.pdf',
            'note': 'Per Online Banking überwiesen'
        }, format='json')
        self.assertEqual(proof_res.status_code, 200)
        self.assertTrue(proof_res.data['success'])

        order = Order.objects.get(id=order_id)
        self.assertEqual(order.payment_status, 'proof_submitted')
        self.assertIsNotNone(order.payment_proof_uploaded_at)
        self.assertIn('überwiesen', order.payment_proof_note)



