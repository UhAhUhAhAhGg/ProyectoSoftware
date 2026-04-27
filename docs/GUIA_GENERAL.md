# TicketGo — Guía General del Proyecto

> Plataforma de venta de entradas para eventos. Permite a **Promotores** crear y gestionar eventos, a **Compradores** explorar y comprar entradas, y a **Administradores** supervisar la plataforma.

---

## 📐 Arquitectura del Sistema

```
                    ┌──────────────────────┐
                    │   Frontend React     │
                    │   (localhost:3000)   │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼                    ▼
 ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
 │ service-auth │    │service-events│    │service-queue │    │service-profiles│
 │   (8000)     │    │   (8002)     │    │   (8003)     │    │   (8001)     │
 └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
        ▼                   ▼                   ▼                   ▼
  ┌──────────┐       ┌──────────┐        ┌──────────┐       ┌──────────┐
  │ auth_db  │       │events_db │        │ queue_db │       │profiles_db│
  │  (5432)  │       │  (5434)  │        │  (5435)  │       │  (5433)  │
  └──────────┘       └──────────┘        └──────────┘       └──────────┘
```

### Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| Frontend | React 19 + React Router |
| Backend | Django 4.2 + Django REST Framework |
| Autenticación | JWT (djangorestframework-simplejwt) |
| Base de datos | PostgreSQL (4 instancias) |
| Orquestación | Docker Compose |

---

## 🚀 Inicio Rápido

### Requisitos
- Docker y Docker Compose instalados
- Git

### Levantar el Proyecto

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd ProyectoSoftware

# Levantar todos los servicios
docker compose up --build

