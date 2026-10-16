"""
Transactional Order Confirmation Email Service for TechnikWelt.
Generates responsive German HTML & plain-text order confirmation emails
conforming to the approved TechnikWelt brand system, with attached
legally compliant GoBD/§14 UStG PDF invoices.
"""

import base64
import logging
import os
from decimal import Decimal
import requests
from email import charset as email_charset
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, message as django_mail_message
from django.utils import timezone
from .invoice import generate_invoice_pdf, format_de_currency, format_de_date
from .return_label import generate_return_label_pdf

# Enforce Quoted-Printable transfer encoding for UTF-8 to prevent 'ascii' codec errors
# when sending emails with German umlauts (ä, ö, ü, ß) across legacy/cPanel SMTP transports.
django_mail_message.utf8_charset.body_encoding = email_charset.QP

logger = logging.getLogger('techstore.orders.email')


def send_order_confirmation_email(order) -> dict:
    """
    Generate and dispatch a German order confirmation email with attached PDF invoice.
    Uses Resend API if configured, falling back to Django EmailMultiAlternatives.
    """
    try:
        pdf_bytes = generate_invoice_pdf(order)
        invoice_filename = f"Rechnung_{order.id.replace('TS-', 'RE-')}.pdf"

        payment_labels = {
            'stripe': 'Stripe (Kreditkarte, Apple Pay, Google Pay)',
            'bank_transfer': 'Manuelle Banküberweisung (Vorkasse)',
            'klarna': 'Klarna (Rechnung / Sofort)',
            'credit_card': 'Kreditkarte (Visa / Mastercard)',
            'sepa': 'SEPA-Lastschrift',
            'apple_pay': 'Apple Pay / Google Pay',
        }
        payment_str = payment_labels.get(order.payment_method, order.payment_method.capitalize())
        shipping_str = "DHL Expressversand (2-5 Werktage)" if order.shipping_total > Decimal('5.00') else "DHL Standardversand (3-15 Werktage)"
        order_date_str = format_de_date(order.created_at)

        bank_transfer_html = ""
        bank_transfer_text = ""
        b_beneficiary = getattr(settings, 'COMPANY_BANK_BENEFICIARY', 'TechnikWelt GmbH')
        b_iban = getattr(settings, 'COMPANY_BANK_IBAN', 'DE38 7602 6000 0039 4791 00')
        b_bic = getattr(settings, 'COMPANY_BANK_BIC', 'NORSDE71XXX')

        if order.payment_method == 'bank_transfer':
            bank_transfer_html = f"""
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EFF6FF; border: 2px solid #2563EB; border-radius: 10px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 18px 20px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0B1F33;">
                    Banküberweisung (Vorkasse)
                  </h3>
                  <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;">
                    Bitte überweisen Sie den fälligen Gesamtbetrag von <strong>{format_de_currency(order.grand_total)}</strong> auf das folgende Bankkonto:
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
                    <tr>
                      <td style="padding: 4px 0; color: #64748B; width: 140px;">Empfänger:</td>
                      <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">{b_beneficiary}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748B;">IBAN:</td>
                      <td style="padding: 4px 0; font-family: monospace; font-size: 14px; font-weight: 700; color: #2563EB;">{b_iban}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748B;">BIC:</td>
                      <td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: #0F172A;">{b_bic}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748B;">Verwendungszweck:</td>
                      <td style="padding: 4px 0; font-family: monospace; font-size: 14px; font-weight: 700; color: #2563EB;">{order.id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #64748B;">Betrag:</td>
                      <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">{format_de_currency(order.grand_total)}</td>
                    </tr>
                  </table>
                  <div style="margin-top: 12px; padding: 10px 12px; background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; font-size: 12px; color: #92400E; line-height: 1.4;">
                    <strong>Zahlungsnachweis erbeten:</strong> Bitte übermitteln Sie nach der Überweisung Ihren Zahlungsbeleg (Screenshot oder PDF) über Ihre Bestellseite oder per Antwort auf diese E-Mail, um die Bearbeitung und den Versand sofort freizugeben.
                  </div>
                </td>
              </tr>
            </table>
            """
            bank_transfer_text = f"""
Überweisungsinformationen (Vorkasse):
------------------------------------
Bitte überweisen Sie den fälligen Betrag auf unser Bankkonto:
- Empfänger:        {b_beneficiary}
- IBAN:             {b_iban}
- BIC:              {b_bic}
- Verwendungszweck: {order.id}
- Gesamtbetrag:     {format_de_currency(order.grand_total)}

WICHTIG - Zahlungsnachweis:
Bitte übermitteln Sie uns Ihren Überweisungsbeleg (Screenshot / PDF) über Ihre Bestellseite oder antworten Sie auf diese E-Mail mit dem Beleg für den schnellstmöglichen Versand.
"""

        items_html = ""
        items_text = ""
        for idx, item in enumerate(order.items.all(), 1):
            line_total = Decimal(str(item.unit_price)) * item.quantity
            items_html += f"""
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 8px; font-size: 14px; color: #0F172A;">
                    <strong>{item.product_name}</strong>
                </td>
                <td style="padding: 12px 8px; font-size: 14px; color: #475569; text-align: center;">
                    {item.quantity}x
                </td>
                <td style="padding: 12px 8px; font-size: 14px; color: #475569; text-align: right;">
                    {format_de_currency(item.unit_price)}
                </td>
                <td style="padding: 12px 8px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right;">
                    {format_de_currency(line_total)}
                </td>
            </tr>
            """
            items_text += f"- {item.quantity}x {item.product_name} à {format_de_currency(item.unit_price)} = {format_de_currency(line_total)}\n"

        shipping_fee_str = "0,00 € (Kostenfrei)" if order.shipping_total == Decimal('0.00') else format_de_currency(order.shipping_total)
        total_net = order.grand_total - order.tax_total

        html_content = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bestellbestätigung {order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 24px 12px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <tr>
          <td style="background-color: #0B1F33; padding: 28px 32px; border-bottom: 3px solid #2563EB;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                    TechnikWelt<span style="color: #2563EB;">.</span>
                  </h1>
                  <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 13px;">
                    Ihr zertifizierter Fachhändler für modernste Technik
                  </p>
                </td>
                <td align="right" style="vertical-align: middle;">
                  <span style="background-color: rgba(37, 99, 235, 0.2); color: #93C5FD; border: 1px solid rgba(147, 197, 253, 0.4); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">
                    Bestellbestätigung
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding: 32px 32px 24px 32px;">
            <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0B1F33;">
              Vielen Dank für Ihre Bestellung, {order.first_name}!
            </h2>
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
              Wir haben Ihre Bestellung <strong>{order.id}</strong> erfolgreich erhalten und bearbeiten sie umgehend in unserem deutschen Versandzentrum.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-bottom: 8px; font-size: 13px; color: #64748B;">Bestellnummer:</td>
                      <td style="padding-bottom: 8px; font-size: 13px; font-weight: 700; color: #0B1F33; text-align: right;">{order.id}</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 8px; font-size: 13px; color: #64748B;">Bestelldatum:</td>
                      <td style="padding-bottom: 8px; font-size: 13px; font-weight: 600; color: #0F172A; text-align: right;">{order_date_str}</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 8px; font-size: 13px; color: #64748B;">Zahlungsart:</td>
                      <td style="padding-bottom: 8px; font-size: 13px; font-weight: 600; color: #0F172A; text-align: right;">{payment_str}</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 8px; font-size: 13px; color: #64748B;">Versandmethode:</td>
                      <td style="padding-bottom: 8px; font-size: 13px; font-weight: 600; color: #0F172A; text-align: right;">{shipping_str}</td>
                    </tr>
                    {f'''
                    <tr>
                      <td style="font-size: 13px; color: #64748B;">DHL Sendungsverfolgung:</td>
                      <td style="font-size: 13px; font-weight: 700; color: #2563EB; text-align: right;">{order.tracking_number}</td>
                    </tr>''' if order.tracking_number else ''}
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
              <tr>
                <td>
                  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #0B1F33; text-transform: uppercase; letter-spacing: 0.5px;">
                    Lieferadresse
                  </h3>
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #475569;">
                    {order.first_name} {order.last_name}<br/>
                    {order.street}<br/>
                    {order.postal_code} {order.city}<br/>
                    {order.country}
                  </p>
                </td>
              </tr>
            </table>

            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #0B1F33; text-transform: uppercase; letter-spacing: 0.5px;">
              Bestellte Artikel
            </h3>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #0B1F33; color: #FFFFFF;">
                  <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; text-align: left; border-radius: 6px 0 0 0;">Artikel</th>
                  <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; text-align: center;">Menge</th>
                  <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; text-align: right;">Einzelpreis</th>
                  <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; text-align: right; border-radius: 0 6px 0 0;">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {items_html}
              </tbody>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
              <tr>
                <td width="50%"></td>
                <td width="50%">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Zwischensumme:</td>
                      <td style="padding: 4px 0; font-size: 13px; color: #0F172A; text-align: right;">{format_de_currency(order.subtotal)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Versandkosten:</td>
                      <td style="padding: 4px 0; font-size: 13px; color: #0F172A; text-align: right;">{shipping_fee_str}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Enthaltene 19% MwSt.:</td>
                      <td style="padding: 4px 0; font-size: 13px; color: #0F172A; text-align: right;">{format_de_currency(order.tax_total)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #CBD5E1;">
                      <td style="padding: 10px 0 4px 0; font-size: 16px; font-weight: 700; color: #0B1F33;">Gesamtbetrag:</td>
                      <td style="padding: 10px 0 4px 0; font-size: 18px; font-weight: 800; color: #2563EB; text-align: right;">{format_de_currency(order.grand_total)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            {bank_transfer_html}

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 16px 20px;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1E3A8A;">
                    📄 <strong>Offizielle Rechnung beigefügt:</strong> Ihre steuerlich konforme Rechnung nach §14 UStG (<strong>{invoice_filename}</strong>) liegt dieser E-Mail im PDF-Format bei.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
              Haben Sie Fragen zu Ihrer Bestellung? Antworten Sie einfach auf diese E-Mail oder kontaktieren Sie unseren Kundenservice unter <a href="mailto:info@technikwelt.shop" style="color: #2563EB; text-decoration: none;">info@technikwelt.shop</a>.
            </p>

          </td>
        </tr>

        <tr>
          <td style="background-color: #F1F5F9; padding: 24px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; line-height: 1.6; color: #64748B;">
            <p style="margin: 0 0 8px 0;">
              <strong>TechnikWelt GmbH</strong> • Maximilianstraße 35 • 80539 München, Deutschland<br/>
              Geschäftsführer: Dr. Markus Lindemann • Amtsgericht München, HRB 284910<br/>
              Umsatzsteuer-Identifikationsnummer (USt-IdNr.): DE 362 891 042
            </p>
            <p style="margin: 0;">
              Sie erhalten diese Nachricht als gesetzliche Eingangs- und Bestellbestätigung Ihres getätigten Kaufs.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""

        plain_text = f"""TechnikWelt - Bestellbestätigung {order.id}
============================================================

Hallo {order.first_name} {order.last_name},

vielen Dank für Ihre Bestellung bei TechnikWelt!
Wir bearbeiten Ihren Auftrag umgehend.

Bestellnummer: {order.id}
Bestelldatum:  {order_date_str}
Zahlungsart:   {payment_str}
Versandart:    {shipping_str}
DHL Sendungsnr: {order.tracking_number}

Lieferadresse:
{order.first_name} {order.last_name}
{order.street}
{order.postal_code} {order.city}
{order.country}

Bestellte Artikel:
{items_text}
Zwischensumme:        {format_de_currency(order.subtotal)}
Versandkosten:        {shipping_fee_str}
Enthaltene 19% MwSt.: {format_de_currency(order.tax_total)}
Gesamtbetrag:         {format_de_currency(order.grand_total)}
{bank_transfer_text}
Ihre offizielle Rechnung ({invoice_filename}) liegt dieser E-Mail als PDF bei.

Kundenservice: info@technikwelt.shop
TechnikWelt GmbH | Maximilianstraße 35, 80539 München | HRB 284910
"""

        subject = f"Bestellbestätigung: Ihre TechnikWelt Bestellung {order.id}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or os.environ.get('DEFAULT_FROM_EMAIL', 'TechnikWelt <info@technikwelt.shop>')
        resend_api_key = os.environ.get('RESEND_API_KEY', getattr(settings, 'RESEND_API_KEY', ''))

        delivery_method = 'django'
        resend_response = None

        if resend_api_key and not resend_api_key.startswith('your_') and len(resend_api_key) > 10:
            try:
                resend_from = os.environ.get('RESEND_FROM_EMAIL', getattr(settings, 'RESEND_FROM_EMAIL', 'TechnikWelt <info@technikwelt.shop>'))
                encoded_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
                res = requests.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": resend_from,
                        "to": [order.email],
                        "subject": subject,
                        "html": html_content,
                        "text": plain_text,
                        "attachments": [
                            {
                                "filename": invoice_filename,
                                "content": encoded_pdf
                            }
                        ]
                    },
                    timeout=10
                )
                if res.status_code in (200, 201):
                    delivery_method = 'resend'
                    resend_response = res.json()
                    logger.info(f"Order confirmation email sent via Resend for {order.id}")
                else:
                    logger.warning(f"Resend returned {res.status_code}: {res.text}. Falling back to Django mail.")
            except Exception as resend_err:
                logger.warning(f"Resend dispatch error: {resend_err}. Falling back to Django mail.")

        if delivery_method == 'django':
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_email,
                to=[order.email],
                reply_to=['info@technikwelt.shop']
            )
            msg.encoding = 'utf-8'
            msg.attach_alternative(html_content, "text/html")
            msg.attach(invoice_filename, pdf_bytes, "application/pdf")
            try:
                sent_count = msg.send(fail_silently=False)
                logger.info(f"Order confirmation email dispatched via Django mail for {order.id} (sent: {sent_count})")
            except Exception as mail_err:
                logger.error(f"Failed to send email via Django mail: {mail_err}")
                return {
                    "success": False,
                    "error": f"Fehler beim E-Mail-Versand: {mail_err}",
                    "order_id": order.id,
                }

        return {
            "success": True,
            "order_id": order.id,
            "email": order.email,
            "method": delivery_method,
            "invoice_bytes": len(pdf_bytes),
            "invoice_filename": invoice_filename,
            "resend_response": resend_response
        }

    except Exception as e:
        logger.error(f"Error compiling or sending confirmation email for order {getattr(order, 'id', 'unknown')}: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def send_return_label_email(order_return) -> dict:
    """
    Generate and dispatch a German DHL return confirmation email with attached
    printable DHL Retourenschein & routing parcel label (PDF).
    Uses Resend API if configured, falling back to Django EmailMultiAlternatives.
    """
    try:
        pdf_bytes = generate_return_label_pdf(order_return)
        label_filename = f"DHL_Retourenschein_{order_return.id}.pdf"

        order_id = getattr(order_return, 'order_id', '') or (order_return.order.id if getattr(order_return, 'order', None) else '')
        customer_name = order_return.customer_name or 'Kunde'
        customer_email = order_return.customer_email
        tracking_num = order_return.return_tracking_number or '00340434...'
        carrier_name = order_return.carrier or 'DHL Retoure Deutschland'
        refund_amount_str = format_de_currency(order_return.refund_amount)
        reason_str = order_return.get_reason_display() if hasattr(order_return, 'get_reason_display') else str(order_return.reason)
        refund_method_str = order_return.get_refund_method_display() if hasattr(order_return, 'get_refund_method_display') else str(order_return.refund_method)
        date_str = format_de_date(order_return.created_at)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5174')
        account_returns_url = f"{frontend_url}/account"
        dhl_tracking_url = f"https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={tracking_num}"

        items_html = ""
        items_text = ""
        items_data = order_return.items_data or []
        for it in items_data:
            p_name = it.get('product_name') or 'Elektronikartikel'
            p_qty = it.get('quantity', 1)
            p_price = format_de_currency(it.get('unit_price') or it.get('price', 0))
            items_html += f"""
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 10px 8px; font-size: 14px; color: #0F172A;">
                    <strong>{p_name}</strong>
                </td>
                <td style="padding: 10px 8px; font-size: 14px; color: #475569; text-align: center;">
                    {p_qty}x
                </td>
                <td style="padding: 10px 8px; font-size: 14px; color: #0F172A; text-align: right; font-weight: 600;">
                    {p_price}
                </td>
            </tr>
            """
            items_text += f"- {p_qty}x {p_name} ({p_price})\n"

        html_content = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ihr DHL Retourenschein {order_return.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; padding: 24px 12px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <tr>
          <td style="background-color: #0B1F33; padding: 28px 32px; border-bottom: 3px solid #2563EB;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                    TechnikWelt<span style="color: #2563EB;">.</span>
                  </h1>
                  <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 13px;">
                    Rücksendung & Retourenservice (§ 355 BGB)
                  </p>
                </td>
                <td align="right" style="vertical-align: middle;">
                  <span style="background-color: #FFCC00; color: #0B1F33; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.3px; display: inline-block;">
                    DHL Retoure
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding: 32px 32px 24px 32px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #0F172A;">
              Hallo <strong>{customer_name}</strong>,
            </p>
            <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
              wir haben Ihren Rücksendeantrag für die Bestellung <strong>{order_id}</strong> erfolgreich entgegengenommen.
              Ihr kostenfreies <strong>DHL-Retourenetikett</strong> wurde generiert und liegt dieser E-Mail als PDF-Dokument bei.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 18px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="50%" style="vertical-align: top; padding-right: 12px;">
                        <span style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 600; letter-spacing: 0.5px;">Retouren-ID</span>
                        <p style="margin: 3px 0 12px 0; font-size: 15px; font-weight: 700; color: #0B1F33;">{order_return.id}</p>
                        
                        <span style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 600; letter-spacing: 0.5px;">DHL Sendungsnummer</span>
                        <p style="margin: 3px 0 0 0; font-size: 14px; font-family: monospace; font-weight: 700; color: #2563EB;">{tracking_num}</p>
                      </td>
                      <td width="50%" style="vertical-align: top; padding-left: 12px;">
                        <span style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 600; letter-spacing: 0.5px;">Voraussichtliche Erstattung</span>
                        <p style="margin: 3px 0 12px 0; font-size: 16px; font-weight: 800; color: #16A34A;">{refund_amount_str}</p>
                        
                        <span style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 600; letter-spacing: 0.5px;">Rücksendegrund</span>
                        <p style="margin: 3px 0 0 0; font-size: 13px; color: #334155;">{reason_str}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0B1F33; letter-spacing: -0.2px;">
              Gemeldete Artikel für die Rücksendung
            </h3>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
                  <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-align: left; text-transform: uppercase;">Artikel</th>
                  <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-align: center; text-transform: uppercase;">Menge</th>
                  <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-align: right; text-transform: uppercase;">Erstattung</th>
                </tr>
              </thead>
              <tbody>
                {items_html}
              </tbody>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; margin-bottom: 28px;">
              <tr>
                <td style="padding: 20px;">
                  <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #1E40AF;">
                    So funktioniert Ihre DHL-Rücksendung in 4 einfachen Schritten:
                  </h4>
                  <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #1E3A8A;">
                    <li style="margin-bottom: 6px;">
                      <strong>Retourenschein drucken:</strong> Öffnen Sie das angehängte PDF (<code>{label_filename}</code>) und drucken Sie es im Format DIN A4 aus.
                    </li>
                    <li style="margin-bottom: 6px;">
                      <strong>Paket vorbereiten:</strong> Legen Sie den oberen <em>Retourenbegleitschein</em> in das Paket zu den Artikeln.
                    </li>
                    <li style="margin-bottom: 6px;">
                      <strong>Label anbringen:</strong> Trennen Sie das untere <em>DHL-Paketlabel</em> an der Linie ab und kleben Sie es außen gut sichtbar auf den Karton.
                    </li>
                    <li style="margin-bottom: 0;">
                      <strong>Kostenfrei aufgeben:</strong> Bringen Sie das Paket zu einer beliebigen <strong>DHL Filiale</strong>, <strong>DHL Packstation</strong> oder übergeben Sie es direkt Ihrem DHL-Zusteller.
                    </li>
                  </ol>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
              <tr>
                <td align="center">
                  <a href="{account_returns_url}" style="background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                    Status in Mein Konto aufrufen
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <tr>
          <td style="background-color: #F8FAFC; padding: 24px 32px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; line-height: 1.5;">
            <p style="margin: 0 0 8px 0;">
              <strong>TechnikWelt GmbH</strong> • Maximilianstraße 35 • 80539 München • Deutschland
            </p>
            <p style="margin: 0 0 8px 0;">
              Amtsgericht München HRB 284910 • USt-IdNr.: DE 362 891 042 • Geschäftsführer: Dr. Markus Lindemann
            </p>
            <p style="margin: 0; color: #94A3B8;">
              30 Tage freiwilliges Rückgaberecht & gesetzliches Widerrufsrecht gem. § 355 BGB.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>"""

        plain_text = f"""TechnikWelt - Ihr DHL Retourenschein für Rücksendung {order_return.id}
========================================================================

Hallo {customer_name},

wir haben Ihren Rücksendeantrag für Bestellung {order_id} erhalten.
Ihr kostenfreies DHL-Retourenetikett ({label_filename}) ist dieser E-Mail als PDF angehängt.

Retouren-Details:
- Retouren-ID: {order_return.id}
- Zugehörige Bestellung: {order_id}
- DHL Sendungsnummer: {tracking_num}
- Versanddienstleister: {carrier_name}
- Voraussichtlicher Erstattungsbetrag: {refund_amount_str}
- Erstattungsmethode: {refund_method_str}
- Rücksendegrund: {reason_str}
- Datum: {date_str}

Gemeldete Artikel:
{items_text}

So funktioniert Ihre Rücksendung:
1. Öffnen Sie die angehängte PDF-Datei '{label_filename}' und drucken Sie diese aus.
2. Legen Sie den Retourenbegleitschein in das Paket.
3. Schneiden Sie das DHL-Paketlabel aus und kleben Sie es außen auf das Paket.
4. Geben Sie das Paket kostenfrei in einer DHL Filiale, Packstation oder beim Zusteller ab.

Retourenstatus in Ihrem Kundenkonto:
{account_returns_url}

DHL Sendungsverfolgung:
{dhl_tracking_url}

TechnikWelt GmbH | Maximilianstraße 35, 80539 München
Amtsgericht München HRB 284910 | USt-IdNr.: DE 362 891 042
"""

        subject = f"Ihr DHL-Retourenschein für Rücksendung {order_return.id} (Bestellung {order_id})"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or os.environ.get('DEFAULT_FROM_EMAIL', 'TechnikWelt <info@technikwelt.shop>')
        resend_api_key = os.environ.get('RESEND_API_KEY', getattr(settings, 'RESEND_API_KEY', ''))

        delivery_method = 'django'
        resend_response = None

        if resend_api_key and not resend_api_key.startswith('your_') and len(resend_api_key) > 10:
            try:
                resend_from = os.environ.get('RESEND_FROM_EMAIL', getattr(settings, 'RESEND_FROM_EMAIL', 'TechnikWelt <info@technikwelt.shop>'))
                encoded_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
                res = requests.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": resend_from,
                        "to": [customer_email],
                        "subject": subject,
                        "html": html_content,
                        "text": plain_text,
                        "attachments": [
                            {
                                "filename": label_filename,
                                "content": encoded_pdf
                            }
                        ]
                    },
                    timeout=10
                )
                if res.status_code in (200, 201):
                    delivery_method = 'resend'
                    resend_response = res.json()
                    logger.info(f"DHL Return label email dispatched via Resend for {order_return.id} to {customer_email}")
                else:
                    logger.warning(f"Resend returned {res.status_code}: {res.text}. Falling back to Django mail.")
            except Exception as resend_err:
                logger.warning(f"Resend dispatch error: {resend_err}. Falling back to Django mail.")

        if delivery_method == 'django':
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_email,
                to=[customer_email],
                reply_to=['info@technikwelt.shop']
            )
            msg.encoding = 'utf-8'
            msg.attach_alternative(html_content, "text/html")
            msg.attach(label_filename, pdf_bytes, "application/pdf")
            try:
                sent_count = msg.send(fail_silently=False)
                logger.info(f"DHL Return label email dispatched via Django mail for {order_return.id} to {customer_email} (sent: {sent_count})")
            except Exception as mail_err:
                logger.error(f"Failed to send DHL return email via Django mail: {mail_err}")
                return {
                    "success": False,
                    "error": f"Fehler beim E-Mail-Versand: {mail_err}",
                    "return_id": order_return.id,
                }

        return {
            "success": True,
            "return_id": order_return.id,
            "order_id": order_id,
            "email": customer_email,
            "method": delivery_method,
            "label_bytes": len(pdf_bytes),
            "label_filename": label_filename,
            "resend_response": resend_response
        }

    except Exception as e:
        logger.error(f"Error compiling or sending DHL return email for {getattr(order_return, 'id', 'unknown')}: {e}")
        return {
            "success": False,
            "error": str(e)
        }

