"""
TIC-333: Scheduled job que revisa compras no pagadas y libera asientos expirados.

Ejecutar manualmente:
    python manage.py barrendero

Ejecutar en bucle continuo (modo daemon):
    python manage.py barrendero --daemon

En Docker, este comando se inicia como proceso secundario desde el entrypoint
o como un segundo proceso en el Dockerfile. Ver docs/US20_barrendero_cron_job.md.
"""

import time
import logging
import requests
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

from queue_app.models import SeatReservation, QueueEntry, QueueConfig, QueueLog

logger = logging.getLogger('barrendero')


def _liberar_asientos_expirados():
    """
    TIC-333: Revisa todas las SeatReservations activas cuyo expires_at ya pasó.
    Las marca como 'expired', registra el released_at y notifica a service-events
    para que libere el asiento (estado: available).

    Retorna la cantidad de reservas liberadas.
    """
    ahora = timezone.now()
    expiradas = SeatReservation.objects.filter(
        status='active',
        expires_at__lt=ahora,
    )

    count = 0
    for reserva in expiradas:
        # 1. Marcar la reserva como expirada localmente
        reserva.status = 'expired'
        reserva.released_at = ahora
        reserva.save()

        # 2. Notificar a service-events para liberar el asiento físico
        _notificar_liberacion_a_service_events(reserva)

        # 3. Admitir al siguiente en la cola (si aplica)
        _admitir_siguiente_en_cola(reserva)

        # 4. Guardar en audit log
        QueueLog.objects.create(
            event_type='seat_released',
            user_id=reserva.user_id,
            seat_id=reserva.seat_id,
            description=f"Asiento liberado por timeout. Reserva ID: {reserva.id}",
        )

        count += 1
        logger.info(f"[Barrendero] Asiento {reserva.seat_id} liberado (usuario: {reserva.user_id})")

    return count


def _notificar_liberacion_a_service_events(reserva: SeatReservation):
    """
    Llama a service-events para cambiar el estado del asiento de 'reserved' a 'available'.
    Usa un service-to-service token si está configurado, o llama directamente.
    """
    events_url = getattr(settings, 'EVENTS_SERVICE_URL', 'http://localhost:8002')
    try:
        resp = requests.post(
            f"{events_url}/api/v1/seats/release-expired/",
            json={"seat_id": str(reserva.seat_id)},
            timeout=5,
        )
        if resp.status_code not in (200, 204):
            logger.warning(
                f"[Barrendero] service-events respondió {resp.status_code} "
                f"al liberar asiento {reserva.seat_id}"
            )
    except requests.RequestException as e:
        logger.error(f"[Barrendero] Error comunicando con service-events: {e}")


def _admitir_siguiente_en_cola(reserva: SeatReservation):
    """
    Cuando se libera un asiento, busca si hay alguien esperando en la cola
    para el mismo evento y lo admite (cambia status a 'admitted').
    """
    # Necesitamos el event_id del asiento. SeatReservation no guarda event_id directamente,
    # pero QueueEntry sí tiene user_id+seat_id vinculado. Buscamos por user_id para
    # encontrar el event_id de la entrada de cola que expiró.
    try:
        # Obtener la entrada de cola del usuario que perdió el asiento
        entrada_expirada = QueueEntry.objects.get(
            user_id=reserva.user_id,
            status='admitted',
        )
        event_id = entrada_expirada.event_id

        # Marcar la entrada como expirada para liberar el cupo
        entrada_expirada.status = 'expired'
        entrada_expirada.save()

        # Admitir al siguiente en la cola de ese evento
        siguiente = QueueEntry.objects.filter(
            event_id=event_id,
            status='waiting',
        ).order_by('joined_at').first()

        if siguiente:
            siguiente.status = 'admitted'
            siguiente.notified_at = timezone.now()
            siguiente.accessed_at = timezone.now()
            siguiente.save()

            QueueLog.objects.create(
                event_type='user_admitted',
                user_id=siguiente.user_id,
                event_id=siguiente.event_id,
                queue_entry_id=siguiente.id,
                description=f"Usuario admitido desde cola. Posición anterior: {siguiente.position}",
            )
            logger.info(
                f"[Barrendero] Usuario {siguiente.user_id} admitido "
                f"desde cola para evento {event_id}"
            )

            # Si no quedan más en espera, desactivar la cola
            restantes = QueueEntry.objects.filter(
                event_id=event_id, status='waiting'
            ).count()
            if restantes == 0:
                QueueConfig.objects.filter(event_id=event_id).update(is_queue_active=False)
                QueueLog.objects.create(
                    event_type='queue_deactivated',
                    event_id=event_id,
                    description="Cola desactivada: no quedan usuarios en espera.",
                )

    except QueueEntry.DoesNotExist:
        pass  # El usuario no estaba en la cola del sistema virtual
    except QueueEntry.MultipleObjectsReturned:
        pass  # Caso edge: varios registros, ignorar


class Command(BaseCommand):
    help = (
        "TIC-333: Barrendero — Revisa cada 60 segundos las reservas de asientos "
        "expiradas y las libera automáticamente."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--daemon',
            action='store_true',
            help='Ejecutar en bucle continuo (cada 60 segundos). Sin este flag, corre una sola vez.',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Intervalo en segundos entre cada barrido (default: 60).',
        )

    def handle(self, *args, **options):
        daemon = options['daemon']
        interval = options['interval']

        self.stdout.write(self.style.SUCCESS(
            f"[Barrendero] Iniciando. Modo: {'daemon' if daemon else 'una sola vez'}. "
            f"Intervalo: {interval}s"
        ))

        if daemon:
            self.stdout.write("[Barrendero] Corriendo en bucle continuo. Ctrl+C para detener.")
            while True:
                self._run_sweep()
                time.sleep(interval)
        else:
            self._run_sweep()

    def _run_sweep(self):
        """Ejecuta un ciclo de limpieza."""
        inicio = timezone.now()
        try:
            liberadas = _liberar_asientos_expirados()
            elapsed = (timezone.now() - inicio).total_seconds()
            self.stdout.write(
                self.style.SUCCESS(
                    f"[Barrendero] {inicio.strftime('%H:%M:%S')} — "
                    f"{liberadas} asiento(s) liberado(s) en {elapsed:.2f}s"
                )
            )
        except Exception as e:
            logger.error(f"[Barrendero] Error en el barrido: {e}", exc_info=True)
            self.stderr.write(self.style.ERROR(f"[Barrendero] Error: {e}"))
