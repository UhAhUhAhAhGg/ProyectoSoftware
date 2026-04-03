import uuid
from django.db import models


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
        total_sold = sum(
            ticket.current_sold 
            for ticket in self.tickettype_set.all()
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
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
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