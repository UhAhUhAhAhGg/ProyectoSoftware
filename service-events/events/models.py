import uuid
import secrets
from django.db import models
from django.db.models import Count, OuterRef, Subquery, Value, Case, When, BooleanField, Exists
from django.db.models.functions import Coalesce
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

    # TIC-405: Gestión administrativa de eventos
    ADMIN_STATUS_CHOICES = [
        ('none', 'Sin intervención'),
        ('modified', 'Modificado por admin'),
        ('deactivated', 'Dado de baja por admin'),
    ]
    admin_status = models.CharField(
        max_length=20,
        choices=ADMIN_STATUS_CHOICES,
        default='none',
        db_index=True,
    )
    admin_reason = models.TextField(null=True, blank=True)

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


# ─── TIC-21: Recomendaciones personalizadas ──────────────────────────────────

class UserBehavior(models.Model):
    """
    TIC-358: Registra interacciones del usuario con eventos.
    Alimenta el motor de recomendaciones con señales de comportamiento.
    Acciones posibles: view (ver evento), favorite (marcar favorito), purchase (comprar).
    """
    ACTION_CHOICES = [
        ('view', 'Ver evento'),
        ('favorite', 'Marcar favorito'),
        ('purchase', 'Comprar'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='behaviors')
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User Behavior'
        verbose_name_plural = 'User Behaviors'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', 'action_type']),
            models.Index(fields=['user_id', 'event']),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.action_type} - {self.event.name}"


class UserPreference(models.Model):
    """
    TIC-359: Almacena el peso de preferencia de un usuario por categoría.
    El peso se actualiza dinámicamente según el comportamiento (TIC-360).
    Un peso mayor indica mayor afinidad con esa categoría.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='user_preferences')
    weight = models.FloatField(default=0.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Preference'
        verbose_name_plural = 'User Preferences'
        unique_together = ('user_id', 'category')
        indexes = [
            models.Index(fields=['user_id']),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.category.name}: {self.weight}"


# ─── TIC-21: Motor de recomendaciones ────────────────────────────────────────

class RecommendationEngine:
    """
    TIC-361/TIC-364: Motor de recomendaciones personalizadas.
    Cruza preferencias del usuario (UserPreference) con eventos futuros
    priorizando favoritos. Fallback para usuarios nuevos: eventos populares.
    """

    @staticmethod
    def get_fallback_events(limit=10):
        """
        TIC-364: Fallback para usuarios sin historial.
        Retorna eventos publicados próximos ordenados por popularidad.
        """
        return Event.objects.filter(
            event_date__gte=timezone.now().date(),
            status='published',
        ).annotate(
            total_interactions=Count('behaviors')
        ).order_by(
            '-total_interactions',
            'event_date',
        )[:limit]

    @staticmethod
    def get_recommendation_queryset(user_id):
        """
        TIC-361: Retorna recomendaciones personalizadas o fallback si es usuario nuevo.
        Priorización: favorito > afinidad categoría > popularidad global > fecha.
        """
        has_history = UserPreference.objects.filter(user_id=user_id).exists()

        if not has_history:
            return RecommendationEngine.get_fallback_events()

        weight_subquery = UserPreference.objects.filter(
            user_id=user_id,
            category_id=OuterRef('category_id'),
        ).values('weight')

        is_fav_subquery = UserFavorite.objects.filter(
            user_id=user_id,
            event_id=OuterRef('pk'),
        )

        return Event.objects.filter(
            event_date__gte=timezone.now().date(),
            status='published',
        ).annotate(
            category_affinity=Coalesce(Subquery(weight_subquery), Value(0.0)),
            is_favorite=Exists(is_fav_subquery),
            global_popularity=Count('behaviors'),
        ).order_by(
            '-is_favorite',
            '-category_affinity',
            '-global_popularity',
            'event_date',
        )


# ─── TIC-22: Notificaciones de match ─────────────────────────────────────────

class Notification(models.Model):
    """
    TIC-372: Historial de notificaciones enviadas al usuario.
    Soporta múltiples tipos: match de evento, turno en cola, compra confirmada.
    """
    TIPO_CHOICES = [
        ('new_event_match', 'Nuevo evento compatible'),
        ('waitlist_turn', 'Turno en lista de espera'),
        ('purchase_confirmed', 'Compra confirmada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
    )
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    leida_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id'], name='events_noti_user_id_a9380d_idx'),
            models.Index(fields=['user_id', 'leida'], name='events_noti_user_id_2dcfa8_idx'),
        ]

    def __str__(self):
        return f"{self.user_id} — {self.titulo}"


def generar_notificaciones_match(event):
    """
    TIC-373/TIC-374: Genera notificaciones para usuarios con afinidad a la categoría
    del evento recién publicado. Se ejecuta en thread para garantizar entrega <5min.

    Criterio de match: usuarios que tengan al menos 1 interacción previa
    (view, favorite, purchase) con un evento de la misma categoría.
    """
    import threading

    def _ejecutar():
        try:
            if not event.category:
                return

            user_ids_con_afinidad = UserBehavior.objects.filter(
                event__category=event.category,
            ).values_list('user_id', flat=True).distinct()

            notificaciones_a_crear = []
            for user_id in user_ids_con_afinidad:
                if str(user_id) == str(event.promoter_id):
                    continue

                ya_notificado = Notification.objects.filter(
                    user_id=user_id,
                    event=event,
                    tipo='new_event_match',
                ).exists()

                if not ya_notificado:
                    notificaciones_a_crear.append(Notification(
                        user_id=user_id,
                        event=event,
                        tipo='new_event_match',
                        titulo=f"Nuevo evento: {event.name}",
                        mensaje=(
                            f"Hay un nuevo evento de {event.category.name} "
                            f"que podría interesarte: '{event.name}' "
                            f"el {event.event_date.strftime('%d/%m/%Y')} en {event.location}."
                        ),
                        leida=False,
                    ))

            if notificaciones_a_crear:
                Notification.objects.bulk_create(notificaciones_a_crear)
                logger.info(
                    f"[TIC-373] {len(notificaciones_a_crear)} notificaciones "
                    f"generadas para evento '{event.name}'"
                )
        except Exception as e:
            logger.error(f"[TIC-373] Error al generar matches: {e}", exc_info=True)

    threading.Thread(target=_ejecutar, daemon=True).start()


class NotificationPreference(models.Model):
    """
    TIC-371: Preferencias de notificación por categoría por usuario.
    Si enabled=True, el usuario recibirá notificaciones de eventos de esa categoría.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='notification_preferences')
    enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'
        unique_together = ('user_id', 'category')
        indexes = [
            models.Index(fields=['user_id']),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.category.name}: {'on' if self.enabled else 'off'}"


