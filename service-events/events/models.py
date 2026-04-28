import uuid
import secrets
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
import requests
import logging
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

def generate_backup_code():
    """Generar código alfanumérico único para respaldo"""
    return secrets.token_hex(5).upper()


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Event(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    promoter_id = models.UUIDField()
    name = models.CharField(max_length=200)
    description = models.TextField()
    event_date = models.DateField()
    event_time = models.TimeField()
    location = models.CharField(max_length=255)
    capacity = models.IntegerField()
    image = models.ImageField(upload_to='events/images/', null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    ticket_types: models.Manager["TicketType"]

    # Campos de cancelación (TIC-9 / TIC-210 / TIC-229)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.UUIDField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)

    # Lista de espera
    waitlist_threshold = models.IntegerField(default=90)  # porcentaje
    waitlist_active = models.BooleanField(default=False)

    # Cola virtual: minutos para entrar cuando es su turno
    queue_timeout = models.IntegerField(default=10)
    # Timeout de pago en minutos
    payment_timeout_minutes = models.IntegerField(default=15)

    class Meta:
        verbose_name = 'Event'
        verbose_name_plural = 'Events'
        ordering = ['-event_date']
        indexes = [
            models.Index(fields=['promoter_id']),
            models.Index(fields=['event_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return self.name

    @property
    def is_upcoming(self):
        return self.event_date >= timezone.now().date()

    @property
    def is_full(self):
        total_sold = sum(
            ticket.current_sold
            for ticket in self.ticket_types.all()
        )
        return total_sold >= self.capacity


class TicketType(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('sold_out', 'Sold Out'),
    ]

    ZONE_TYPE_CHOICES = [
        ('general', 'General'),
        ('platea', 'Platea'),
        ('preferencial', 'Preferencial'),
        ('vip', 'VIP'),
        ('palco', 'Palco'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_types')
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    max_capacity = models.IntegerField()
    zone_type = models.CharField(max_length=30, choices=ZONE_TYPE_CHOICES, default='general')
    is_vip = models.BooleanField(default=False)
    seat_rows = models.PositiveIntegerField(null=True, blank=True)
    seats_per_row = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='active')
    current_sold = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Ticket Type'
        verbose_name_plural = 'Ticket Types'
        unique_together = ('event', 'name')
        ordering = ['event', 'name']
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.name} - {self.event.name}"

    @property
    def available_capacity(self):
        """
        HU: Liberar asientos si no se completó el pago.
        Calcula la capacidad real consultando en tiempo real las compras.
        Suma solo las compras 'active' (pagadas) y 'pending' (dentro de los 15 min).
        Las compras 'expired' son ignoradas, liberando su espacio automáticamente.
        """
        vendidos_o_reservados = self.purchase_set.filter(
            status__in=['active', 'pending']
        ).aggregate(
            total=models.Sum('quantity')
        )['total'] or 0

        return self.max_capacity - vendidos_o_reservados

    @property
    def configured_seats(self):
        if self.seat_rows and self.seats_per_row:
            return self.seat_rows * self.seats_per_row
        return None

    @property
    def is_available(self):
        return self.status == 'active' and self.available_capacity > 0


class Purchase(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('used', 'Used'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user_id = models.UUIDField()
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    ticket_type = models.ForeignKey(TicketType, on_delete=models.CASCADE)

    quantity = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Campos para entrada digital
    qr_code = models.TextField(null=True, blank=True)
    backup_code = models.CharField(max_length=20, unique=True, db_index=True, null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    used_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.UUIDField(null=True, blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['backup_code']),
            models.Index(fields=['user_id']),
            models.Index(fields=['status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user_id', 'event'],
                condition=models.Q(status__in=['active', 'pending']),
                name='unique_active_purchase_per_user_event'
            )
        ]

    def release_seats(self):
        """
        Libera asientos y registra audit log
        """
        if hasattr(self, 'allocated_seats'):
            seats = self.allocated_seats.all()

            if seats.exists():
                for seat in seats:
                    SeatAuditLog.objects.create(
                        seat=seat,
                        purchase=self,
                        action='released',
                        reason='Compra expirada'
                    )

                seats.update(status='available', purchase=None)
                return True

        return False

    def get_user_email(self):
        """
        Hace una petición interna HTTP a service-profiles para obtener el email.
        """
        base_url = getattr(settings, 'PROFILE_SERVICE_URL', 'http://localhost:8002')
        url = f"{base_url}/api/profiles/{self.user_id}/"

        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get('email') or data.get('user', {}).get('email')
            else:
                logger.error(f"Error HTTP {response.status_code} al consultar el perfil {self.user_id}")
        except requests.RequestException as e:
            logger.error(f"Error de conexión con service-profiles: {e}")

        return None

    def send_expiration_email(self):
        """
        HU Subtarea: Enviar notificación por email al usuario que perdió asientos.
        """
        user_email = self.get_user_email()

        if not user_email:
            logger.warning(f"No se pudo enviar el correo de expiración: Email no encontrado para user_id {self.user_id}")
            return False

        asunto = "Tiempo agotado - Asientos liberados"
        mensaje = (
            f"Hola,\n\n"
            f"Te informamos que el tiempo de 15 minutos para completar el pago de tu "
            f"orden para el evento '{self.event.name}' ha concluido.\n\n"
            f"Por tal motivo, los asientos han sido liberados y tu orden ha sido cancelada.\n"
            f"Si aún deseas asistir, por favor genera una nueva compra en la plataforma.\n\n"
            f"Saludos,\n"
            f"El equipo de Tickets"
        )

        try:
            send_mail(
                subject=asunto,
                message=mensaje,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            logger.info(f"Correo de expiración enviado con éxito a {user_email}")
            return True
        except Exception as e:
            logger.error(f"Error al enviar email de expiración a {user_email}: {str(e)}")
            return False

    def check_expiration(self):
        """
        HU: Liberar asientos y notificar al usuario.
        """
        # 👇 CAMBIADO A 1 MINUTO PARA PRUEBAS (cambiar a 15 para produccion)
        timeout_limit = self.created_at + timedelta(minutes=1)

        if self.status == 'pending' and timezone.now() > timeout_limit:
            self.status = 'expired'
            self.save(update_fields=['status'])

            self.release_seats()
            self.send_expiration_email()

            return True

        return False


class Waitlist(models.Model):
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('notified', 'Notified'),
        ('converted', 'Converted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    user_id = models.UUIDField()

    position = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position']
        unique_together = ('event', 'user_id')


class BlacklistedToken(models.Model):
    token = models.TextField(unique=True)
    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.token[:20]


class PaymentOrder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('completed', 'Completado'),
        ('failed', 'Fallido'),
        ('cancelled', 'Cancelado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Payment Order'
        verbose_name_plural = 'Payment Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Order {self.id} - {self.status}"


class TicketInstance(models.Model):

    STATUS_CHOICES = [
        ('valid', 'Válida'),
        ('used', 'Usada'),
        ('cancelled', 'Cancelada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(PaymentOrder, on_delete=models.CASCADE, related_name='tickets')
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    ticket_type = models.ForeignKey(TicketType, on_delete=models.CASCADE)

    qr_code = models.TextField(null=True, blank=True)
    backup_code = models.CharField(max_length=20, unique=True, db_index=True, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valid')

    used_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ticket Instance'
        verbose_name_plural = 'Ticket Instances'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['backup_code']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Ticket {self.backup_code} - {self.event.name}"


# ─── TIC-11: Gestión de asientos individuales ────────────────────────────────

class Seat(models.Model):
    """
    Representa un asiento físico individual dentro de una zona (TicketType).
    Los asientos se generan automáticamente al configurar filas x asientos_por_fila
    en un TicketType. Esta tabla es la fuente de verdad del estado de cada asiento.
    """
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('reserved', 'Reserved'),    # Reserva temporal (sin pago confirmado)
        ('sold', 'Sold'),            # Pago confirmado
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_type = models.ForeignKey(
        TicketType,
        on_delete=models.CASCADE,
        related_name='seats',
    )
    seat_code = models.CharField(max_length=20)
    row_label = models.CharField(max_length=5)
    seat_number = models.PositiveIntegerField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='available',
        db_index=True,
    )

    reserved_at = models.DateTimeField(null=True, blank=True)
    reserved_by = models.UUIDField(null=True, blank=True)

    # Relación con la compra actual (si está reservado o vendido)
    purchase = models.ForeignKey(
        'Purchase',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='allocated_seats'
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Seat'
        verbose_name_plural = 'Seats'
        unique_together = ('ticket_type', 'seat_code')
        ordering = ['row_label', 'seat_number']
        indexes = [
            models.Index(fields=['ticket_type', 'status']),
        ]

    def __str__(self):
        return f"{self.seat_code} ({self.get_status_display()}) — {self.ticket_type.name}"


class SeatAuditLog(models.Model):
    ACTION_CHOICES = [
        ('released', 'Released'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    seat = models.ForeignKey('Seat', on_delete=models.CASCADE)
    purchase = models.ForeignKey('Purchase', on_delete=models.SET_NULL, null=True, blank=True)

    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    reason = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.seat} - {self.action} - {self.created_at}"