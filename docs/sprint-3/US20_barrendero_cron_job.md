# HS-20 — El Barrendero: Liberación Automática de Asientos

> **Estado:** ✅ IMPLEMENTADA (Backend) — Rama `US20` lista para merge
> **TICs de Gustavo:** TIC-332, TIC-333
> **TICs de compañeros:** TIC-334, TIC-335 (Anghelo), TIC-336, TIC-337 (Anghelo/Frontend), TIC-338, TIC-339 (Alex), TIC-340 (Ariana)

---

## 📖 Historia de Usuario

> Como comprador, quiero que si no completo el pago dentro del tiempo establecido, mis asientos reservados se liberen automáticamente, para que otros usuarios puedan comprarlos.

---

## 🏗️ Cómo Funciona

```
Cada 60 segundos (daemon en background):

 Barrendero busca SeatReservation donde:
   status = 'active' AND expires_at < ahora
           │
           ▼
   Para cada reserva expirada:
   1. Marca reserva como 'expired' en queue_db
   2. Llama a service-events: POST /seats/release-expired/
      → Asiento vuelve a 'available' en events_db
   3. Admite al siguiente usuario en la cola del evento
   4. Registra en QueueLog (auditoría)
```

---

## ✅ Implementado

### Modelo `SeatReservation` (TIC-332)

El modelo ya incluye los campos necesarios desde la creación del `service-queue`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `reserved_at` | DateTimeField (auto) | Cuando el usuario empezó a seleccionar asientos |
| `expires_at` | DateTimeField | `reserved_at + payment_timeout_minutes` |
| `status` | CharField | `active`, `confirmed`, `expired` |
| `released_at` | DateTimeField (null) | Cuándo fue liberado por el barrendero |

### Comando `barrendero` (TIC-333)

**Archivo:** `service-queue/queue_app/management/commands/barrendero.py`

#### Uso

```bash
# Ejecución única (para pruebas manuales):
python manage.py barrendero

# Modo daemon continuo (producción):
python manage.py barrendero --daemon --interval 60

# Intervalo personalizado para pruebas (cada 10 segundos):
python manage.py barrendero --daemon --interval 10
```

#### Qué hace en cada ciclo

1. **Busca** todas las `SeatReservation` con `status='active'` y `expires_at < ahora`
2. **Marca** cada reserva como `status='expired'` y guarda `released_at`
3. **Notifica** a `service-events` via `POST /api/v1/seats/release-expired/` para cambiar el asiento a `available`
4. **Busca** si el usuario tenía una entrada admitida en `QueueEntry` → la marca como `expired`
5. **Admite** al siguiente usuario en cola (`status='waiting'`) del mismo evento
6. **Desactiva** la cola si ya no quedan usuarios en espera (`is_queue_active = False`)
7. **Registra** cada acción en `QueueLog` para auditoría

### Entrypoint Docker

**Archivo:** `service-queue/entrypoint.sh`

```bash
#!/bin/sh
python manage.py migrate --noinput
python manage.py barrendero --daemon --interval 60 &   # proceso background
exec python manage.py runserver 0.0.0.0:8000           # proceso principal
```

El barrendero arranca automáticamente junto con Docker. No requiere configuración adicional.

---

## 📂 Archivos Creados/Modificados

| Archivo | Acción |
|---------|--------|
| `service-queue/queue_app/management/__init__.py` | NUEVO |
| `service-queue/queue_app/management/commands/__init__.py` | NUEVO |
| `service-queue/queue_app/management/commands/barrendero.py` | NUEVO — Job completo |
| `service-queue/Dockerfile` | MODIFICADO — Usa `entrypoint.sh` |
| `service-queue/entrypoint.sh` | NUEVO — Arranca barrendero + Django |

---

## 🧪 Cómo Probar

```bash
# 1. Crear una reserva de asiento que expire en 1 minuto (via API o shell)
docker compose exec service-queue python manage.py shell
>>> from queue_app.models import SeatReservation
>>> from django.utils import timezone
>>> import datetime, uuid
>>> SeatReservation.objects.create(
...   seat_id=uuid.uuid4(),
...   user_id=uuid.uuid4(),
...   expires_at=timezone.now() + datetime.timedelta(minutes=1)
... )

# 2. Esperar 1 minuto y ejecutar el barrendero una vez:
docker compose exec service-queue python manage.py barrendero
# Output: "[Barrendero] 14:30:00 — 1 asiento(s) liberado(s) en 0.05s"

# 3. Verificar en QueueLog:
>>> from queue_app.models import QueueLog
>>> QueueLog.objects.filter(event_type='seat_released').count()
1
```

---

## 📋 Pendiente (Compañeros)

| TIC | Asignado | Descripción |
|-----|---------|-------------|
| TIC-334 | Anghelo | Backend: Lógica `if (ahora - inicio) > timeout → marcar expirada` |
| TIC-335 | Anghelo | Backend: Cambiar asiento de `reserved` a `available` en service-events |
| TIC-336 | Anghelo | Frontend: Mostrar mensaje "Tiempo agotado, asientos liberados" |
| TIC-337 | Anghelo | Frontend-Backend: Notificación por email al usuario |
| TIC-338 | Alex | Backend: Permitir que otros compren asientos liberados inmediatamente |
| TIC-339 | Alex | Backend: Audit log de qué asientos fueron liberados, cuándo y por qué |
| TIC-340 | Ariana | PA: Verificar registro de `tiempo_reserva_inicio` y `timeout = 15 min` |
