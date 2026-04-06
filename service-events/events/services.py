import io
from django.core.mail import EmailMessage
from django.utils import timezone
from django.template.loader import render_to_string
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import base64
from .models import Purchase


def generate_ticket_pdf(purchase):
    """
    Generar un PDF con los detalles de la entrada (ticket).
    
    Args:
        purchase: Objeto Purchase con los detalles de la compra
        
    Returns:
        bytes: Contenido del PDF en bytes
    """
    buffer = io.BytesIO()
    
    # Crear documento PDF
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
    )
    
    # Storage para elementos del documento
    elements = []
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=30,
        alignment=1  # centered
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
    
    # 🎟️ Título
    title = Paragraph("ENTRADA DIGITAL AL EVENTO", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # 📋 Información del evento
    event_info = Paragraph(f"<b>EVENTO:</b> {purchase.event.name}", heading_style)
    elements.append(event_info)
    
    # Detalles con tabla
    data = [
        ["Fecha del Evento", f"{purchase.event.event_date.strftime('%d/%m/%Y')} a las {purchase.event.event_time.strftime('%H:%M')}"],
        ["Lugar", purchase.event.location],
        ["Zona", purchase.ticket_type.name],
        ["Tipo de Zona", purchase.ticket_type.get_zone_type_display() if hasattr(purchase.ticket_type, 'get_zone_type_display') else purchase.ticket_type.zone_type],
        ["Cantidad de Entradas", str(purchase.quantity)],
        ["Precio Total", f"${purchase.total_price}"],
    ]
    
    table = Table(data, colWidths=[2*inch, 3.5*inch])
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
    elements.append(Spacer(1, 0.3*inch))
    
    # 🔐 Código de validación
    code_title = Paragraph("<b>CÓDIGO DE VALIDACIÓN</b>", heading_style)
    elements.append(code_title)
    
    backup_code_para = Paragraph(
        f"<font size=16><b>{purchase.backup_code}</b></font><br/><font size=9>Usa este código o el QR para ingresar al evento</font>",
        normal_style
    )
    elements.append(backup_code_para)
    elements.append(Spacer(1, 0.2*inch))
    
    # 📱 QR Code (si está disponible)
    if purchase.qr_code:
        qr_title = Paragraph("<b>CÓDIGO QR</b>", heading_style)
        elements.append(qr_title)
        
        # Decodificar el QR de base64 a bytes
        try:
            qr_bytes = base64.b64decode(purchase.qr_code)
            qr_buffer = io.BytesIO(qr_bytes)
            
            qr_image = Image(qr_buffer, width=2*inch, height=2*inch)
            elements.append(qr_image)
        except Exception:
            elements.append(Paragraph(
                "<i>No se pudo cargar la imagen QR. Usa el código alfanumérico.</i>",
                normal_style
            ))
    
    elements.append(Spacer(1, 0.3*inch))
    
    # ⚠️ Términos
    footer = Paragraph(
        "<font size=8><i>Esta entrada es personal e intransferible. Presenta este documento o el código en la entrada del evento. "
        "Conserva este documento para referencia.</i></font>",
        normal_style
    )
    elements.append(footer)
    
    # Construir el documento
    doc.build(elements)
    
    # Obtener el contenido en bytes
    buffer.seek(0)
    return buffer.getvalue()


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
        # Generar PDF
        pdf_content = generate_ticket_pdf(purchase)
        
        # Crear email
        subject = f"¡Tu entrada a {purchase.event.name} está lista! 🎟️"
        
        # HTML del email
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
                    .button {{ background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }}
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
        
        # Crear el email
        email = EmailMessage(
            subject=subject,
            body=html_message,
            from_email='noreply@eventos.com',
            to=[user_email]
        )
        
        # Marcar como HTML
        email.content_subtype = 'html'
        
        # Adjuntar PDF
        pdf_filename = f"entrada_{purchase.id}.pdf"
        email.attach(pdf_filename, pdf_content, 'application/pdf')
        
        # Enviar email
        email.send()
        
        # Registrar el envío
        purchase.email_sent_at = timezone.now()
        purchase.save(update_fields=['email_sent_at'])
        
        print(f"Email enviado exitosamente a {user_email} para la entrada {purchase.id}")
        return True
        
    except Exception as e:
        print(f"Error al enviar email: {str(e)}")
        return False
