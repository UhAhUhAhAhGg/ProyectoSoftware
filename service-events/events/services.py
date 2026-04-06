import qrcode
import base64
from io import BytesIO
import random
import string

class TicketGenerationService:
    @staticmethod
    def generate_alphanumeric_code(length=8):
        """Genera el código de emergencia (Ej: X7K9M2P4)"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choices(chars, k=length))

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