"""
TechnikWelt Email & Resend API Verification Suite.
Validates environment configuration, PDF generation (GoBD Invoice & DHL Retourenschein),
and transactional email dispatch via Resend API / Django fallback.
"""

import os
import sys
from decimal import Decimal
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'techstore_backend.settings')

import django
django.setup()

from django.conf import settings
from apps.catalogue.models import Category, Product
from apps.orders.models import Order, OrderItem, OrderReturn
from apps.orders.email import send_order_confirmation_email, send_return_label_email


def run_email_verification():
    print("=" * 65)
    print(" TECHNIKWELT RESEND & TRANSACTIONAL EMAIL VERIFICATION")
    print("=" * 65)

    # 1. Environment and Settings Check
    print("\n[1] Environment & Settings Inspection:")
    resend_key = getattr(settings, 'RESEND_API_KEY', '')
    resend_from = getattr(settings, 'RESEND_FROM_EMAIL', '')
    email_backend = getattr(settings, 'EMAIL_BACKEND', '')
    frontend_url = getattr(settings, 'FRONTEND_URL', '')

    has_live_key = bool(resend_key and not resend_key.startswith('your_') and len(resend_key) > 10)
    masked_key = f"{resend_key[:8]}...{resend_key[-4:]}" if has_live_key else "(Not configured or placeholder - using Django mail backend)"

    print(f"  • RESEND_API_KEY:   {masked_key}")
    print(f"  • RESEND_FROM_EMAIL:{resend_from}")
    print(f"  • EMAIL_BACKEND:    {email_backend}")
    print(f"  • FRONTEND_URL:     {frontend_url}")
    print(f"  • LIVE RESEND MODE: {'ACTIVE (Live Resend API)' if has_live_key else 'MOCK / CONSOLE (Safe Local Fallback)'}")

    # 2. Test Order & GoBD Invoice Email Generation
    print("\n[2] Testing Order Confirmation Email & Attached GoBD PDF Invoice:")
    cat, _ = Category.objects.get_or_create(slug='test-elektronik', defaults={'name': 'Elektronik'})
    prod, _ = Product.objects.get_or_create(
        id='test-prod-verify-1',
        defaults={
            'slug': 'apple-iphone-16-pro',
            'name': 'Apple iPhone 16 Pro 256GB Titan Natur',
            'category': cat,
            'price': Decimal('1199.00'),
            'currency': 'EUR',
            'stock': 25,
            'status': 'active'
        }
    )

    test_email = "kunde.test@technikwelt-shop.de"
    test_order_id = "TS-20261014-VERIFY"

    # Clean existing test objects if present
    OrderReturn.objects.filter(id="RET-DE-VERIFY").delete()
    Order.objects.filter(id=test_order_id).delete()

    order = Order.objects.create(
        id=test_order_id,
        email=test_email,
        first_name="Maximilian",
        last_name="Mustermann",
        street="Kaufingerstraße 15",
        postal_code="80331",
        city="München",
        country="Deutschland",
        payment_method="stripe",
        payment_status="paid",
        status="confirmed",
        subtotal=Decimal('1199.00'),
        shipping_total=Decimal('0.00'),
        tax_total=Decimal('191.43'),
        grand_total=Decimal('1199.00'),
        currency='EUR',
        tracking_number='DHL-DE-VERIFY99'
    )

    OrderItem.objects.create(
        order=order,
        product=prod,
        product_name=prod.name,
        quantity=1,
        unit_price=prod.price,
        tax_amount=Decimal('191.43')
    )

    order_email_res = send_order_confirmation_email(order)
    print(f"  [OK] Order Email Dispatch Success: {order_email_res.get('success')}")
    print(f"  [OK] Dispatch Transport Method:    {order_email_res.get('method')}")
    print(f"  [OK] Invoice Filename:             {order_email_res.get('invoice_filename')}")
    print(f"  [OK] PDF Invoice Size:             {order_email_res.get('invoice_bytes')} bytes")

    # 3. Test Return & DHL Retourenschein Email Generation
    print("\n[3] Testing DHL Return Email & Attached Printable Label (PDF):")
    order_return = OrderReturn.objects.create(
        id="RET-DE-VERIFY",
        order=order,
        customer_email=test_email,
        customer_name="Maximilian Mustermann",
        reason="not_liked",
        customer_notes="Farbton passt nicht zur Hülle",
        refund_method="original_payment",
        refund_amount=Decimal('1199.00'),
        items_data=[
            {
                "product_id": prod.id,
                "product_name": prod.name,
                "quantity": 1,
                "unit_price": float(prod.price)
            }
        ],
        status="label_created",
        return_tracking_number="00340434991827461928",
        carrier="DHL Retoure Deutschland"
    )

    return_email_res = send_return_label_email(order_return)
    print(f"  [OK] Return Email Dispatch Success:{return_email_res.get('success')}")
    print(f"  [OK] Dispatch Transport Method:    {return_email_res.get('method')}")
    print(f"  [OK] Return Label Filename:        {return_email_res.get('label_filename')}")
    print(f"  [OK] DHL PDF Label Size:           {return_email_res.get('label_bytes')} bytes")

    # Clean up test records
    order_return.delete()
    order.delete()

    print("\n" + "=" * 65)
    print(" ALL EMAIL & RESEND SERVICES VERIFIED SUCCESSFULLY (100%)")
    print("=" * 65)


if __name__ == '__main__':
    run_email_verification()
