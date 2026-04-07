import uuid
from django.db import models
from django.db import models
from django.utils import timezone
from datetime import timedelta

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


class TicketInstance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_type = models.ForeignKey(TicketType, on_delete=models.CASCADE)
    qr_code_data = models.CharField(max_length=255, unique=True)
    emergency_code = models.CharField(max_length=20, unique=True)
    is_used = models.BooleanField(default=False)
    validated_at = models.DateTimeField(null=True, blank=True)
    
    # Relación con el usuario comprador 
    buyer_id = models.UUIDField() 

    def __str__(self):
        return f"{self.ticket_type.name} - {'USADA' if self.is_used else 'ACTIVA'}"
class PaymentOrder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('paid', 'Pagado'),
        ('expired', 'Expirado'),
        ('cancelled', 'Cancelado')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # El usuario que está intentando comprar
    buyer_id = models.UUIDField() 
    # Qué entrada está intentando comprar
    ticket_type = models.ForeignKey(TicketType, on_delete=models.CASCADE)
    # Cuántas entradas quiere
    quantity = models.PositiveIntegerField(default=1)
    # Cuánto tiene que pagar en total
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Estado y tiempos de vida (El corazón de tu historia de usuario)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Payment Order'
        verbose_name_plural = 'Payment Orders'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Magia pura: Si es una orden nueva, le asignamos 15 minutos de vida desde AHORA
        if not self.id and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=15)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Devuelve True si ya pasaron los 15 minutos y no ha pagado"""
        if self.status == 'paid':
            return False
            
        # Agregamos esta validación para que Pylance esté feliz
        if self.expires_at is None:
            return False 
            
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Orden {self.id} - Estado: {self.status}"    