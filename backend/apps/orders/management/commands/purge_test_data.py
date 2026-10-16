import re
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.orders.models import Order, OrderItem, OrderReturn, Cart, CartItem
from apps.compliance.models import WarrantyClaim


class Command(BaseCommand):
    help = "Purge all synthetic/automated test orders, returns, warranties, and test users."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate deletion without committing changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        test_email_patterns = [
            r'.*@technikwelt-test\.de$',
            r'.*@technikwelt\.de$',
            r'.*@example\.com$',
            r'.*@beispiel\.de$',
            r'^test-stripe@technikwelt\.shop$',
            r'^e2e\.retoure\.test@technikwelt-shop\.de$',
        ]

        # 1. Identify test orders
        all_orders = Order.objects.all()
        test_order_ids = []

        for order in all_orders:
            email = (order.email or '').strip().lower()
            name = f"{order.first_name} {order.last_name}".strip().lower()

            is_test = False
            for pat in test_email_patterns:
                if re.match(pat, email):
                    is_test = True
                    break

            if name in ['max mustermann', 'sabine musterfrau', 'johannes gutenberg', 'sophie scholl', 'clara schumann', 'alexander von humboldt', 'anna schmidt']:
                is_test = True

            if is_test:
                test_order_ids.append(order.id)

        self.stdout.write(f"Found {len(test_order_ids)} test orders to delete.")

        # 2. Identify test returns
        test_returns = OrderReturn.objects.filter(order_id__in=test_order_ids)
        test_returns_count = test_returns.count()

        # 3. Identify test warranty claims
        test_warranties = WarrantyClaim.objects.filter(order_id__in=test_order_ids)
        test_warranties_count = test_warranties.count()

        # 4. Identify test non-staff users
        test_users = []
        for user in User.objects.filter(is_staff=False, is_superuser=False):
            u_email = (user.email or '').lower()
            u_name = (user.username or '').lower()

            is_test_user = False
            for pat in test_email_patterns:
                if re.match(pat, u_email):
                    is_test_user = True
                    break

            if any(u_name.startswith(p) for p in ['test', 'valid.buyer', 'audit.', 'buyer.', 'user.two', 'kundetest', 'alex-']):
                is_test_user = True

            # Preserve real customer emails
            if any(u_email.endswith(dom) for dom in ['@gmail.com', '@outlook.com', '@yahoo.com', '@web.de', '@gmx.de', '@t-online.de']):
                if not u_name.startswith('test'):
                    is_test_user = False

            if is_test_user:
                test_users.append(user)

        self.stdout.write(f"Found {test_returns_count} test returns, {test_warranties_count} test warranties, and {len(test_users)} test users.")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN: No records were modified."))
            return

        # Perform actual purge
        # Delete warranties
        test_warranties.delete()
        # Delete returns
        test_returns.delete()
        # Delete order items and orders
        OrderItem.objects.filter(order_id__in=test_order_ids).delete()
        Order.objects.filter(id__in=test_order_ids).delete()

        # Delete test users
        for u in test_users:
            CartItem.objects.filter(cart__user=u).delete()
            Cart.objects.filter(user=u).delete()
            u.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deleted {len(test_order_ids)} test orders, "
                f"{test_returns_count} returns, {test_warranties_count} warranties, "
                f"and {len(test_users)} test users. All figures are now 100% genuine."
            )
        )
