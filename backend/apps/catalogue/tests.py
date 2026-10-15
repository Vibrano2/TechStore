from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.catalogue.models import Category, Brand, Product, EMobilityCompliance


class CatalogueAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name='Smartphones', slug='smartphones')
        self.brand = Brand.objects.create(name='Apple', slug='apple')
        self.product = Product.objects.create(
            id='test-p1',
            slug='apple-iphone-15',
            name='Apple iPhone 15',
            brand=self.brand,
            category=self.category,
            price=Decimal('899.00'),
            currency='EUR',
            stock=15,
            status='active'
        )

    def test_list_products(self):
        response = self.client.get('/api/v1/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Apple iPhone 15')

    def test_retrieve_product_by_slug_and_id(self):
        # By slug
        res1 = self.client.get('/api/v1/products/apple-iphone-15/')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.data['id'], 'test-p1')

        # By ID
        res2 = self.client.get('/api/v1/products/test-p1/')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data['slug'], 'apple-iphone-15')

    def test_filter_products_by_category(self):
        res = self.client.get('/api/v1/products/?category=smartphones')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 1)

        res_empty = self.client.get('/api/v1/products/?category=audio')
        self.assertEqual(res_empty.status_code, 200)
        self.assertEqual(len(res_empty.data['results']), 0)

    def test_search_products(self):
        res = self.client.get('/api/v1/products/?q=iPhone')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 1)

    def test_emobility_compliance_filtering(self):
        scooter_cat = Category.objects.create(name='E-Mobilität', slug='e-mobilitaet')
        scooter = Product.objects.create(
            id='test-scooter',
            slug='e-scooter-pro',
            name='E-Scooter Pro',
            category=scooter_cat,
            price=Decimal('499.00'),
            currency='EUR',
            status='active'
        )
        EMobilityCompliance.objects.create(
            product=scooter,
            road_legal=True,
            abe_available=True,
            insurance_required=True
        )

        res_legal = self.client.get('/api/v1/products/?road_legal=true')
        self.assertEqual(res_legal.status_code, 200)
        self.assertEqual(len(res_legal.data['results']), 1)
        self.assertEqual(res_legal.data['results'][0]['id'], 'test-scooter')
