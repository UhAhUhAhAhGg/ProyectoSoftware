"""
models.py — Modelos de base de datos para service-queue.

Todos los IDs de referencia a otros microservicios (user_id, event_id,
ticket_type_id, purchase_id) son UUIDs almacenados como CharField, SIN
Foreign Keys SQL entre servicios (arquitectura de microservicios desacoplada).
"""

import uuid
from django.db import models


class QueueConfig(models.Model):
    """
    Configuración de cola virtual por evento.
    Creada/actualizada por el Promotor del evento (US14).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Referencia lógica a Event en service-events (sin FK real entre servicios)
    event_id = models.UUIDField(unique=True, db_index=True)

    # Umbral: número máximo de usuarios simultáneos antes de activar la cola
    max_concurrent_users = models.PositiveIntegerField(
        default=100,
        help_text="Usuarios simultáneos permitidos antes de activar la cola de espera."
    )

    # Minutos máximos que un usuario tiene para completar el pago antes de liberar asientos
    payment_timeout_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Minutos para completar el pago antes de liberar los asientos reservados."
    )

    # Estado actual de la cola (se activa automáticamente en US18)
    is_queue_active = models.BooleanField(
        default=False,
        help_text="True si la cola está actualmente activa para este evento."
    )

    # Auditoría: quién configuró esto (UUID del promotor)
    updated_by = models.UUIDField(
        null=True, blank=True,
        help_text="UUID del Promotor que realizó la última configuración."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'queue_config'
        verbose_name = 'Configuración de Cola'
        verbose_name_plural = 'Configuraciones de Cola'

    def __str__(self):
        return f"QueueConfig(event={self.event_id}, umbral={self.max_concurrent_users}, activa={self.is_queue_active})"


class SeatReservation(models.Model):
    """
    Reserva temporal de un asiento durante el proceso de pago.
    Se crea cuando el usuario selecciona asientos y confirma con 'Comprar'.
    Expira automáticamente si no completa el pago en payment_timeout_minutes (US20).

    Referencias lógicas (sin FK entre microservicios):
      - seat_id      → Seat.id     en service-events
      - purchase_id  → Purchase.id en service-events (nullable si expiró antes del pago)
    """
    STATUS_CHOICES = [
        ('active', 'Activa'),
        ('confirmed', 'Confirmada (pago completado)'),
        ('expired', 'Expirada (timeout)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Referencia lógica al asiento en service-events
    seat_id = models.UUIDField(db_index=True)

    # Referencia lógica al usuario en service-auth
    user_id = models.UUIDField(db_index=True)

    # Referencia lógica a la compra en service-events (se llena al confirmar el pago)
    purchase_id = models.UUIDField(
        null=True, blank=True,
        help_text="Se llena cuando el pago se completa. NULL si la reserva expiró."
    )

    reserved_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text="Calculado como reserved_at + payment_timeout_minutes de QueueConfig."
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    released_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Se llena cuando la reserva expira y el asiento es liberado (job US20)."
    )

    class Meta:
        db_table = 'seat_reservation'
        verbose_name = 'Reserva de Asiento'
        verbose_name_plural = 'Reservas de Asientos'
        # Un asiento solo puede tener una reserva activa a la vez
        indexes = [
            models.Index(fields=['seat_id', 'status']),
        ]

    def __str__(self):
        return f"SeatReservation(seat={self.seat_id}, user={self.user_id}, status={self.status})"

    @property
    def is_expired(self):
        from django.utils import timezone
        return self.status == 'active' and timezone.now() > self.expires_at


class QueueEntry(models.Model):
    """
    Posición de un usuario en la cola de espera para un evento (US18).
    """
    STATUS_CHOICES = [
        ('waiting', 'En espera'),
        ('admitted', 'Admitido'),
        ('expired', 'Expirado'),
        ('left', 'Abandonó'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Referencias lógicas (sin FK entre microservicios)
    user_id = models.UUIDField(db_index=True)
    event_id = models.UUIDField(db_index=True)

    # Posición calculada en la cola (se recalcula dinámicamente, pero se guarda como snapshot)
    position = models.PositiveIntegerField(default=0)

    joined_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Cuándo fue notificado de que es su turno."
    )
    accessed_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Cuándo accedió efectivamente a la selección de asientos."
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')

    class Meta:
        db_table = 'queue_entry'
        verbose_name = 'Entrada en Cola'
        verbose_name_plural = 'Entradas en Cola'
        # Un usuario solo puede estar una vez en la cola de un evento
        unique_together = [('user_id', 'event_id')]

    def __str__(self):
        return f"QueueEntry(user={self.user_id}, event={self.event_id}, pos={self.position}, status={self.status})"


class QueueLog(models.Model):
    """
    Registro de auditoría de eventos del sistema de cola (US20).
    """
    EVENT_TYPES = [
        ('seat_released', 'Asiento liberado por timeout'),
        ('user_admitted', 'Usuario admitido desde cola'),
        ('reservation_expired', 'Reserva expirada'),
        ('queue_activated', 'Cola activada'),
        ('queue_deactivated', 'Cola desactivada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)

    # Todos opcionales según el tipo de evento
    user_id = models.UUIDField(null=True, blank=True)
    event_id = models.UUIDField(null=True, blank=True)
    seat_id = models.UUIDField(null=True, blank=True)
    queue_entry_id = models.UUIDField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'queue_log'
        verbose_name = 'Log de Cola'
        verbose_name_plural = 'Logs de Cola'
        ordering = ['-created_at']

    def __str__(self):
        return f"QueueLog({self.event_type} @ {self.created_at})"