# Cargar datos iniciales (en otra terminal)
docker compose exec service-auth python seed_users.py
docker compose exec service-events python seed_categories.py
```

### URLs del Sistema

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Login público | http://localhost:3000/login |
| Registro | http://localhost:3000/registro |
| Login admin | http://localhost:3000/admin/login |
| API Auth | http://localhost:8000/api/v1/ |
| API Events | http://localhost:8002/api/v1/ |
| API Queue | http://localhost:8003/api/v1/ |
| Swagger Events | http://localhost:8002/api/schema/swagger-ui/ |

### Usuarios de Prueba (seed)

| Email | Password | Rol |
|-------|----------|-----|
| `admin@ticketproject.com` | `Admin1234!` | Administrador |
| `comprador@ticketproject.com` | `Comprador1234!` | Comprador |
| `promotor@ticketproject.com` | `Promotor1234!` | Promotor |

---

## 👥 Roles y Funcionalidades

### Administrador
- Login exclusivo en `/admin/login`
- Aprobar/rechazar nuevos administradores
- Configurar timeout de inactividad de sesión
- Invitar nuevos administradores por email

### Promotor
- Crear, editar y eliminar eventos
- Gestionar tipos de entrada (VIP, General, etc.) con precios y cupos
- Configurar mapa de asientos (filas × asientos por fila)
- **[Sprint 3]** Configurar la cola virtual por evento (umbral, timeout)
- Subir imágenes para eventos

### Comprador
- Explorar y filtrar eventos disponibles
- Ver detalle de eventos con mapa de asientos
- Seleccionar asientos y pagar con QR
- Ver historial de compras
- **[Sprint 3]** Entrar a la cola virtual si el evento tiene alta demanda

---

## 🔑 Autenticación JWT

- **Access Token:** 5 minutos de vida (renovable automáticamente si hay actividad)
- **Refresh Token:** 1 día de vida
- Claims personalizados: `email`, `role`, `user_id`
- Los microservicios validan el token **directamente** sin consultar `auth_db` (arquitectura desacoplada)
- El frontend almacena tokens en `localStorage` (`token`, `refresh`, `user`)
- El `AuthContext` gestiona la inactividad: avisa a los 8 min y cierra sesión a los 10 min

---

## 🛡️ Seguridad Implementada

| Feature | Detalles |
|---------|---------|
| Passwords | PBKDF2 + SHA256 + sal aleatoria (Django default) |
| Bloqueo de admin | 3 intentos fallidos → bloqueo 15 min |
| Timeout de inactividad | Configurable 1-60 min. Modal de advertencia con cronómetro a los 2 min previos |
| Anti-enumeración | Mensajes genéricos en password reset |
| Permisos por rol | `IsAdministrador`, `IsPromotor`, `IsComprador` en cada servicio |
| Auditoría | `AccountDeletionLog` en eliminaciones de cuentas |
| Cola virtual | Limitación de usuarios simultáneos en selección de asientos (Sprint 3) |

---

## 📁 Estructura de Carpetas

```
ProyectoSoftware/
├── docker-compose.yml
│
├── service-auth/               # Microservicio de autenticación (puerto 8000)
│   ├── auth_config/settings.py
│   ├── users/models.py         # User, AccountDeletionLog
│   ├── users/views.py          # Login, registro, admin, perfil, password reset
│   └── seed_users.py           # Datos iniciales
│
├── service-profiles/           # Microservicio de perfiles (puerto 8001)
│   └── profiles/models.py      # AdminProfile, CompradorProfile, PromotorProfile
│
├── service-events/             # Microservicio de eventos y compras (puerto 8002)
│   ├── events/models.py        # Event, TicketType, Category, Purchase, Seat
│   ├── events/views.py         # CRUD eventos + compras + asientos + cola config
│   └── seed_categories.py      # Categorías iniciales
│
├── service-queue/              # Microservicio de fila virtual (puerto 8003) [Sprint 3]
│   ├── queue_app/models.py     # QueueConfig, QueueEntry, SeatReservation, QueueLog
│   ├── queue_app/views.py      # Endpoints de cola
│   ├── queue_app/active_users.py  # Tracking en memoria de usuarios activos
│   ├── queue_app/middleware.py    # Middleware de actividad
│   ├── queue_app/management/commands/barrendero.py  # Job de limpieza
│   └── entrypoint.sh           # Arranca barrendero + Django
│
├── frontend/src/
│   ├── context/AuthContext.jsx # Estado global auth + inactividad + modal
│   ├── pages/Dashboard.jsx     # Vista principal con sidebar
│   ├── components/dashboard/eventos/
│   │   ├── DetalleEvento.jsx   # Detalle con verificación de cola
│   │   ├── ColaEspera.jsx      # Pantalla de espera en la cola [Sprint 3]
│   │   └── SeatMapModal.jsx    # Mapa de asientos interactivo
│   └── services/
│       ├── authService.js
│       ├── eventosService.js
│       └── apiHelper.js        # Fetch wrapper con JWT + refresh automático
│
└── docs/                       # Documentación técnica
    ├── GUIA_GENERAL.md         # [Este archivo] — Visión general del proyecto
    ├── API_ENDPOINTS.md        # Referencia completa de todos los endpoints
    ├── SEAT_MAP_API.md         # API del mapa de asientos (US11)
    ├── US14_service_queue_bootstrap.md  # Setup del microservicio de cola
    ├── US16_timeout_sesion.md  # Seguridad de sesiones JWT
    ├── US18_activar_cola_virtual.md     # Fila virtual y middleware
    ├── US19_posicion_eta_cola.md        # Posición y ETA en cola
    ├── US20_barrendero_cron_job.md      # Job de limpieza de reservas
    └── SWAGGER_SETUP_GUIDE.md  # Configuración de Swagger/OpenAPI
