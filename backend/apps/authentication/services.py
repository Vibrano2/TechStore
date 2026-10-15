import hashlib
import hmac
import logging
import os
import secrets
from datetime import timedelta
import requests
from django.conf import settings
from django.utils import timezone
from .models import EmailOTP, UserProfile, AuthToken, User

logger = logging.getLogger('techstore.auth')

OTP_EXPIRY_MINUTES = 10
MAX_ATTEMPTS = 5
RATE_LIMIT_SECONDS = 60


def _hash_otp(email: str, otp: str) -> str:
    secret = getattr(settings, 'SECRET_KEY', 'default-otp-salt')
    data = f"{email.lower().strip()}:{otp}:{secret}"
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def generate_secure_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def send_otp_email(email: str) -> dict:
    email_clean = email.lower().strip()
    now = timezone.now()

    recent = EmailOTP.objects.filter(
        email=email_clean,
        created_at__gte=now - timedelta(seconds=RATE_LIMIT_SECONDS)
    ).first()
    if recent:
        seconds_left = int(RATE_LIMIT_SECONDS - (now - recent.created_at).total_seconds())
        if seconds_left > 0:
            return {
                "success": False,
                "error": f"Bitte warten Sie noch {seconds_left} Sekunden, bevor Sie einen neuen Code anfordern.",
                "cooldown_seconds": seconds_left
            }

    otp = generate_secure_otp()
    otp_hash = _hash_otp(email_clean, otp)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    EmailOTP.objects.create(
        email=email_clean,
        otp_hash=otp_hash,
        expires_at=expires_at
    )

    resend_api_key = os.environ.get('RESEND_API_KEY', getattr(settings, 'RESEND_API_KEY', ''))
    from_email = os.environ.get('RESEND_FROM_EMAIL', getattr(settings, 'RESEND_FROM_EMAIL', 'TechStore Germany <onboarding@resend.dev>'))

    sent_via_resend = False
    delivery_note = ""

    if resend_api_key and not resend_api_key.startswith('your_'):
        try:
            html_content = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E3E8EF; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0B1F33; padding: 24px 32px; text-align: left;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                        TechStore<span style="color: #0F5BD8;">.</span>
                    </h1>
                    <p style="color: #94A3B8; margin: 4px 0 0 0; font-size: 13px;">Sicherer Einmal-Login & Registrierung</p>
                </div>
                <div style="padding: 32px; color: #111827;">
                    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px; color: #0B1F33;">
                        Ihr Bestätigungscode (OTP)
                    </h2>
                    <p style="font-size: 15px; line-height: 1.5; color: #4B5563; margin-bottom: 24px;">
                        Verwenden Sie den folgenden 6-stelligen Code, um sich sicher bei TechStore Germany anzumelden oder Ihr Konto zu erstellen:
                    </p>
                    <div style="background-color: #F6F8FB; border: 2px dashed #0F5BD8; border-radius: 10px; padding: 18px 24px; text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0B1F33; font-family: monospace;">{otp}</span>
                    </div>
                    <p style="font-size: 13px; color: #6B7280; line-height: 1.5;">
                        Dieser Code ist <strong>10 Minuten</strong> gültig. Falls Sie diesen Code nicht angefordert haben, können Sie diese Nachricht ignorieren.
                    </p>
                </div>
                <div style="background-color: #F6F8FB; border-top: 1px solid #E3E8EF; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748B;">
                    TechStore Germany GmbH • Sicherer E-Commerce nach DSGVO
                </div>
            </div>
            """

            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_email,
                    "to": [email_clean],
                    "subject": f"Ihr TechStore Einmal-Code: {otp}",
                    "html": html_content
                },
                timeout=8
            )
            if response.status_code in (200, 201):
                sent_via_resend = True
                delivery_note = "Code wurde erfolgreich an Ihre E-Mail gesendet."
            else:
                logger.warning(f"Resend API returned status {response.status_code}: {response.text}")
                delivery_note = "Code wurde an Ihre E-Mail gesendet."
        except Exception as e:
            logger.error(f"Error calling Resend API: {e}")
            delivery_note = "Code wurde an Ihre E-Mail gesendet."

    if getattr(settings, 'DEBUG', False):
        logger.info(f"=== [TechnikWelt OTP] E-Mail: {email_clean} | CODE: {otp} | Gültig bis: {expires_at.strftime('%H:%M:%S')} ===")
        print(f"\n[TechnikWelt OTP] Code für {email_clean}: {otp}\n")

    if not getattr(settings, 'DEBUG', False) and not sent_via_resend:
        logger.error(f"OTP email delivery failed for {email_clean} in production mode (DEBUG=False).")
        return {
            "success": False,
            "error": "Der Bestätigungscode konnte nicht per E-Mail zugestellt werden. Bitte versuchen Sie es später erneut.",
            "sent_via_resend": False
        }

    result = {
        "success": True,
        "message": delivery_note or "Bestätigungscode wurde versendet.",
        "sent_via_resend": sent_via_resend,
        "expires_in_minutes": OTP_EXPIRY_MINUTES
    }

    if getattr(settings, 'DEBUG', False):
        result["dev_code"] = otp

    return result


def verify_otp_and_login(email: str, code: str, first_name: str = '', last_name: str = '', language: str = 'de') -> dict:
    email_clean = email.lower().strip()
    code_clean = code.strip()
    now = timezone.now()

    otp_record = EmailOTP.objects.filter(
        email=email_clean,
        is_verified=False,
        expires_at__gte=now
    ).order_by('-created_at').first()

    if not otp_record:
        return {
            "success": False,
            "error": "Der Bestätigungscode ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an."
        }

    if otp_record.attempts >= MAX_ATTEMPTS:
        return {
            "success": False,
            "error": "Zu viele Fehlversuche. Bitte fordern Sie einen neuen Code an."
        }

    expected_hash = _hash_otp(email_clean, code_clean)
    if not hmac.compare_digest(otp_record.otp_hash, expected_hash):
        otp_record.attempts += 1
        otp_record.save(update_fields=['attempts'])
        remaining = MAX_ATTEMPTS - otp_record.attempts
        return {
            "success": False,
            "error": f"Falscher Code. Noch {remaining} Versuch(e) übrig."
        }

    otp_record.is_verified = True
    otp_record.save(update_fields=['is_verified'])

    user = User.objects.filter(email__iexact=email_clean).first()
    created = False
    if not user:
        username = email_clean
        if User.objects.filter(username=username).exists():
            username = f"{email_clean}_{secrets.token_hex(3)}"
        user = User.objects.create(
            username=username,
            email=email_clean,
            first_name=first_name.strip(),
            last_name=last_name.strip()
        )
        created = True
    else:
        updated_fields = []
        if first_name.strip() and not user.first_name:
            user.first_name = first_name.strip()
            updated_fields.append('first_name')
        if last_name.strip() and not user.last_name:
            user.last_name = last_name.strip()
            updated_fields.append('last_name')
        if updated_fields:
            user.save(update_fields=updated_fields)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if language in ('de', 'en', 'fr', 'es') and profile.language != language:
        profile.language = language
        profile.save(update_fields=['language'])

    token = AuthToken.create_for_user(user)

    return {
        "success": True,
        "is_new_user": created,
        "token": token.key,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": f"{user.first_name} {user.last_name}".strip() or user.email,
            "language": profile.language,
            "phone": profile.phone,
            "street": profile.street,
            "house_number": profile.house_number,
            "postal_code": profile.postal_code,
            "city": profile.city,
            "country": profile.country,
            "created_at": user.date_joined.isoformat()
        }
    }
