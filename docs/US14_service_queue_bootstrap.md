# 🏗️ US14 — Configuración de Umbral de Cola Virtual

> **Estado:** 🔄 EN PROGRESO — Backend ✅ / Frontend ⏳ pendiente
> **Rama:** `feature/US14-bootstrap-queue`
> **Story Points:** 13 SP | **Microservicio principal:** `service-queue` (nuevo, puerto 8003)

---

## 📖 Historia de Usuario

> Como Promotor, quiero configurar el umbral de usuarios simultáneos para mis eventos, para activar automáticamente la lista de espera y gestionar la alta demanda de forma ordenada.

---

## ✅ Lo implementado hasta ahora

### Estructura del microservicio `service-queue` (NUEVO)

```
service-queue/
├── Dockerfile                       ← Python 3.11-slim, idéntico a service-events
├── requirements.txt                 ← Django 4.2, DRF, JWT, APScheduler
├── manage.py                        ← Apunta a queue_config.settings
├── queue_config/
│   ├── settings.py                  ← BD: queue_db | Puerto: 8003 | JWT compartido
│   ├── urls.py                      ← Swagger + rutas de queue_app
│   └── wsgi.py
└── queue_app/
    ├── authentication.py            ← JWT sin DB lookup (mismo patrón que service-events)
    ├── models.py                    ← 4 modelos creados (ver abajo)
    ├── serializers.py               ← QueueConfigSerializer + QueueConfigWriteSerializer
    ├── views.py                     ← QueueConfigView + QueueHealthView
    └── urls.py                      ← /queue-config/{event_id}/ + /health/
```

### Modelos creados en `queue_db`

| Modelo | Tabla | HU que lo usa | Estado |
|--------|-------|----------------|--------|
| `QueueConfig` | `queue_config` | US14 | ✅ Completo |
| `SeatReservation` | `seat_reservation` | US20 | ✅ Modelo listo (lógica en US20) |
| `QueueEntry` | `queue_entry` | US18 | ✅ Modelo listo (lógica en US18) |
| `QueueLog` | `queue_log` | US20 | ✅ Modelo listo (lógica en US20) |

### Endpoints implementados

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/health/` | ❌ | Health check del servicio |
| `GET` | `/api/v1/queue-config/{event_id}/` | ✅ JWT | Ver configuración (devuelve defaults si no existe) |
| `POST` | `/api/v1/queue-config/{event_id}/` | ✅ JWT Promotor | Crear/actualizar configuración |

**Validaciones del POST:**
1. `max_concurrent_users` > 0
2. `payment_timeout_minutes` > 0
3. `max_concurrent_users` ≤ `capacity` del evento (consulta cruzada a `service-events`)
4. Solo rol `promoter` o `admin`

### `docker-compose.yml` actualizado
- `queue-db`: PostgreSQL 15, puerto `5435`
- `service-queue`: Django, puerto `8003`, depende de `queue-db` + `service-auth` + `service-events`
- Frontend: `NEXT_PUBLIC_QUEUE_URL=http://localhost:8003`

---

## ⏳ Lo que falta para completar US14 (Frontend)

### Panel de configuración de cola en la ficha del evento del Promotor

**Dónde integrarlo:** En `FormularioEvento.jsx` o en una nueva sección de `DetalleEvento.jsx` visible solo para promotores.

**Qué debe mostrar:**
```
┌─────────────────────────────────────────────┐
│  🚦 Configuración de Cola Virtual           │
│                                             │
│  Umbral de usuarios simultáneos: [ 150 ]    │
│  Timeout de pago (minutos):      [  15 ]    │
│                                             │
│  Estado actual:  ● Cola INACTIVA            │
│                                             │
│         [  Guardar Configuración  ]         │
└─────────────────────────────────────────────┘
```

**Servicio a llamar:**
```javascript
const QUEUE_URL = process.env.NEXT_PUBLIC_QUEUE_URL || 'http://localhost:8003';

// GET config actual
GET `${QUEUE_URL}/api/v1/queue-config/${eventId}/`

// POST actualizar config
POST `${QUEUE_URL}/api/v1/queue-config/${eventId}/`
Body: { max_concurrent_users: 150, payment_timeout_minutes: 15 }
```

---

## 🧪 Criterios de Aceptación — Estado

| PA | Descripción | Estado |
|----|-------------|--------|
| PA1 | El promotor ve la sección "Configuración de Cola" en la ficha del evento | ⏳ Frontend pendiente |
| PA2 | El promotor ingresa umbral válido y guarda → se persiste y muestra confirmación | ✅ Backend listo |
| PA3 | Umbral > capacidad del evento → error "El umbral no puede superar la capacidad" | ✅ Backend listo |
| PA4 | Umbral = 0 o negativo → error "El umbral debe ser mayor a 0" | ✅ Backend listo |
| PA5 | La cola usa el umbral configurado al activarse (TIC-18) | ⏳ Pendiente (US18) |

---

## 🧪 Cómo probar el backend

```bash
# 1. Levantar el microservicio
docker-compose up --build service-queue queue-db

# 2. Health check
GET http://localhost:8003/api/v1/health/

# 3. Obtener config de un evento
GET http://localhost:8003/api/v1/queue-config/{event_id}/
Authorization: Bearer <token_promotor>

# 4. Crear/actualizar config
POST http://localhost:8003/api/v1/queue-config/{event_id}/
Authorization: Bearer <token_promotor>
{ "max_concurrent_users": 100, "payment_timeout_minutes": 15 }
```

---

## 🔗 Dependencias

- **Depende de:** US11 (los asientos deben existir en la BD)
- **Bloquea a:** US18 (que necesita `QueueConfig` para saber el umbral)
