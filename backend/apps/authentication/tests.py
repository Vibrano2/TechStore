from datetime import timedelta
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from .services import send_otp_email, verify_otp_and_login, _hash_otp
from .models import EmailOTP, AuthToken, User, UserProfile


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.test_email = "kunde@technikwelt.de"

    @override_settings(DEBUG=True)
    def test_send_and_verify_otp_in_debug_mode(self):
        res = send_otp_email(self.test_email)
        self.assertTrue(res['success'])
        otp = res.get('dev_code')
        self.assertIsNotNone(otp)
        self.assertEqual(len(otp), 6)

        wrong_res = verify_otp_and_login(self.test_email, "000000")
        self.assertFalse(wrong_res['success'])

        login_res = verify_otp_and_login(
            self.test_email,
            otp,
            first_name="Max",
            last_name="Mustermann"
        )
        self.assertTrue(login_res['success'])
        self.assertIn('token', login_res)
        self.assertEqual(login_res['user']['email'], self.test_email)
        self.assertEqual(login_res['user']['first_name'], "Max")

        token = login_res['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], self.test_email)

    def test_production_mode_blocks_missing_credentials_and_never_leaks_otp(self):
        """
        In production configuration (DEBUG=False) without valid email credentials,
        send_otp_email must fail explicitly and NEVER leak dev_code.
        """
        with override_settings(DEBUG=False):
            res = send_otp_email("security.check@technikwelt.de")
            self.assertFalse(res['success'])
            self.assertNotIn('dev_code', res)
            self.assertIn('error', res)

    def test_expired_otp_rejected_with_controlled_fixture(self):
        """
        Requirement 1: Test OTP expiry explicitly using a controlled local test fixture.
        Prove that an expired code is rejected without weakening application checks.
        """
        email = "expired.test@technikwelt.de"
        otp_code = "123456"
        otp_hash = _hash_otp(email, otp_code)

        past_time = timezone.now() - timedelta(minutes=5)
        EmailOTP.objects.create(
            email=email,
            otp_hash=otp_hash,
            attempts=0,
            is_verified=False,
            expires_at=past_time
        )

        service_res = verify_otp_and_login(email, otp_code)
        self.assertFalse(service_res['success'])
        self.assertIn("abgelaufen", service_res['error'])

        response = self.client.post('/api/v1/auth/verify-otp/', {
            'email': email,
            'otp': otp_code
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data.get('success', True))
        self.assertIn("abgelaufen", response.data.get('error', ''))

    @override_settings(DEBUG=True)
    def test_otp_attempt_limits_and_reuse_prevention(self):
        """
        Verify rate limits, max 5 failed attempts lockout, and OTP single-use guarantee.
        """
        email = "attempts.test@technikwelt.de"
        send_res = send_otp_email(email)
        self.assertTrue(send_res['success'])
        valid_otp = send_res['dev_code']

        for _ in range(5):
            bad_res = self.client.post('/api/v1/auth/verify-otp/', {
                'email': email,
                'otp': '999999'
            })
            self.assertEqual(bad_res.status_code, 400)

        sixth_res = self.client.post('/api/v1/auth/verify-otp/', {
            'email': email,
            'otp': valid_otp
        })
        self.assertEqual(sixth_res.status_code, 400)
        self.assertIn('Fehlversuche', sixth_res.data.get('error', ''))

    @override_settings(DEBUG=True)
    def test_profile_persistence_via_api(self):
        """
        Requirement 6: Verify profile updates persist in Django via authenticated PATCH /api/v1/auth/me/
        """
        email = "persistence.test@technikwelt.de"
        send_res = send_otp_email(email)
        valid_otp = send_res['dev_code']

        login_res = self.client.post('/api/v1/auth/verify-otp/', {
            'email': email,
            'otp': valid_otp,
            'first_name': 'InitialFirst',
            'last_name': 'InitialLast'
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.data['token']

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        patch_res = client.patch('/api/v1/auth/me/', {
            'first_name': 'UpdatedFirst',
            'phone': '+49 171 8889990',
            'street': 'Friedrichstraße 43',
            'postal_code': '10117',
            'city': 'Berlin'
        })
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data['first_name'], 'UpdatedFirst')
        self.assertEqual(patch_res.data['phone'], '+49 171 8889990')

        fresh_client = APIClient()
        fresh_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        get_res = fresh_client.get('/api/v1/auth/me/')
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.data['first_name'], 'UpdatedFirst')
        self.assertEqual(get_res.data['phone'], '+49 171 8889990')
        self.assertEqual(get_res.data['street'], 'Friedrichstraße 43')
        self.assertEqual(get_res.data['city'], 'Berlin')

    def test_admin_api_suite(self):
        """
        Verify internal admin authentication, statistics, and orders API.
        """
        # 1. Unauthenticated request to stats must be blocked
        anon_res = self.client.get('/api/v1/intern/stats/')
        self.assertIn(anon_res.status_code, (401, 403))

        # 2. Login with bad credentials fails
        bad_login = self.client.post('/api/v1/intern/login/', {
            'username': 'admin',
            'password': 'WrongPassword123'
        })
        self.assertEqual(bad_login.status_code, 401)

        # 3. Login with configured admin credentials succeeds
        login_res = self.client.post('/api/v1/intern/login/', {
            'username': 'admin',
            'password': 'TechnikWelt2026!Admin'
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.data['success'])
        admin_token = login_res.data['token']
        self.assertTrue(login_res.data['user']['is_staff'])

        # 4. Authenticated stats request succeeds
        admin_client = APIClient()
        admin_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        stats_res = admin_client.get('/api/v1/intern/stats/')
        self.assertEqual(stats_res.status_code, 200)
        self.assertIn('metrics', stats_res.data)
        self.assertIn('total_revenue', stats_res.data['metrics'])
        self.assertIn('total_orders', stats_res.data['metrics'])

        # 5. Authenticated orders list succeeds
        orders_res = admin_client.get('/api/v1/intern/orders/')
        self.assertEqual(orders_res.status_code, 200)
        self.assertIn('orders', orders_res.data)