```

---

## 🌐 API Endpoints Principales

### service-auth (puerto 8000)

| Endpoint | Método | Descripción | Rol |
|----------|--------|-------------|-----|
| `/api/v1/users/register/` | POST | Registro de usuario | Público |
| `/api/v1/users/login/` | POST | Login con JWT | Público |
| `/api/v1/users/admin_login/` | POST | Login exclusivo admin | Público |
| `/api/v1/users/me/` | GET/PATCH/DELETE | Perfil propio | Autenticado |
| `/api/v1/users/password_reset_request/` | POST | Solicitar recuperación | Público |
| `/api/v1/users/password_reset_confirm/` | POST | Confirmar nueva password | Público |
| `/api/v1/users/invite_admin/` | POST | Invitar administrador | Admin |
| `/api/v1/users/pending_admins/` | GET | Listar pendientes | Admin |
| `/api/v1/users/<id>/approve_admin/` | PATCH | Aprobar admin | Admin |

### service-events (puerto 8002)

| Endpoint | Método | Descripción | Rol |
|----------|--------|-------------|-----|
| `/api/v1/events/` | GET | Listar eventos activos | Público |
| `/api/v1/events/<id>/` | GET/PATCH/DELETE | Detalle/editar/eliminar | Mixto |
| `/api/v1/events/by_promoter/` | GET | Mis eventos | Promotor |
| `/api/v1/events/<id>/queue-config/` | GET/PUT | Config de cola virtual | Promotor |
| `/api/v1/ticket-types/` | POST | Crear tipo de entrada | Promotor |
| `/api/v1/seats/` | GET | Listar asientos de evento | Autenticado |
| `/api/v1/seats/bulk-reserve/` | POST | Reservar asientos | Comprador |
| `/api/v1/seats/release-expired/` | POST | Liberar asientos expirados | Interno |
| `/api/v1/purchase/` | POST | Iniciar compra | Comprador |
| `/api/v1/purchase/<id>/simular_pago/` | POST | Simular pago QR | Comprador |
| `/api/v1/purchases/history/` | GET | Historial de compras | Comprador |

### service-queue (puerto 8003) — Sprint 3

| Endpoint | Método | Descripción | Rol |
|----------|--------|-------------|-----|
| `/api/v1/queue-config/<event_id>/` | GET/POST | Config umbral de cola | Promotor |
| `/api/v1/queue/<event_id>/enter/` | POST | Entrar al evento o cola | Comprador |
| `/api/v1/queue/<event_id>/status/` | GET | Estado actual de la cola | Comprador |
| `/api/v1/queue/<event_id>/position/` | GET | Posición y ETA en cola | Comprador |
| `/api/v1/queue/<event_id>/leave/` | DELETE | Abandonar la cola | Comprador |
| `/api/v1/health/` | GET | Health check del servicio | Público |

---

## 🔧 Comandos Útiles

```bash
# Levantar todo el sistema
docker compose up --build

# Levantar en background
docker compose up -d

# Ver logs de un servicio
docker compose logs -f service-queue

# Reiniciar un servicio
docker compose restart service-events

# Ejecutar seeds
docker compose exec service-auth python seed_users.py
docker compose exec service-events python seed_categories.py

# Aplicar migraciones manualmente
docker compose exec service-events python manage.py migrate
docker compose exec service-queue python manage.py migrate

# Ejecutar el barrendero una sola vez (para pruebas)
docker compose exec service-queue python manage.py barrendero

# Ejecutar barrendero en modo daemon manual
docker compose exec service-queue python manage.py barrendero --daemon --interval 30

# Shell de Django
docker compose exec service-auth python manage.py shell

# Eliminar todo (incluyendo datos)
docker compose down -v
```

---

## 📚 Índice de Documentación

| Documento | Sprint | Descripción |
|-----------|--------|-------------|
| [GUIA_GENERAL.md](GUIA_GENERAL.md) | — | **Este archivo** — Visión general |
| [API_ENDPOINTS.md](API_ENDPOINTS.md) | — | Referencia completa de endpoints |
| **Sprints anteriores** | | |
| [HU-1_registro.md](HU-1_registro.md) | 1 | Registro de usuarios |
| [HU-2_login.md](HU-2_login.md) | 1 | Login con JWT |
| [HU-4_administrador.md](HU-4_administrador.md) | 1 | Panel de administrador |
| [HU-7_gestion_eventos.md](HU-7_gestion_eventos.md) | 1 | CRUD de eventos |
| [HU-17_pago_qr.md](HU-17_pago_qr.md) | 2 | Pago con QR |
| [HU-32_historial_compras.md](HU-32_historial_compras.md) | 2 | Historial de compras |
| **Sprint 3 — Fila Virtual** | | |
| [US16_timeout_sesion.md](US16_timeout_sesion.md) | 3 | Seguridad JWT e inactividad |
| [SEAT_MAP_API.md](SEAT_MAP_API.md) | 3 | API del mapa de asientos |
| [US14_service_queue_bootstrap.md](US14_service_queue_bootstrap.md) | 3 | Setup del microservicio de cola |
| [US18_activar_cola_virtual.md](US18_activar_cola_virtual.md) | 3 | Fila virtual y middleware |
| [US19_posicion_eta_cola.md](US19_posicion_eta_cola.md) | 3 | Posición y ETA en cola |
| [US20_barrendero_cron_job.md](US20_barrendero_cron_job.md) | 3 | Job de limpieza de reservas |
| [SWAGGER_SETUP_GUIDE.md](SWAGGER_SETUP_GUIDE.md) | — | Configuración de Swagger |
