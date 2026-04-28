# 🧹 US20 — Liberación Automática de Asientos No Pagados (CRON Job)

> **Estado:** ⏳ PENDIENTE — Se puede trabajar en paralelo con US18/US19
> **Rama:** Crear `feature/US20-barrendero-cron` partiendo de `Sprint3_DEV`
> **Story Points:** 13 SP | **Microservicio principal:** `service-queue`

---

## 📖 Historia de Usuario

> Como comprador, quiero que los asientos que seleccioné sean liberados automáticamente si no completo el pago a tiempo, para que otros compradores puedan adquirirlos.

---

## 📋 Prerequisitos antes de empezar

- [ ] US14 mergeada (necesitas `SeatReservation` y `QueueLog` en la BD)
- [ ] `service-queue` levantando correctamente

```bash
git checkout Sprint3_DEV
git pull origin Sprint3_DEV
git checkout -b feature/US20-barrendero-cron
```

---

## 🏗️ Plan de Implementación

### Paso 1 — Endpoint de liberación manual (base del job)

Antes del scheduler, crear el endpoint que hace la liberación para poder probarlo manualmente:

```
POST /api/v1/seats/release-expired/
```

Este endpoint:
1. Busca todas las `SeatReservation` con `status='active'` y `expires_at < now()`
2. Para cada una:
   - Cambia `SeatReservation.status` → `'expired'`
   - Llama a `service-events` para cambiar `Seat.status` → `'available'`
   - Registra el evento en `QueueLog`
   - Si US18 está implementada: llama a `admit_next_in_queue(event_id)`
3. Retorna un resumen de cuántos asientos fueron liberados

```python
# En queue_app/views.py
class ReleaseExpiredSeatsView(APIView):
    """
    POST /api/v1/seats/release-expired/
    Libera asientos cuya reserva expiró. Llamado por el scheduler cada 60s.
    También puede llamarse manualmente desde tests o admin.
    """
    # Sin autenticación JWT (solo llamado internamente por el scheduler)
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        from django.utils import timezone
        now = timezone.now()
        
        expired = SeatReservation.objects.filter(
            status='active',
            expires_at__lt=now
        )
        
        released_count = 0
        errors = []
        
        for reservation in expired:
            try:
                # 1. Marcar reserva como expirada
                reservation.status = 'expired'
                reservation.released_at = now
                reservation.save()
                
                # 2. Liberar el asiento en service-events vía HTTP
                _release_seat_in_events_service(str(reservation.seat_id))
                
                # 3. Registrar en QueueLog
                QueueLog.objects.create(
                    event_type='seat_released',
                    user_id=reservation.user_id,
                    seat_id=reservation.seat_id,
                    description=f"Reserva expirada tras {reservation.expires_at}"
                )
                
                released_count += 1
            except Exception as e:
                errors.append(str(e))
        
        return Response({
            "released": released_count,
            "errors": errors,
            "checked_at": now.isoformat()
        })


def _release_seat_in_events_service(seat_id: str):
    """
    Llama a service-events para cambiar el estado del Seat a 'available'.
    service-events debe tener un endpoint interno para esto.
    """
    import requests
    from django.conf import settings
    url = f"{settings.EVENTS_SERVICE_URL}/api/v1/seats/{seat_id}/release/"
    # Llamada sin token (endpoint interno entre servicios)
    resp = requests.post(url, timeout=5)
    resp.raise_for_status()
```

> **IMPORTANTE:** Debes añadir un endpoint `POST /api/v1/seats/{id}/release/` en `service-events` que no requiera JWT (solo llamadas internas). O bien, usar un token de servicio compartido.

### Paso 2 — Crear el endpoint de liberación en `service-events`

**Archivo:** `service-events/events/views.py` (añadir)

```python
class SeatInternalReleaseView(APIView):
    """
    POST /api/v1/seats/{seat_id}/internal-release/
    Endpoint interno para que service-queue libere un asiento.
    Solo accesible desde la red interna Docker (validar IP de origen o token de servicio).
    """
    permission_classes = []
    authentication_classes = []
    
    def post(self, request, seat_id):
        try:
            seat = Seat.objects.get(id=seat_id)
            seat.status = 'available'
            seat.reserved_by = None
            seat.reserved_at = None
            seat.save()
            return Response({"status": "released", "seat_id": str(seat_id)})
        except Seat.DoesNotExist:
            return Response({"error": "Seat not found"}, status=404)
```

Agregar a `service-events/events/urls.py`:
```python
path('seats/<uuid:seat_id>/internal-release/', SeatInternalReleaseView.as_view()),
```

### Paso 3 — Scheduler APScheduler en `service-queue`

APScheduler ya está en el `requirements.txt`. Configurarlo para que arranque con Django:

**Archivo nuevo:** `service-queue/queue_app/scheduler.py`

