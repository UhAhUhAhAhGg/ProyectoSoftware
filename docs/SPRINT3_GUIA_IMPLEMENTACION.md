# 📋 Sprint 3 — Guía Maestra de Implementación

> **Sprint:** 13 Abril — 28/30 Abril 2026
> **Total:** 68 Story Points | 46 Subtareas | 33 Criterios de Aceptación

---

## 🗺️ Orden de Ejecución Recomendado

```
US11 ──────────────────────────────────────────────► ✅ COMPLETADA
  │
  └──► US14 (bootstrap service-queue) ──────────────► 🔄 EN PROGRESO
         │
         └──► US18 (activar cola) ──────────────────► ⏳ Pendiente
                │
                └──► US19 (posición + ETA) ──────────► ⏳ Pendiente

US14 ──► US20 (CRON barrendero) ────────────────────► ⏳ Pendiente (paralela a US18/19)

US16 (timeout sesión) ──────────────────────────────► ⏳ Pendiente (independiente)
```

---

## 📁 Documentación por Historia de Usuario

| HU | Archivo | Estado | SP | Rama |
|----|---------|--------|----|------|
| **US11** — Mapa de Asientos | [US11_SEAT_MAP_IMPLEMENTATION.md](./US11_SEAT_MAP_IMPLEMENTATION.md) | ✅ Completada | 13 | Mergeada |
| **US14** — Config Cola Virtual | [US14_service_queue_bootstrap.md](./US14_service_queue_bootstrap.md) | 🔄 En progreso | 13 | `feature/US14-bootstrap-queue` |
| **US18** — Activar Cola Auto | [US18_activar_cola_virtual.md](./US18_activar_cola_virtual.md) | ⏳ Pendiente | 8 | `feature/US18-activar-cola` |
| **US19** — Posición y ETA | [US19_posicion_eta_cola.md](./US19_posicion_eta_cola.md) | ⏳ Pendiente | 13 | `feature/US19-posicion-eta` |
| **US20** — CRON Barrendero | [US20_barrendero_cron_job.md](./US20_barrendero_cron_job.md) | ⏳ Pendiente | 13 | `feature/US20-barrendero-cron` |
| **US16** — Timeout Sesión | [US16_timeout_sesion.md](./US16_timeout_sesion.md) | ⏳ Pendiente | 8 | `feature/US16-timeout-sesion` |

---

## 🌐 Arquitectura de Microservicios del Sprint 3

| Servicio | Puerto | BD | Responsabilidad |
|----------|--------|----|-----------------|
| `service-auth` | 8000 | `auth_db` (5432) | JWT, usuarios, refresh tokens |
| `service-profiles` | 8001 | `profiles_db` (5433) | Perfiles de compradores y promotores |
| `service-events` | 8002 | `events_db` (5434) | Eventos, tickets, compras, **asientos (Seat)** |
| `service-queue` | 8003 | `queue_db` (5435) | Cola virtual, reservas temporales, CRON jobs |
| `frontend` | 3000 | — | Next.js + React |

---

## 🔑 Variables de Entorno Clave

### Para el Frontend (`.env.local` o `docker-compose.yml`)

```env
NEXT_PUBLIC_AUTH_URL=http://localhost:8000
NEXT_PUBLIC_PROFILES_URL=http://localhost:8001
NEXT_PUBLIC_EVENTS_URL=http://localhost:8002
NEXT_PUBLIC_QUEUE_URL=http://localhost:8003
```

### Para `service-queue` (`docker-compose.yml`)

```env
DB_NAME=queue_db
DB_HOST=queue-db
DB_PORT=5432
SECRET_KEY=django-insecure-your-secret-key-change-this
EVENTS_SERVICE_URL=http://service-events:8000
AUTH_SERVICE_URL=http://service-auth:8000
```

### Para `service-events` (añadir en US20)

```env
QUEUE_SERVICE_URL=http://service-queue:8000
```

---

## 🔄 Flujo de Git para cada HU

