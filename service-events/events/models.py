import uuid
import secrets
from django.db import models
from django.db import models
from django.utils import timezone
from datetime import timedelta


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
    
    # Timeout de pago en minutos para la cola virtual
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
        from django.utils import timezone
        return self.event_date >= timezone.now().date()

    @property
    def is_full(self):
        # Asegúrate de usar ticket_types porque le agregamos related_name='ticket_types' abajo
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
        return self.max_capacity - self.current_sold

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
        unique_together = ('event', 'user_id')  # no duplicados


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
    user_id = models.UUIDField() # Relacionado con el microservicio de usuarios
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
    
    # Datos únicos de esta entrada en particular
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
    # Código legible: "A-1", "B-5", etc.
    seat_code = models.CharField(max_length=20)
    row_label = models.CharField(max_length=5)       # "A", "B", "C"...
    seat_number = models.PositiveIntegerField()       # 1, 2, 3...

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='available',
        db_index=True,
    )

    # Timestamp de reserva (para liberar si no se confirma el pago)
    reserved_at = models.DateTimeField(null=True, blank=True)
    # Quién lo reservó (UUID lógico, sin FK entre microservicios)
    reserved_by = models.UUIDField(null=True, blank=True)

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
