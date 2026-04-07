import qrcode
from qrcode import constants
import base64
import random
import string
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors

class TicketGenerationService:
    @staticmethod
    def generate_alphanumeric_code(length=8):
        """Genera el código de emergencia (Ej: X7K9M2P4)"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choices(chars, k=length))

    @staticmethod
    def _generate_qr_buffer(data):
        """Método interno para generar el QR en memoria bruta (BytesIO)"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, "PNG")
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_qr_b64(cls, data):
        """Genera el QR y lo devuelve en Base64 para mostrar rápido en pantalla"""
        buffer = cls._generate_qr_buffer(data)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
        
    @classmethod
    def generate_pdf_ticket(cls, event_name, event_date, location, ticket_name, price, emergency_code, qr_payload):
        """
        Servicio para generar el PDF (Entrada Oficial) en memoria.
        """
        pdf_buffer = BytesIO()
        # Creamos un lienzo PDF tamaño carta
        p = canvas.Canvas(pdf_buffer, pagesize=letter)
        width, height = letter

        # --- DISEÑO DEL PDF ---
        # Título / Header
        p.setFont("Helvetica-Bold", 24)
        p.setFillColor(colors.HexColor("#1a237e")) # Un azul elegante
        p.drawString(50, height - 80, "E-TICKET OFICIAL")

        # Datos del Evento
        p.setFont("Helvetica-Bold", 16)
        p.setFillColor(colors.black)
        p.drawString(50, height - 130, f"Evento: {event_name}")
        
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 155, f"Fecha: {event_date}")
        p.drawString(50, height - 175, f"Lugar: {location}")
        
        # Datos de la Entrada
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, height - 220, f"Tipo de Entrada: {ticket_name}")
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 240, f"Precio Pagado: ${price}")

        # Generar e incrustar el código QR en el PDF
        qr_buffer = cls._generate_qr_buffer(qr_payload)
        qr_image = ImageReader(qr_buffer)
        # Dibujamos la imagen (x, y, ancho, alto)
        p.drawImage(qr_image, width - 200, height - 200, width=150, height=150)

        # Código de Emergencia debajo del QR
        p.setFont("Helvetica-Bold", 12)
        p.setFillColor(colors.red)
        p.drawString(width - 185, height - 220, f"CÓDIGO: {emergency_code}")

        # Mensaje de pie de página
        p.setFont("Helvetica-Oblique", 10)
        p.setFillColor(colors.gray)
        p.drawString(50, 50, "Este boleto es único e intransferible. Presente este documento en la entrada.")

        # Guardar el PDF
        p.showPage()
        p.save()
        
        # Preparar el buffer para ser leído
        pdf_buffer.seek(0)
        return pdf_buffer

    @classmethod
    def generate_digital_ticket(cls, purchase_id, event, ticket_type, buyer_id):
        """
        Orquestador: Genera tanto el QR rápido en Base64 como el documento PDF final.
        """
        emergency_code = cls.generate_alphanumeric_code()
        qr_payload = f"VERIFY|TICKET:{purchase_id}|USER:{buyer_id}|CODE:{emergency_code}"
        
        # 1. QR en base64 para mostrar de inmediato en la app/web
        qr_image_b64 = cls.generate_qr_b64(qr_payload)
        
        # 2. Archivo PDF para descargar o enviar por correo
        pdf_buffer = cls.generate_pdf_ticket(
            event_name=event.name,
            event_date=event.event_date.strftime("%Y-%m-%d"),
            location=event.location,
            ticket_name=ticket_type.name,
            price=ticket_type.price,
            emergency_code=emergency_code,
            qr_payload=qr_payload
        )
        
        # Convertimos el PDF a Base64 para que la API REST lo pueda enviar fácilmente
        pdf_b64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
        
        return {
            "emergency_code": emergency_code,
            "qr_image_base64": f"data:image/png;base64,{qr_image_b64}",
            "pdf_document_base64": pdf_b64
        }