```bash
# 1. Siempre partir de Sprint3_DEV actualizado
git checkout Sprint3_DEV
git pull origin Sprint3_DEV

# 2. Crear la rama de la HU
git checkout -b feature/US{XX}-nombre-descriptivo

# 3. Desarrollar...

# 4. Commit con mensaje descriptivo
git add .
git commit -m "feat(US{XX}): descripcion de lo implementado"

# 5. Push de la rama
git push origin feature/US{XX}-nombre-descriptivo

# 6. Merge a Sprint3_DEV (solo merges, sin desarrollo directo)
git checkout Sprint3_DEV
git pull origin Sprint3_DEV
git merge feature/US{XX}-nombre-descriptivo --no-ff
git push origin Sprint3_DEV
```

---

## 🧪 Checklist de Pruebas por HU

### US14 — Probar backend de configuración de cola
```bash
# Health check
curl http://localhost:8003/api/v1/health/

# Obtener config (sin config previa → devuelve defaults)
curl -H "Authorization: Bearer <token>" \
     http://localhost:8003/api/v1/queue-config/{event_id}/

# Crear config con umbral válido
curl -X POST -H "Authorization: Bearer <token_promotor>" \
     -H "Content-Type: application/json" \
     -d '{"max_concurrent_users": 100, "payment_timeout_minutes": 15}' \
     http://localhost:8003/api/v1/queue-config/{event_id}/

# Intentar con umbral 0 → debe fallar con 400
curl -X POST -H "Authorization: Bearer <token_promotor>" \
     -H "Content-Type: application/json" \
     -d '{"max_concurrent_users": 0, "payment_timeout_minutes": 15}' \
     http://localhost:8003/api/v1/queue-config/{event_id}/
```

### US16 — Probar timeout de sesión
1. Login y obtener token
2. Esperar 30 minutos sin interactuar (o bajar `ACCESS_TOKEN_LIFETIME` a 1 minuto para pruebas)
3. Verificar que aparece el modal de advertencia a los 28 minutos (o segundos si es en modo test)
4. Clic en "Continuar sesión" → verificar que el token se renueva
5. No responder → verificar logout automático y localStorage limpio

### US18 — Probar cola virtual
1. Configurar umbral = 2 (para forzar rápido la activación)
2. Abrir 3 navegadores distintos e iniciar sesión con 3 compradores
3. Los 2 primeros → acceso directo al mapa de asientos
4. El 3ro → debe entrar a la cola y ver la pantalla de espera
5. Verificar que `QueueConfig.is_queue_active = true`

### US19 — Probar posición y ETA
1. Tener 5 usuarios en cola
2. Verificar que cada uno ve su posición correcta (1, 2, 3, 4, 5)
3. Completar la compra del usuario #1
4. Verificar que el usuario #2 ahora ve posición #1 (sin recargar)

### US20 — Probar liberación automática
1. Reservar asientos con un usuario
2. Bajar `payment_timeout_minutes` a 1 minuto (en `QueueConfig`)
3. Esperar 60 segundos (el job corre cada 60s)
4. Verificar que los asientos volvieron a estar `available` en el mapa
5. Verificar entrada en `QueueLog` con `event_type='seat_released'`

---

## ⚠️ Notas Importantes

> [!IMPORTANT]
> **Arquitectura de microservicios:** Las referencias entre servicios son siempre UUIDs lógicos, NUNCA Foreign Keys SQL entre bases de datos distintas. Esto es fundamental para el desacoplamiento.

> [!WARNING]
> **Turbopack + Next.js:** Si aparece un 404 en el frontend después de editar código, detener el servidor (`Ctrl+C`) y reiniciar `npm run dev`. Es un bug conocido del servidor de desarrollo.

> [!TIP]
> **Orden de Docker:** Siempre levantar en este orden para evitar errores de conexión: `auth-db` → `service-auth` → `events-db` → `service-events` → `queue-db` → `service-queue` → `frontend`. El `docker-compose up` con `depends_on` lo hace automáticamente.