# ─── TIC-21: Favoritos ───────────────────────────────────────────────────────

class UserFavorite(models.Model):
    """
    TIC-366: Eventos marcados como favoritos por un usuario.
    Combinación (user_id, event) única para evitar duplicados.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='favorited_by',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User Favorite'
        verbose_name_plural = 'User Favorites'
        unique_together = ('user_id', 'event')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id'], name='events_user_user_id_8b627f_idx'),
        ]

    def __str__(self):
        return f"{self.user_id} → {self.event.name}"


def registrar_comportamiento(user_id, event, action_type):
    """
    TIC-363: Helper para registrar interacciones (view, favorite, purchase)
    en UserBehavior. Útil desde cualquier view que necesite trackear señales.
    """
    try:
        UserBehavior.objects.create(
            user_id=user_id,
            event=event,
            action_type=action_type,
        )
    except Exception as e:
        logger.error(f"[TIC-363] Error al registrar comportamiento: {e}")


# ─── TIC-26: Auditoría de eventos ─────────────────────────────────────────────

class EventAuditLog(models.Model):
    """
    TIC-415: Registro completo de todas las intervenciones administrativas
    sobre eventos. Captura qué cambió, quién lo hizo y cuándo.

    Acciones posibles:
      - edit: Modificación de campos del evento
      - deactivate: Dar de baja el evento
      - reactivate: Reactivar evento previamente dado de baja
    """
    ACTION_CHOICES = [
        ('edit', 'Edición de campos'),
        ('deactivate', 'Dar de baja'),
        ('reactivate', 'Reactivar evento'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Evento intervenido
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='audit_logs',
    )
    event_name = models.CharField(max_length=200)  # snapshot del nombre al momento

    # Admin que ejecutó la acción
    admin_id = models.UUIDField(db_index=True)
    admin_email = models.EmailField()

    action = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
    reason = models.TextField(null=True, blank=True)

    # Snapshot de qué cambió (JSON-like string o texto libre)
    changed_fields = models.JSONField(null=True, blank=True)  # {campo: {old: x, new: y}}
    old_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Event Audit Log'
        verbose_name_plural = 'Event Audit Logs'
        ordering = ['-created_at']
        # TIC-416: Índices para consultas eficientes de auditoría
        indexes = [
            models.Index(fields=['event'], name='eaudit_event_idx'),
            models.Index(fields=['admin_id'], name='eaudit_admin_idx'),
            models.Index(fields=['action'], name='eaudit_action_idx'),
            models.Index(fields=['created_at'], name='eaudit_created_idx'),
            models.Index(fields=['event', 'created_at'], name='eaudit_event_date_idx'),
        ]

    def __str__(self):
        return f"{self.admin_email} → {self.action} | {self.event_name} | {self.created_at:%Y-%m-%d}"