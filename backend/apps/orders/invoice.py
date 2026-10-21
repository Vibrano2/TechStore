"""
German GoBD and §14 UStG compliant PDF invoice generation for TechnikWelt.
Generates a structured, pixel-perfect A4 invoice with the approved TechnikWelt
navy and electric-blue design palette, detailed 19% MwSt breakdown, and
required legal company disclosures.
"""

from decimal import Decimal
import io
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.pdfgen import canvas


COLOR_NAVY = colors.HexColor('#0B1F33')
COLOR_NAVY_LIGHT = colors.HexColor('#152E4A')
COLOR_ELECTRIC = colors.HexColor('#2563EB')
COLOR_ELECTRIC_LIGHT = colors.HexColor('#EFF6FF')
COLOR_TEXT_MAIN = colors.HexColor('#0F172A')
COLOR_TEXT_MUTED = colors.HexColor('#64748B')
COLOR_BORDER = colors.HexColor('#E2E8F0')
COLOR_ZEBRA = colors.HexColor('#F8FAFC')


def format_de_currency(amount) -> str:
    """Format Decimal or float to German currency representation (e.g. 1.249,90 €)."""
    val = Decimal(str(amount))
    formatted = f"{val:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return f"{formatted} €"


def format_de_date(dt) -> str:
    """Format datetime or date to German standard dd.mm.yyyy."""
    if not dt:
        return timezone.now().strftime('%d.%m.%Y')
    return dt.strftime('%d.%m.%Y')


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Seite X von Y'
    along with a legal footer on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)

        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(20 * mm, 24 * mm, 190 * mm, 24 * mm)

        from django.conf import settings
        comp_name = getattr(settings, 'COMPANY_NAME', 'TechnikWelt GmbH')
        comp_street = getattr(settings, 'COMPANY_STREET', 'Maximilianstraße 35')
        comp_city = getattr(settings, 'COMPANY_CITY', '80539 München')
        comp_country = getattr(settings, 'COMPANY_COUNTRY', 'Deutschland')
        comp_email = getattr(settings, 'COMPANY_SUPPORT_EMAIL', 'info@technikwelt.shop')
        comp_director = getattr(settings, 'COMPANY_MANAGING_DIRECTOR', 'Dr. Markus Lindemann')
        comp_register = getattr(settings, 'COMPANY_REGISTER', 'Amtsgericht München HRB 284910')
        comp_vat = getattr(settings, 'COMPANY_VAT_ID', 'DE 362 891 042')
        from apps.orders.models import ManualBankDetails
        try:
            bank_obj = ManualBankDetails.get_details()
            comp_beneficiary = bank_obj.beneficiary
            comp_iban = bank_obj.formatted_iban
            comp_bic = bank_obj.bic
        except Exception:
            comp_beneficiary = getattr(settings, 'COMPANY_BANK_BENEFICIARY', 'Edeltraud Liesbeth Buhs')
            comp_iban = getattr(settings, 'COMPANY_BANK_IBAN', 'DE96 7607 0324 0086 9081 00')
            comp_bic = getattr(settings, 'COMPANY_BANK_BIC', 'DEUTDEDBP15')

        y = 20 * mm
        line_height = 9

        self.drawString(20 * mm, y, comp_name)
        self.drawString(20 * mm, y - line_height, comp_street)
        self.drawString(20 * mm, y - (line_height * 2), f"{comp_city}, {comp_country}")
        self.drawString(20 * mm, y - (line_height * 3), comp_email)

        col2_x = 80 * mm
        self.drawString(col2_x, y, f"Geschäftsführer: {comp_director}")
        self.drawString(col2_x, y - line_height, comp_register)
        self.drawString(col2_x, y - (line_height * 2), f"USt-IdNr.: {comp_vat}")
        self.drawString(col2_x, y - (line_height * 3), f"Web: www.technikwelt.shop")

        col3_x = 145 * mm
        self.drawString(col3_x, y, comp_beneficiary)
        self.drawString(col3_x, y - line_height, f"IBAN: {comp_iban}")
        self.drawString(col3_x, y - (line_height * 2), f"BIC: {comp_bic}")
        self.drawRightString(190 * mm, y - (line_height * 3), f"Seite {self._pageNumber} von {page_count}")

        self.restoreState()


