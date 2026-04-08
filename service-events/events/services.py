<<<<<<< HEAD
import io
import qrcode
import base64
import secrets
import random
import string
from io import BytesIO
from django.core.mail import EmailMessage
from django.utils import timezone
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from .models import Purchase


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades QR compartidas (usadas por TicketGenerationService y PurchaseView)
# ─────────────────────────────────────────────────────────────────────────────

def _generate_qr_buffer(data):
    """Genera la imagen QR en memoria (BytesIO)"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, "PNG")
    buffer.seek(0)
    return buffer


def generate_qr_base64(data):
    """Genera el QR y lo devuelve en Base64"""
    buffer = _generate_qr_buffer(data)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


# ─────────────────────────────────────────────────────────────────────────────
# TicketGenerationService — compatibilidad con endpoint purchase de main
# ─────────────────────────────────────────────────────────────────────────────
=======
import qrcode
import base64
from io import BytesIO
import random
import string
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)

class TicketGenerationService:
    @staticmethod
    def generate_alphanumeric_code(length=8):
        """Genera el código de emergencia (Ej: X7K9M2P4)"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choices(chars, k=length))

<<<<<<< HEAD
    @classmethod
    def generate_qr_b64(cls, data):
        return generate_qr_base64(data)

    @classmethod
    def generate_pdf_ticket(cls, event_name, event_date, location, ticket_name, price, emergency_code, qr_payload):
        """Genera un PDF de entrada simple en memoria."""
        pdf_buffer = BytesIO()
        p = rl_canvas.Canvas(pdf_buffer, pagesize=letter)
        width, height = letter

        p.setFont("Helvetica-Bold", 24)
        p.setFillColor(colors.HexColor("#1a237e"))
        p.drawString(50, height - 80, "E-TICKET OFICIAL")

        p.setFont("Helvetica-Bold", 16)
        p.setFillColor(colors.black)
        p.drawString(50, height - 130, f"Evento: {event_name}")

        p.setFont("Helvetica", 12)
        p.drawString(50, height - 155, f"Fecha: {event_date}")
        p.drawString(50, height - 175, f"Lugar: {location}")

        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, height - 220, f"Tipo de Entrada: {ticket_name}")
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 240, f"Precio Pagado: ${price}")

        qr_buffer = _generate_qr_buffer(qr_payload)
        qr_image = ImageReader(qr_buffer)
        p.drawImage(qr_image, width - 200, height - 200, width=150, height=150)

        p.setFont("Helvetica-Bold", 12)
        p.setFillColor(colors.red)
        p.drawString(width - 185, height - 220, f"CÓDIGO: {emergency_code}")

        p.setFont("Helvetica-Oblique", 10)
        p.setFillColor(colors.gray)
        p.drawString(50, 50, "Este boleto es único e intransferible. Presente este documento en la entrada.")

        p.showPage()
        p.save()
        pdf_buffer.seek(0)
        return pdf_buffer

    @classmethod
    def generate_digital_ticket(cls, purchase_id, event, ticket_type, buyer_id):
        """Orquestador: Genera QR en Base64 y PDF oficial."""
        emergency_code = cls.generate_alphanumeric_code()
        qr_payload = f"VERIFY|TICKET:{purchase_id}|USER:{buyer_id}|CODE:{emergency_code}"

        qr_image_b64 = cls.generate_qr_b64(qr_payload)

        pdf_buffer = cls.generate_pdf_ticket(
            event_name=event.name,
            event_date=event.event_date.strftime("%Y-%m-%d"),
            location=event.location,
            ticket_name=ticket_type.name,
            price=ticket_type.price,
            emergency_code=emergency_code,
            qr_payload=qr_payload
        )

        pdf_b64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')

        return {
            "emergency_code": emergency_code,
            "qr_image_base64": f"data:image/png;base64,{qr_image_b64}",
            "pdf_document_base64": pdf_b64
        }


# ─────────────────────────────────────────────────────────────────────────────
# generate_ticket_pdf — versión estructurada de Ariana2 (con tablas y estilos)
# ─────────────────────────────────────────────────────────────────────────────

