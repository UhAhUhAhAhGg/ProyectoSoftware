# 🎟️ TicketGo / ProyectoSoftware

Plataforma de venta de entradas construida con arquitectura de microservicios.
Sprint actual: **Sprint 4** (recomendaciones, notificaciones, gestión administrativa, SuperAdmin con permisos granulares, auditoría unificada).

---

## 🏗️ Arquitectura

```
                         ┌──────────────────┐
                         │ Frontend Next.js │  :3000
                         └────────┬─────────┘
        ┌────────────────────┬────┴─────────┬────────────────────┐
        ▼                    ▼              ▼                    ▼
 ┌──────────────┐    ┌────────────────┐ ┌──────────────┐  ┌───────────────┐
 │ service-auth │    │service-profiles│ │service-events│  │ service-queue │
 │   :8000      │    │     :8001      │ │    :8002     │  │    :8003      │
 └──────┬───────┘    └────────┬───────┘ └──────┬───────┘  └───────┬───────┘
        ▼                     ▼                ▼                  ▼
 ┌──────────────┐    ┌────────────────┐ ┌──────────────┐  ┌───────────────┐
 │   auth_db    │    │  profiles_db   │ │  events_db   │  │   queue_db    │
 │    :5432     │    │     :5433      │ │    :5434     │  │    :5435      │
 └──────────────┘    └────────────────┘ └──────────────┘  └───────────────┘
```

| Servicio | Tecnología | Puerto | Descripción |
|---|---|---|---|
| `service-auth` | Django + DRF + simplejwt | 8000 | JWT, usuarios, roles, permisos granulares, auditoría de usuarios |
| `service-profiles` | Django + DRF | 8001 | Perfiles por rol (Admin, Comprador, Promotor) |
| `service-events` | Django + DRF | 8002 | Eventos, tickets, asientos, compras, favoritos, notificaciones, auditoría de eventos |
| `service-queue` | Django + DRF | 8003 | Cola virtual para alta demanda (Sprint 3) |
| `frontend` | Next.js 16 + React 19 | 3000 | UI |

---

## ✅ Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Git](https://git-scm.com/)

```bash
docker --version           # 24+
docker compose version     # 2+
git --version
```

---

## 🚀 Primera ejecución

### 1. Clonar y configurar

```bash
git clone git@github.com:UhAhUhAhAhGg/ProyectoSoftware.git
cd ProyectoSoftware
cp .env.example .env
```

