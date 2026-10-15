"""
German DHL Return Label & Retourenschein PDF generator for TechnikWelt.
Generates an A4 document containing:
1. Customer return slip (Retourenschein) to place inside the parcel.
2. Printable DHL Retoure package label with barcode and routing data to attach to the outside.
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
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.barcode import code128

COLOR_NAVY = colors.HexColor('#0B1F33')
COLOR_NAVY_LIGHT = colors.HexColor('#152E4A')
COLOR_ELECTRIC = colors.HexColor('#2563EB')
COLOR_ELECTRIC_LIGHT = colors.HexColor('#EFF6FF')
COLOR_TEXT_MAIN = colors.HexColor('#0F172A')
COLOR_TEXT_MUTED = colors.HexColor('#64748B')
COLOR_BORDER = colors.HexColor('#CBD5E1')
COLOR_ZEBRA = colors.HexColor('#F8FAFC')
COLOR_DHL_YELLOW = colors.HexColor('#FFCC00')
COLOR_DHL_RED = colors.HexColor('#D40511')


def format_de_currency(amount) -> str:
    val = Decimal(str(amount))
    formatted = f"{val:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return f"{formatted} €"


def format_de_date(dt) -> str:
    if not dt:
        return timezone.now().strftime('%d.%m.%Y')
    return dt.strftime('%d.%m.%Y')


class NumberedReturnCanvas(canvas.Canvas):
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
        self.line(20 * mm, 16 * mm, 190 * mm, 16 * mm)

        y = 12 * mm
        self.drawString(20 * mm, y, "TechnikWelt Kundenservice: kontakt@technikwelt.shop | Tel: +49 (0) 89 2154 7890 (Mo-Fr 9-18 Uhr)")
        self.drawRightString(190 * mm, y, f"Seite {self._pageNumber} von {page_count}")
        self.restoreState()


def generate_return_label_pdf(return_obj) -> bytes:
    """
    Build a complete German DHL Retourenschein & Paketaufkleber PDF.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=COLOR_NAVY,
    )

    h2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_NAVY,
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=COLOR_TEXT_MAIN,
    )

    small_style = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=COLOR_TEXT_MUTED,
    )

    bold_small = ParagraphStyle(
        'BoldSmall',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=COLOR_NAVY,
    )

    elements = []

    order = return_obj.order
    customer_name = return_obj.customer_name or f"{order.first_name} {order.last_name}"
    customer_street = order.street if order else "Kundenanschrift"
    customer_city = f"{order.postal_code} {order.city}" if order else "Deutschland"

    header_table = Table(
        [
            [
                Paragraph('<font color="#0B1F33"><b>TechnikWelt</b></font><font color="#2563EB"><b>.</b></font><br/><font size="8" color="#64748B">Ihr Elektronik- & E-Mobilitäts-Fachhändler</font>', body_style),
                Paragraph('<font color="#0B1F33" size="14"><b>DHL Retourenschein & Paketlabel</b></font><br/><font size="8" color="#64748B">30 Tage Rückgaberecht / Gesetzlicher Widerruf</font>', ParagraphStyle('HRight', parent=body_style, alignment=2)),
            ]
        ],
        colWidths=[90 * mm, 90 * mm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_ELECTRIC, spaceBefore=4, spaceAfter=8))

    meta_data = [
        [
            Paragraph('<b>Retouren-ID (RMA):</b>', small_style),
            Paragraph(f'<b><font color="#2563EB">{return_obj.id}</font></b>', body_style),
            Paragraph('<b>Bestellnummer:</b>', small_style),
            Paragraph(str(order.id), body_style),
        ],
        [
            Paragraph('<b>Datum:</b>', small_style),
            Paragraph(format_de_date(return_obj.created_at), body_style),
            Paragraph('<b>Status:</b>', small_style),
            Paragraph(f'<b>{return_obj.get_status_display()}</b>', body_style),
        ],
        [
            Paragraph('<b>Kunde:</b>', small_style),
            Paragraph(customer_name, body_style),
            Paragraph('<b>Erstattungsweg:</b>', small_style),
            Paragraph(return_obj.get_refund_method_display(), body_style),
        ],
        [
            Paragraph('<b>Grund der Rücksendung:</b>', small_style),
            Paragraph(return_obj.get_reason_display(), body_style),
            Paragraph('<b>DHL Sendungsnummer:</b>', small_style),
            Paragraph(f'<b>{return_obj.return_tracking_number}</b>', body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[42 * mm, 48 * mm, 42 * mm, 48 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ZEBRA),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph('<b>1. Retourenschein (bitte dem Paket beilegen)</b>', h2_style))
    elements.append(Paragraph('Bitte legen Sie diesen oberen Abschnitt zusammen mit der sicher verpackten Ware in das Paket, damit unser Logistikzentrum die Rücksendung sofort zuordnen kann.', small_style))
    elements.append(Spacer(1, 6))

    items_header = [
        Paragraph('<b>Artikelbezeichnung</b>', bold_small),
        Paragraph('<b>Menge</b>', ParagraphStyle('C', parent=bold_small, alignment=1)),
        Paragraph('<b>Einzelpreis</b>', ParagraphStyle('R', parent=bold_small, alignment=2)),
        Paragraph('<b>Gesamtbetrag</b>', ParagraphStyle('R', parent=bold_small, alignment=2)),
    ]
    items_rows = [items_header]

    items_list = return_obj.items_data if isinstance(return_obj.items_data, list) else []
    if not items_list:
        items_list = [{'product_name': 'Rücksendeartikel lt. Bestellung', 'quantity': 1, 'unit_price': return_obj.refund_amount}]

    for it in items_list:
        p_name = it.get('product_name') or it.get('name') or 'Artikel'
        qty = int(it.get('quantity', 1))
        u_price = Decimal(str(it.get('unit_price', '0.00')))
        t_price = u_price * qty
        items_rows.append([
            Paragraph(p_name, body_style),
            Paragraph(str(qty), ParagraphStyle('C', parent=body_style, alignment=1)),
            Paragraph(format_de_currency(u_price), ParagraphStyle('R', parent=body_style, alignment=2)),
            Paragraph(format_de_currency(t_price), ParagraphStyle('R', parent=body_style, alignment=2)),
        ])

    items_rows.append([
        Paragraph('<b>Erwarteter Erstattungsbetrag (inkl. 19% MwSt.)</b>', bold_small),
        Paragraph('', body_style),
        Paragraph('', body_style),
        Paragraph(f'<b><font color="#2563EB">{format_de_currency(return_obj.refund_amount)}</font></b>', ParagraphStyle('R', parent=bold_small, alignment=2)),
    ])

    items_table = Table(items_rows, colWidths=[100 * mm, 20 * mm, 30 * mm, 30 * mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_NAVY_LIGHT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, COLOR_ELECTRIC),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph('✄ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Hier entlang der Linie abschneiden - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✄', ParagraphStyle('Cut', parent=small_style, alignment=1, textColor=COLOR_TEXT_MUTED)))
    elements.append(Spacer(1, 8))

    elements.append(Paragraph('<b>2. DHL Retouren-Paketaufkleber (außen gut sichtbar aufkleben)</b>', h2_style))
    elements.append(Paragraph('Kleben Sie diesen Abschnitt auf die größte Fläche Ihres Pakets. Alte Versandaufkleber bitte entfernen oder unkenntlich machen.', small_style))
    elements.append(Spacer(1, 6))

    label_inner_top = [
        [
            Paragraph('<b>DHL RETOURE DEUTSCHLAND</b><br/><font size="7" color="#64748B">Abrechnungs-Nr.: 3349021882 | Ref: ' + return_obj.id + '</font>', bold_small),
            Paragraph(f'<font size="12"><b>DHL</b></font><br/><font size="7">Paket National</font>', ParagraphStyle('DhlLogo', parent=bold_small, alignment=2, textColor=COLOR_DHL_RED)),
        ]
    ]
    label_top_table = Table(label_inner_top, colWidths=[120 * mm, 50 * mm])
    label_top_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    address_data = [
        [
            Paragraph('<b>Absender:</b><br/>' + customer_name + '<br/>' + customer_street + '<br/>' + customer_city + '<br/>Deutschland', body_style),
            Paragraph('<b>Empfänger (Retourenlager):</b><br/><b>TechnikWelt GmbH</b><br/>Retourenlogistik c/o DHL Hub 14<br/>Am Güterbahnhof 3B<br/>12529 Schönefeld<br/>Deutschland', body_style),
        ]
    ]
    address_table = Table(address_data, colWidths=[85 * mm, 85 * mm])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('BACKGROUND', (0, 0), (0, 0), COLOR_ZEBRA),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))

    tracking_code = str(return_obj.return_tracking_number or "00340434910284758291").strip()
    try:
        bc = code128.Code128(tracking_code, barHeight=18 * mm, barWidth=1.3)
    except Exception:
        bc = Paragraph(f"<b>{tracking_code}</b>", body_style)

    label_box_content = [
        [label_top_table],
        [HRFlowable(width="100%", thickness=1, color=COLOR_NAVY, spaceBefore=2, spaceAfter=4)],
        [address_table],
        [Spacer(1, 4)],
        [Paragraph(f'<font size="7" color="#64748B">DHL Routing-Code / Sendungsnummer:</font><br/><b>{tracking_code}</b>', ParagraphStyle('CodeCenter', parent=body_style, alignment=1))],
        [bc],
    ]

    label_box = Table(label_box_content, colWidths=[174 * mm])
    label_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1.5, COLOR_NAVY),
        ('ALIGN', (0, 4), (0, 5), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(label_box)
    elements.append(Spacer(1, 8))

    instructions = [
        Paragraph('<b>So funktioniert Ihre Rücksendung:</b>', bold_small),
        Paragraph('<b>1. Verpacken:</b> Artikel originalverpackt mit sämtlichem Zubehör transportsicher verpacken.<br/>'
                  '<b>2. Retourenschein beilegen:</b> Den oberen Teil dieser Seite in das Paket legen.<br/>'
                  '<b>3. Aufkleber anbringen:</b> Das DHL Retourenlabel ausschneiden und außen auf das Paket kleben.<br/>'
                  '<b>4. Kostenfrei abgeben:</b> Paket kostenfrei in einer Filiale, Packstation oder beim DHL Zusteller abgeben.<br/>'
                  '<b>5. Erstattung:</b> Nach Prüfung im Logistikzentrum erhalten Sie den Erstattungsbetrag innerhalb von 2-4 Werktagen.', small_style),
    ]
    inst_table = Table([[Paragraph('<br/>'.join([p.text for p in instructions]), small_style)]], colWidths=[174 * mm])
    inst_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ZEBRA),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(inst_table)

    doc.build(elements, canvasmaker=NumberedReturnCanvas)
    return buffer.getvalue()