def generate_invoice_pdf(order) -> bytes:
    """
    Build a complete, legally compliant German PDF invoice for the given Order.
    Returns bytes of the generated PDF document.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=30 * mm,
    )

    styles = getSampleStyleSheet()

    style_company_logo = ParagraphStyle(
        'CompanyLogo',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=COLOR_NAVY,
    )
    style_logo_dot = ParagraphStyle(
        'LogoDot',
        parent=style_company_logo,
        textColor=COLOR_ELECTRIC,
    )
    style_return_address = ParagraphStyle(
        'ReturnAddress',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=COLOR_TEXT_MUTED,
    )
    style_recipient = ParagraphStyle(
        'Recipient',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=COLOR_TEXT_MAIN,
    )
    style_meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_NAVY,
    )
    style_meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_TEXT_MAIN,
    )
    style_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=COLOR_NAVY,
    )
    style_subtitle = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=COLOR_TEXT_MUTED,
    )
    style_th = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )
    style_td = ParagraphStyle(
        'TableData',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=COLOR_TEXT_MAIN,
    )
    style_td_bold = ParagraphStyle(
        'TableDataBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=COLOR_TEXT_MAIN,
    )
    style_td_right = ParagraphStyle(
        'TableDataRight',
        parent=style_td,
        alignment=2,  # TA_RIGHT
    )
    style_th_right = ParagraphStyle(
        'TableHeadRight',
        parent=style_th,
        alignment=2,  # TA_RIGHT
    )
    style_legal_note = ParagraphStyle(
        'LegalNote',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=COLOR_TEXT_MUTED,
    )

    story = []

    header_table_data = [
        [
            Paragraph('<b>TechnikWelt</b><font color="#2563EB">.</font>', style_company_logo),
            Paragraph(
                '<font color="#64748B"><b>ORIGINAL-RECHNUNG</b></font><br/>'
                f'<font size="8" color="#64748B">Rechnungs-Nr.: <b>{order.id.replace("TS-", "RE-")}</b></font>',
                ParagraphStyle('HeaderRight', parent=styles['Normal'], alignment=2, leading=12)
            )
        ]
    ]
    header_table = Table(header_table_data, colWidths=[100 * mm, 70 * mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_ELECTRIC, spaceBefore=0, spaceAfter=8 * mm))

    invoice_date_str = format_de_date(order.created_at)
    order_date_str = format_de_date(order.created_at)

    payment_labels = {
        'stripe': 'Stripe (Kreditkarte / Apple Pay / Google Pay - Sofort bezahlt)',
        'bank_transfer': 'Manuelle Banküberweisung (Vorkasse)',
        'klarna': 'Klarna (Rechnung / Sofort)',
        'credit_card': 'Kreditkarte (Visa / Mastercard)',
        'sepa': 'SEPA-Lastschrift',
        'apple_pay': 'Apple Pay / Google Pay',
    }
    payment_display = payment_labels.get(order.payment_method, order.payment_method.capitalize())

    recipient_text = (
        f"<b>{order.first_name} {order.last_name}</b><br/>"
        f"{order.street}<br/>"
        f"{order.postal_code} {order.city}<br/>"
        f"{order.country}"
    )

    if order.payment_status == 'paid':
        status_display = f"Bezahlt am {invoice_date_str}"
    elif order.payment_method == 'bank_transfer':
        status_display = "Zahlung ausstehend (Vorkasse)"
    else:
        status_display = "Ausstehend"

    meta_rows = [
        [Paragraph("Rechnungs-Nr.:", style_meta_label), Paragraph(f"<b>{order.id.replace('TS-', 'RE-')}</b>", style_meta_val)],
        [Paragraph("Bestellnummer:", style_meta_label), Paragraph(order.id, style_meta_val)],
        [Paragraph("Rechnungsdatum:", style_meta_label), Paragraph(invoice_date_str, style_meta_val)],
        [Paragraph("Bestelldatum:", style_meta_label), Paragraph(order_date_str, style_meta_val)],
        [Paragraph("Lieferdatum:", style_meta_label), Paragraph(f"entspricht Rechnungsdatum", style_meta_val)],
        [Paragraph("Zahlungsart:", style_meta_label), Paragraph(payment_display, style_meta_val)],
        [Paragraph("Status:", style_meta_label), Paragraph(status_display, style_meta_val)],
    ]
    if order.tracking_number:
        meta_rows.append([Paragraph("Sendungsverfolgung:", style_meta_label), Paragraph(f"{order.tracking_number} (DHL)", style_meta_val)])

    meta_subtable = Table(meta_rows, colWidths=[32 * mm, 43 * mm])
    meta_subtable.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    address_meta_table = Table([
        [
            [
                Paragraph("TechnikWelt GmbH • Friedrichstraße 123 • 10117 Berlin", style_return_address),
                Spacer(1, 3 * mm),
                Paragraph(recipient_text, style_recipient),
            ],
            meta_subtable
        ]
    ], colWidths=[95 * mm, 75 * mm])
    address_meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(address_meta_table)
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph(f"Rechnung Nr. {order.id.replace('TS-', 'RE-')}", style_title))
    story.append(Spacer(1, 1 * mm))
    story.append(Paragraph(
        f"Vielen Dank für Ihren Einkauf bei TechnikWelt! Nachfolgend erhalten Sie die "
        f"Abrechnung zu Ihrer Bestellung vom {order_date_str}.",
        style_subtitle
    ))
    story.append(Spacer(1, 5 * mm))

    item_rows = [
        [
            Paragraph("Pos.", style_th),
            Paragraph("Artikel / Bezeichnung", style_th),
            Paragraph("Menge", style_th_right),
            Paragraph("Einzelpreis", style_th_right),
            Paragraph("MwSt.", style_th_right),
            Paragraph("Gesamt (brutto)", style_th_right),
        ]
    ]

    items = order.items.all()
    for idx, item in enumerate(items, start=1):
        line_gross = Decimal(str(item.unit_price)) * item.quantity
        item_rows.append([
            Paragraph(f"{idx}", style_td),
            Paragraph(f"<b>{item.product_name}</b>", style_td),
            Paragraph(f"{item.quantity} Stk.", style_td_right),
            Paragraph(format_de_currency(item.unit_price), style_td_right),
            Paragraph("19%", style_td_right),
            Paragraph(format_de_currency(line_gross), style_td_right),
        ])

    items_table = Table(
        item_rows,
        colWidths=[12 * mm, 78 * mm, 18 * mm, 22 * mm, 15 * mm, 25 * mm]
    )
    table_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, -1), (-1, -1), 1, COLOR_BORDER),
    ]

    for r in range(1, len(item_rows)):
        if r % 2 == 0:
            table_styles.append(('BACKGROUND', (0, r), (-1, r), COLOR_ZEBRA))

    items_table.setStyle(TableStyle(table_styles))
    story.append(items_table)
    story.append(Spacer(1, 4 * mm))

    subtotal_gross = order.subtotal
    shipping_gross = order.shipping_total
    grand_total_gross = order.grand_total
    vat_19 = order.tax_total
    total_net = grand_total_gross - vat_19

    shipping_label = "Versandkosten (DHL Express):" if shipping_gross > Decimal('5.00') else "Versandkosten (DHL Standard):"
    shipping_val_str = "0,00 € (Kostenfrei)" if shipping_gross == Decimal('0.00') else format_de_currency(shipping_gross)

    summary_rows = [
        [
            Paragraph("Zwischensumme (brutto):", style_meta_label),
            Paragraph(format_de_currency(subtotal_gross), style_td_right)
        ],
        [
            Paragraph(shipping_label, style_meta_label),
            Paragraph(shipping_val_str, style_td_right)
        ],
        [
            Paragraph("Nettobetrag (ohne MwSt.):", style_meta_label),
            Paragraph(format_de_currency(total_net), style_td_right)
        ],
        [
            Paragraph("Enthaltene MwSt. (19%):", style_meta_label),
            Paragraph(format_de_currency(vat_19), style_td_right)
        ],
        [
            Paragraph("<b>Gesamtbetrag (brutto):</b>", ParagraphStyle('TotalLabel', parent=style_meta_label, fontSize=10, textColor=COLOR_NAVY)),
            Paragraph(f"<b>{format_de_currency(grand_total_gross)}</b>", ParagraphStyle('TotalVal', parent=style_td_right, fontSize=11, fontName='Helvetica-Bold', textColor=COLOR_NAVY))
        ],
    ]

    summary_table = Table(summary_rows, colWidths=[55 * mm, 30 * mm])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LINEBELOW', (0, 3), (-1, 3), 0.5, COLOR_BORDER),
        ('BACKGROUND', (0, 4), (-1, 4), COLOR_ELECTRIC_LIGHT),
        ('BOX', (0, 4), (-1, 4), 1, COLOR_ELECTRIC),
        ('TOPPADDING', (0, 4), (-1, 4), 5),
        ('BOTTOMPADDING', (0, 4), (-1, 4), 5),
    ]))

    summary_wrapper = Table([[Paragraph("", style_td), summary_table]], colWidths=[85 * mm, 85 * mm])
    summary_wrapper.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(summary_wrapper)
    story.append(Spacer(1, 6 * mm))

    from django.conf import settings
    from apps.orders.models import ManualBankDetails
    try:
        bank_obj = ManualBankDetails.get_details()
        b_beneficiary = bank_obj.beneficiary
        b_iban = bank_obj.formatted_iban
        b_bic = bank_obj.bic
    except Exception:
        b_beneficiary = getattr(settings, 'COMPANY_BANK_BENEFICIARY', 'Edeltraud Liesbeth Buhs')
        b_iban = getattr(settings, 'COMPANY_BANK_IBAN', 'DE96 7607 0324 0086 9081 00')
        b_bic = getattr(settings, 'COMPANY_BANK_BIC', 'DEUTDEDBP15')

    if order.payment_method == 'bank_transfer':
        payment_notice = (
            "Zahlungsstatus: <b>Zahlung ausstehend (Vorkasse).</b> Bitte überweisen Sie den Betrag unter Angabe der Bestellnummer "
            f"<b>{order.id}</b> auf das angegebene Bankkonto ({b_beneficiary}, IBAN: <b>{b_iban}</b>, BIC: <b>{b_bic}</b>)."
            if order.payment_status != 'paid' else "Zahlungsstatus: <b>Der Gesamtbetrag wurde vollständig per Banküberweisung beglichen.</b>"
        )
    else:
        payment_notice = f"Zahlungsstatus: <b>{'Der Gesamtbetrag wurde vollständig beglichen.' if order.payment_status == 'paid' else 'Zahlung ausstehend gem. Zahlungsziel.'}</b>"

    notes_block = [
        Paragraph(
            "<b>Hinweise zur Abrechnung (§14 UStG):</b><br/>"
            "• Die Lieferung erfolgt gemäß den allgemeinen Geschäftsbedingungen der TechnikWelt GmbH.<br/>"
            f"• Der ausgewiesene Gesamtbetrag von <b>{format_de_currency(grand_total_gross)}</b> enthält 19% deutsche Umsatzsteuer in Höhe von <b>{format_de_currency(vat_19)}</b>.<br/>"
            f"• {payment_notice}",
            style_legal_note
        ),
        Spacer(1, 3 * mm),
        Paragraph(
            "<b>Widerrufsrecht:</b> Verbraucher haben das gesetzliche Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. "
            "Rücksendungen können kostenfrei über unser DHL Retourenportal unter www.technikwelt.shop/account/returns angemeldet werden.",
            style_legal_note
        )
    ]
    story.append(KeepTogether(notes_block))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
