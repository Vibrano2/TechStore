from django.core.management.base import BaseCommand
from django.conf import settings
import resend


class Command(BaseCommand):
    help = "Dispatches a test transactional email via the official Resend Python SDK."

    def add_arguments(self, parser):
        parser.add_argument(
            '--api-key',
            type=str,
            default='',
            help="Resend API key (re_xxxxxxxxx). Defaults to settings.RESEND_API_KEY."
        )
        parser.add_argument(
            '--to',
            type=str,
            default='gadwaytech@gmail.com',
            help="Recipient email address (default: gadwaytech@gmail.com)."
        )
        parser.add_argument(
            '--from-email',
            type=str,
            default='',
            help="Sender email address (default: onboarding@resend.dev)."
        )

    def handle(self, *args, **options):
        api_key = options.get('api_key') or getattr(settings, 'RESEND_API_KEY', '')
        to_email = options.get('to')
        from_email = options.get('from_email') or getattr(settings, 'RESEND_FROM_EMAIL', 'onboarding@resend.dev')

        if not api_key or api_key == 're_xxxxxxxxx' or api_key.startswith('your_'):
            self.stdout.write(
                self.style.WARNING(
                    "\n[!] Please replace 're_xxxxxxxxx' with your real Resend API key.\n"
                    "    Provide it via --api-key re_xxxxxxxxx or configure RESEND_API_KEY in backend/.env"
                )
            )
            return

        resend.api_key = api_key

        self.stdout.write(f"Sending test email to {to_email} via Resend SDK...")
        try:
            r = resend.Emails.send({
                "from": from_email,
                "to": to_email,
                "subject": "Hello World",
                "html": "<p>Congrats on sending your <strong>first email</strong>!</p>"
            })
            self.stdout.write(self.style.SUCCESS(f"[OK] Email sent successfully! Response: {r}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] Error sending email via Resend: {e}"))