def generate_ticket_pdf(purchase):
    """
    Generar un PDF con los detalles de la entrada (ticket).

    Args:
        purchase: Objeto Purchase con los detalles de la compra

    Returns:
        bytes: Contenido del PDF en bytes
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    elements = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=30,
        alignment=1
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#374151'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#4b5563'),
        spaceAfter=6,
    )

    title = Paragraph("ENTRADA DIGITAL AL EVENTO", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2 * inch))

    event_info = Paragraph(f"<b>EVENTO:</b> {purchase.event.name}", heading_style)
    elements.append(event_info)

    data = [
        ["Fecha del Evento", f"{purchase.event.event_date.strftime('%d/%m/%Y')} a las {purchase.event.event_time.strftime('%H:%M')}"],
        ["Lugar", purchase.event.location],
        ["Zona", purchase.ticket_type.name],
        ["Tipo de Zona", purchase.ticket_type.get_zone_type_display() if hasattr(purchase.ticket_type, 'get_zone_type_display') else purchase.ticket_type.zone_type],
        ["Cantidad de Entradas", str(purchase.quantity)],
        ["Precio Total", f"${purchase.total_price}"],
    ]

    table = Table(data, colWidths=[2 * inch, 3.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
    ]))

    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))

    code_title = Paragraph("<b>CÓDIGO DE VALIDACIÓN</b>", heading_style)
    elements.append(code_title)

    backup_code_para = Paragraph(
        f"<font size=16><b>{purchase.backup_code}</b></font><br/><font size=9>Usa este código o el QR para ingresar al evento</font>",
        normal_style
    )
    elements.append(backup_code_para)
    elements.append(Spacer(1, 0.2 * inch))

    if purchase.qr_code:
        qr_title = Paragraph("<b>CÓDIGO QR</b>", heading_style)
        elements.append(qr_title)

        try:
            qr_bytes = base64.b64decode(purchase.qr_code)
            qr_buffer = io.BytesIO(qr_bytes)

            qr_image = Image(qr_buffer, width=2 * inch, height=2 * inch)
            elements.append(qr_image)
        except Exception:
            elements.append(Paragraph(
                "<i>No se pudo cargar la imagen QR. Usa el código alfanumérico.</i>",
                normal_style
            ))

    elements.append(Spacer(1, 0.3 * inch))

    footer = Paragraph(
        "<font size=8><i>Esta entrada es personal e intransferible. Presenta este documento o el código en la entrada del evento. "
        "Conserva este documento para referencia.</i></font>",
        normal_style
    )
    elements.append(footer)

    doc.build(elements)

    buffer.seek(0)
    return buffer.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# send_ticket_email — envío de entrada por correo (Ariana2)
# ─────────────────────────────────────────────────────────────────────────────

def send_ticket_email(user_email, purchase, user_name="Comprador"):
    """
    Enviar la entrada al correo del comprador como PDF adjunto.

    Args:
        user_email: Email del comprador
        purchase: Objeto Purchase
        user_name: Nombre del usuario (opcional)

    Returns:
        bool: True si se envió correctamente, False si hubo error
    """
    try:
        pdf_content = generate_ticket_pdf(purchase)

        subject = f"¡Tu entrada a {purchase.event.name} está lista! 🎟️"

        html_message = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                    .event-details {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }}
                    .code-section {{ background-color: white; padding: 20px; margin: 15px 0; text-align: center; border: 2px dashed #3b82f6; }}
                    .backup-code {{ font-size: 24px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; }}
                    .footer {{ font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Tu entrada está lista! 🎟️</h1>
                    </div>
                    <div class="content">
                        <p>Hola {user_name},</p>
                        <p>Gracias por tu compra. Tu entrada digital al evento está lista para usar.</p>
                        <div class="event-details">
                            <h2>{purchase.event.name}</h2>
                            <p><strong>Fecha:</strong> {purchase.event.event_date.strftime('%d de %B de %Y')} a las {purchase.event.event_time.strftime('%H:%M')}</p>
                            <p><strong>Lugar:</strong> {purchase.event.location}</p>
                            <p><strong>Zona:</strong> {purchase.ticket_type.name}</p>
                            <p><strong>Cantidad de entradas:</strong> {purchase.quantity}</p>
                        </div>
                        <div class="code-section">
                            <p><strong>Tu código de entrada:</strong></p>
                            <p class="backup-code">{purchase.backup_code}</p>
                            <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
                                Adjunto encontrarás el PDF con tu entrada junto al código QR y el código alfanumérico.
                                Presenta cualquiera de los dos en la entrada del evento.
                            </p>
                        </div>
                        <p><strong>Instrucciones para ingresar:</strong></p>
                        <ul>
                            <li>Descarga el PDF adjunto a tu dispositivo</li>
                            <li>Presenta el código QR o el código alfanumérico en la entrada del evento</li>
                            <li>Un validador escaneará o verificará tu código</li>
                        </ul>
                        <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <strong>Importante:</strong> Esta entrada es personal e intransferible.
                            Conserva el PDF en un lugar seguro.
                        </p>
                        <div class="footer">
                            <p>Este es un email automático, por favor no responder.</p>
                            <p>&copy; 2026 - Sistema de Gestión de Eventos</p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
        """

        email = EmailMessage(
            subject=subject,
            body=html_message,
            from_email='noreply@eventos.com',
            to=[user_email]
        )
        email.content_subtype = 'html'

        pdf_filename = f"entrada_{purchase.id}.pdf"
        email.attach(pdf_filename, pdf_content, 'application/pdf')

        email.send()

        purchase.email_sent_at = timezone.now()
        purchase.save(update_fields=['email_sent_at'])

        print(f"Email enviado exitosamente a {user_email} para la entrada {purchase.id}")
        return True

    except Exception as e:
        print(f"Error al enviar email: {str(e)}")
        return False
=======
    @staticmethod
    def generate_qr_b64(data):
        """Genera el QR y lo convierte a Base64 para enviarlo fácil por la API"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H, # Alta corrección de errores por si la pantalla brilla
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        
        # Devolvemos la imagen en texto plano (Base64) para el Frontend
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
        
    @classmethod
    def generate_digital_ticket(cls, purchase_id, event_name, buyer_id):
        """
        Servicio principal: Orquesta la creación del código de emergencia y el QR
        """
        # 1. Generar código alfanumérico de rescate
        emergency_code = cls.generate_alphanumeric_code()
        
        # 2. Armar la data segura que vivirá dentro del QR
        # Cuando el guardia escanee, su lector verá este texto:
        qr_payload = f"VERIFY|TICKET:{purchase_id}|USER:{buyer_id}|CODE:{emergency_code}"
        
        # 3. Crear la imagen del QR
        qr_image = cls.generate_qr_b64(qr_payload)
        
        return {
            "emergency_code": emergency_code,
            "qr_image_base64": f"data:image/png;base64,{qr_image}"
        }
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