> El `.env.example` ya tiene valores por defecto. Solo edítalo si quieres recibir mails reales — ver sección [Email](#-email-opcional).

### 2. Levantar todo

```bash
docker compose up --build
```

La primera vez tarda unos minutos descargando imágenes y aplicando migraciones.

### 3. Cargar datos iniciales (seeds)

**Imprescindible la primera vez** — sin esto no hay roles ni usuarios de prueba:

```bash
# 1. Crea los roles base + el SuperAdmin "histórico" (asigna rol Superadmin a usuarios is_staff existentes)
docker compose exec service-auth python seed_superadmin_role.py

# 2. Crea las 4 cuentas de prueba (admin SuperAdmin, admin con permisos limitados, promotor, comprador)
docker compose exec service-auth python seed_users.py

# 3. Crea las 10 categorías de eventos
docker compose exec service-events python seed_categories.py
```

> **Nota**: el orden importa. `seed_users.py` asume que los roles ya existen (los crea automáticamente si faltan).

### 4. Verificar

| URL | Qué deberías ver |
|---|---|
| http://localhost:3000 | Frontend |
| http://localhost:8000/api/v1/ | API auth |
| http://localhost:8001/api/v1/ | API perfiles |
| http://localhost:8002/api/v1/ | API eventos |
| http://localhost:8003/api/v1/ | API cola |

---

## 👤 Cuentas de prueba

Tras ejecutar `seed_users.py`:

| Rol | Email | Contraseña | Notas |
|---|---|---|---|
| **SuperAdmin** | `admin@ticketproject.com` | `Admin1234!` | `is_superadmin=True`. Bypass total de permisos. |
| **Admin (limitado)** | `admin2@ticketproject.com` | `Admin1234!` | Solo `manage_events`. Útil para probar gating del sidebar. |
| **Promotor** | `promotor@ticketproject.com` | `Promotor1234!` | Crea eventos. |
| **Comprador** | `comprador@ticketproject.com` | `Comprador1234!` | Compra entradas. |

> Para SuperAdmin desde consola (alternativa): `docker compose exec service-auth python manage.py create_superadmin --email superadmin@ticketgo.com --password admin123`.

---

## 💻 Uso diario

```bash
docker compose up                 # sin rebuild
docker compose up -d              # en background
docker compose down               # apagar
docker compose down -v            # apagar + borrar volúmenes (¡pierdes BD!)
docker compose logs -f service-auth   # logs en vivo
docker compose up --build service-auth  # rebuild de un servicio
```

### Reset completo del entorno

```bash
docker compose down -v
docker compose up --build
docker compose exec service-auth python seed_superadmin_role.py
docker compose exec service-auth python seed_users.py
docker compose exec service-events python seed_categories.py
```

### Crear admin de Django (acceso a /admin/)

```bash
docker compose exec service-auth python manage.py createsuperuser
```

### Migraciones manuales

```bash
docker compose exec service-auth python manage.py makemigrations
docker compose exec service-auth python manage.py migrate
```

### Acceder a la BD

```bash
docker compose exec auth-db psql -U admin -d auth_db
docker compose exec events-db psql -U admin -d events_db
```

---

## 🔑 Autenticación (JWT)

```bash
# Obtener token
POST http://localhost:8000/api/v1/users/login/
{ "email": "admin@ticketproject.com", "password": "Admin1234!" }

# Usar el token
GET http://localhost:8000/api/v1/users/me/
Authorization: Bearer <access_token>

# Refrescar
POST http://localhost:8000/api/v1/token/refresh/
{ "refresh": "<refresh_token>" }
```

El JWT incluye claims custom: `email`, `role`, `is_staff`, `is_superadmin`, `admin_permissions` (lista de capabilities, ver [US-24](docs/sprint-4/US24_permisos_granulares.md)).

---

## 📚 Documentación

Toda la documentación está en [`docs/`](docs/README.md), organizada por sprint:

| Sprint | Carpeta | Resumen |
|---|---|---|
| 🔧 Deuda técnica | [docs/DEUDA_TECNICA.md](docs/DEUDA_TECNICA.md) | **US-21 y US-22 pendientes de validar antes de producción** |
| Architecture | [docs/architecture/](docs/architecture/) | Estructura, API, BD, Swagger, guías técnicas |
| Sprint 1 | [docs/sprint-1/](docs/sprint-1/) | HU-1 a HU-8: registro, login, roles, eventos básicos |
| Sprint 2 | [docs/sprint-2/](docs/sprint-2/) | HU-9 a HU-32: explorar, comprar, pago QR, perfil |
| Sprint 3 | [docs/sprint-3/](docs/sprint-3/) | US-11 a US-20: mapa de asientos, cola virtual |
| Sprint 4 | [docs/sprint-4/](docs/sprint-4/) | US-21 a US-26: recomendaciones, notificaciones, admin |

---

## 🧪 Cómo probar Sprint 4

Esta es la entrega más reciente. Para una guía detallada por US, ver [docs/sprint-4/](docs/sprint-4/).

### Prerrequisitos

- `docker compose up` corriendo
- Seeds ejecutados (paso 3 de la instalación)
- Al menos un evento publicado por el Promotor (login → "Crear Evento" → publicar)

### US-21 — Recomendaciones y favoritos ([detalle](docs/sprint-4/RECOMMENDATIONS_INTEGRATION_GUIDE.md))

1. Login como Comprador → "Explorar Eventos" → marcar evento como favorito (corazón).
2. Comprar un evento → en home aparecen "Recomendaciones para ti" basadas en categoría/comportamiento.

### US-22 — Notificaciones y preferencias ([detalle](docs/sprint-4/NOTIFICATIONS_IMPLEMENTATION.md))

1. Comprador → "Notificaciones" en el header → ver historial.
2. "Mi perfil → Preferencias de notificación" → activar/desactivar por canal y categoría.
3. Comprar un evento → llega notificación de confirmación.

### US-23 — Gestión de usuarios por admin ([detalle](docs/sprint-4/US23_gestion_usuarios.md))

1. Login como `admin@ticketproject.com` (SuperAdmin) → "Gestionar Usuarios → Compradores".
2. Suspender un comprador con motivo → en otra pestaña con esa sesión, en ≤60s lo sacan.
3. Reactivar el comprador → vuelve a poder loguearse.

### US-24 — SuperAdmin + Permisos granulares ([detalle](docs/sprint-4/US24_permisos_granulares.md))

1. Como SuperAdmin → panel SuperAdmin → "Crear nuevo Administrador" con solo `manage_events`.
2. Logout. Login con el admin nuevo → sidebar solo muestra **Inicio + Gestión de Eventos**.
3. Sin recargar, el SuperAdmin le agrega `manage_users` → en ≤60s aparece "Gestionar Usuarios" en el sidebar del admin (polling de `/users/me/`).
4. **Bypass test**: con `admin2@ticketproject.com` (semilla), intentar `PATCH /api/v1/users/{id}/suspend/` → **403** (no tiene `manage_users`). Con SuperAdmin → 200.

### US-25 — Edición y baja de eventos por admin ([detalle](docs/sprint-4/US25_admin_eventos.md))

1. Como admin con `manage_events` → "Gestión de Eventos" → editar un evento (mismo formulario del Promotor + sección Control Administrativo).
2. Dar de baja con motivo → status pasa a `cancelled`.
3. Probar baja sin motivo → modal muestra "Debes seleccionar una razón".

### US-26 — Auditoría unificada ([detalle](docs/sprint-4/US26_auditoria.md))

1. Tras hacer cualquier acción de US-23/24/25, ir a "Log de Auditoría".
2. Tabla muestra ambas fuentes: 📅 Evento y 👤 Usuario.
3. Filtrar por tipo de acción / admin / fecha.
4. "Exportar CSV" descarga el log.

---

## 📧 Email (opcional)

Para que los correos de confirmación de compra lleguen de verdad, edita `.env`:

```env
EMAIL_HOST_USER=tucorreo@gmail.com
EMAIL_HOST_PASSWORD=tuapppassword16chars
DEFAULT_FROM_EMAIL=TicketGo <tucorreo@gmail.com>
```

Necesitas una [App Password de Google](https://myaccount.google.com/apppasswords) (16 caracteres). Sin esto, los mails se imprimen en la consola del backend.

---

## ❓ Problemas comunes

### "Port already in use"

Algún puerto (3000, 8000-8003, 5432-5435) está ocupado. Detén lo que lo use y reintenta.

### Los servicios no se ven entre sí

Asegúrate de ejecutar `docker compose up` desde la raíz (donde está `docker-compose.yml`).

### Las migraciones no aplican

```bash
docker compose exec service-auth python manage.py migrate
docker compose exec service-events python manage.py migrate
docker compose exec service-profiles python manage.py migrate
docker compose exec service-queue python manage.py migrate
```

### Quiero empezar de cero

```bash
docker compose down -v
docker compose up --build
# luego re-ejecutar los seeds
```

### Cambios en el código no se reflejan

Volúmenes montados recargan Python automáticamente. Para cambios en `Dockerfile` o `requirements.txt`:

```bash
docker compose up --build
```

### "Cannot assign UUID to Event.category"

Resuelto en US-25 — el endpoint admin convierte el UUID en instancia `Category` antes de persistir.

---

## 🧱 Estructura del proyecto

```
ProyectoSoftware/
├── docker-compose.yml
├── .env.example
├── README.md
├── docs/
│   ├── README.md              ← Índice de documentación
│   ├── architecture/
│   ├── sprint-1/ … sprint-4/
├── service-auth/
│   ├── Dockerfile
│   ├── seed_users.py
│   ├── seed_superadmin_role.py
│   ├── auth_config/
│   └── users/
├── service-profiles/
│   ├── Dockerfile
│   ├── profiles_config/
│   └── profiles/
├── service-events/
│   ├── Dockerfile
│   ├── seed_categories.py
│   ├── events_config/
│   └── events/
├── service-queue/
│   ├── Dockerfile
│   ├── queue_config/
│   └── queue_app/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
```