```python
"""
scheduler.py — Job scheduler para service-queue.
Despierta cada 60 segundos y llama al endpoint de liberación de asientos.
"""
import logging
import requests
from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings

logger = logging.getLogger(__name__)

def release_expired_seats_job():
    """Job que se ejecuta cada 60 segundos."""
    try:
        url = f"http://localhost:8000/api/v1/seats/release-expired/"
        resp = requests.post(url, timeout=10)
        data = resp.json()
        if data.get('released', 0) > 0:
            logger.info(f"[CRON] Asientos liberados: {data['released']}")
    except Exception as e:
        logger.error(f"[CRON] Error al liberar asientos: {e}")


def start_scheduler():
    """Inicia el scheduler en background. Llamar desde apps.py."""
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        release_expired_seats_job,
        trigger='interval',
        seconds=60,
        id='release_expired_seats',
        replace_existing=True
    )
    scheduler.start()
    logger.info("[CRON] Scheduler de liberación de asientos iniciado (cada 60s)")
```

**Arrancar el scheduler al iniciar Django** en `queue_app/apps.py`:

```python
class QueueAppConfig(AppConfig):
    name = 'queue_app'

    def ready(self):
        # Solo arrancar el scheduler en el proceso principal (no en reloader)
        import os
        if os.environ.get('RUN_MAIN') != 'true':
            from .scheduler import start_scheduler
            start_scheduler()
```

### Paso 4 — Crear `SeatReservation` al momento de la compra

Actualmente, cuando el usuario confirma asientos en `service-events`, se reservan con `Seat.status = 'reserved'`. Ahora también se debe crear el registro en `service-queue`.

**Dónde:** En `service-events/events/views.py`, dentro de `SeatBulkReserveView`, después de reservar los asientos, llamar a `service-queue`:

```python
# Tras hacer el bulk-reserve exitoso:
_register_seat_reservation_in_queue(
    seat_ids=[str(s.id) for s in seats],
    user_id=str(request.user.id),
    event_id=str(ticket_type.event_id),
    timeout_minutes=15  # O leer de QueueConfig si existe
)

def _register_seat_reservation_in_queue(seat_ids, user_id, event_id, timeout_minutes):
    """Registra la reserva en service-queue para el tracking de expiración."""
    import requests
    from django.conf import settings
    from django.utils import timezone
    from datetime import timedelta
    
    expires_at = (timezone.now() + timedelta(minutes=timeout_minutes)).isoformat()
    
    try:
        url = f"{settings.QUEUE_SERVICE_URL}/api/v1/seats/register-reservation/"
        for seat_id in seat_ids:
            requests.post(url, json={
                "seat_id": seat_id,
                "user_id": user_id,
                "event_id": event_id,
                "expires_at": expires_at
            }, timeout=3)
    except Exception:
        pass  # No bloquear la compra si service-queue no responde
```

También necesitas añadir `QUEUE_SERVICE_URL` a `service-events/events_config/settings.py`:
```python
QUEUE_SERVICE_URL = os.getenv('QUEUE_SERVICE_URL', 'http://localhost:8003')
```

Y en el `docker-compose.yml` agregar a `service-events`:
```yaml
QUEUE_SERVICE_URL: "http://service-queue:8000"
```

### Paso 5 — Frontend: Mensaje de reserva expirada

En `ModalPagoQR.jsx`, cuando el polling detecta que la compra expiró (status `cancelled`):

```jsx
if (purchaseStatus === 'cancelled') {
    showExpiredMessage(); // "Tu reserva expiró. Los asientos han sido liberados."
    onClose(); // Cerrar el modal
    refreshSeatMap(); // Recargar el mapa para mostrar asientos disponibles nuevamente
}
```

---

## 🛠️ Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `service-queue/queue_app/views.py` | MODIFICAR | Añadir `ReleaseExpiredSeatsView` y `RegisterReservationView` |
| `service-queue/queue_app/urls.py` | MODIFICAR | Añadir `/seats/release-expired/` y `/seats/register-reservation/` |
| `service-queue/queue_app/scheduler.py` | NUEVO | APScheduler que corre el job cada 60 segundos |
| `service-queue/queue_app/apps.py` | MODIFICAR | Arrancar el scheduler en `ready()` |
| `service-events/events/views.py` | MODIFICAR | Añadir `SeatInternalReleaseView` + llamada a queue al reservar |
| `service-events/events/urls.py` | MODIFICAR | Añadir ruta `/seats/{id}/internal-release/` |
| `service-events/events_config/settings.py` | MODIFICAR | Añadir `QUEUE_SERVICE_URL` |
| `docker-compose.yml` | MODIFICAR | Añadir `QUEUE_SERVICE_URL` a `service-events` |
| `frontend/src/components/dashboard/eventos/ModalPagoQR.jsx` | MODIFICAR | Mostrar mensaje de expiración |

---

## 🧪 Criterios de Aceptación

| PA | Descripción |
|----|-------------|
| PA1 | Al seleccionar asientos y entrar al pago → se registra `reserved_at` y `expires_at` |
| PA2 | Si paga antes del timeout → asientos pasan a `sold` definitivamente |
| PA3 | Si NO paga después del timeout → el scheduler libera los asientos automáticamente |
| PA4 | Al liberar asientos → el usuario ve "Tu reserva expiró. Los asientos han sido liberados" |
| PA5 | Al liberar asientos → el usuario recibe email de notificación |
| PA6 | Asientos liberados → otros compradores los ven disponibles inmediatamente |

---

## 🔗 Dependencias

- **Depende de:** US11 (modelo `Seat`) y US14 (modelo `SeatReservation`)
- **Paralela a:** US18 y US19 (no hay dependencia estricta)
