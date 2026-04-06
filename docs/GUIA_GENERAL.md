# TicketGo - Guia General del Proyecto

## Que es TicketGo?

Plataforma de venta de tickets/entradas para eventos. Permite a promotores crear y gestionar eventos, a compradores explorar y (proximamente) comprar entradas, y a administradores supervisar la plataforma.

## Arquitectura

```
                    ┌──────────────────┐
                    │   Frontend (3000) │
                    │   Next.js + React │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ service-auth│  │ service-   │  │ service-   │
     │   (8000)   │  │ profiles   │  │ events     │
     │            │  │   (8001)   │  │   (8002)   │
     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
           ▼               ▼               ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ auth_db  │   │profiles_db│   │ events_db│
     │  (5432)  │   │  (5433)  │   │  (5434)  │
     └──────────┘   └──────────┘   └──────────┘
```

### Stack tecnologico

| Componente | Tecnologia |
|------------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Django 4.2, Django REST Framework |
| Autenticacion | JWT (djangorestframework-simplejwt) |
| Base de datos | PostgreSQL (3 instancias) |
| Orquestacion | Docker Compose |
| Imagenes | Pillow + ImageField (service-events) |

## Inicio rapido

### Requisitos
- Docker y Docker Compose instalados
- Git

### Levantar el proyecto

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

### URLs del sistema

| Servicio | URL |
|----------|-----|
| Frontend (app principal) | http://localhost:3000 |
| Login publico | http://localhost:3000/login |
| Registro | http://localhost:3000/registro |
| Login admin | http://localhost:3000/admin/login |
| API Auth | http://localhost:8000/api/v1/ |
| API Events | http://localhost:8002/api/v1/ |
| Swagger Events | http://localhost:8002/api/schema/swagger-ui/ |

### Usuarios de prueba

| Email | Password | Rol |
|-------|----------|-----|
| `admin@ticketproject.com` | `Admin1234!` | Administrador |
| `comprador@ticketproject.com` | `Comprador1234!` | Comprador |
| `promotor@ticketproject.com` | `Promotor1234!` | Promotor |

## Roles y funcionalidades

### Administrador
- Login exclusivo en `/admin/login`
- Dashboard en `/admin/dashboard`
- Gestionar usuarios (aprobar/rechazar admins)
- Configurar timeout de inactividad
- Invitar nuevos administradores

### Promotor
- Crear, editar y eliminar eventos
- Gestionar tipos de entrada (VIP, General, etc.)
- Ver sus eventos con estado y precios
- Subir imagenes para eventos

### Comprador
- Explorar eventos disponibles
- Filtrar por nombre, ciudad o ubicacion
- Ver detalle de eventos con tipos de entrada
- Gestionar su perfil (nombre, telefono, foto)

## Estructura de carpetas

```
ProyectoSoftware/
├── docker-compose.yml
├── requirements.txt
│
├── service-auth/                   # Microservicio de autenticacion
│   ├── auth_config/settings.py     # Config Django + JWT + Email
│   ├── users/
│   │   ├── models.py               # User, Role, UserProfile, AccountDeletionLog
│   │   ├── views.py                # Login, registro, admin, perfil, password reset
│   │   ├── serializers.py          # Serializadores DRF
│   │   ├── signals.py              # Auto-crear UserProfile
│   │   └── permissions.py          # Clases de permisos por rol
│   └── seed_users.py               # Datos iniciales de usuarios
│
├── service-profiles/               # Microservicio de perfiles
│   ├── profiles/
│   │   ├── models.py               # AdminProfile, CompradorProfile, PromotorProfile
│   │   └── permissions.py          # Permisos por rol
│   └── profiles_config/
│
├── service-events/                 # Microservicio de eventos
│   ├── events/
│   │   ├── models.py               # Event, TicketType, Category
│   │   ├── views.py                # CRUD eventos + tickets
│   │   ├── serializers.py          # Serializadores con context de imagenes
│   │   ├── permissions.py          # IsPromotor, IsAdministrador
│   │   └── authentication.py       # Autenticador JWT cross-service
│   ├── media/                      # Imagenes subidas
│   └── seed_categories.py          # Categorias iniciales
│
├── frontend/                       # Next.js 16
│   ├── src/
│   │   ├── app/                    # App Router (Next.js)
│   │   │   ├── layout.page.tsx     # Layout raiz con AuthProvider
│   │   │   ├── [[...slug]]/        # Catch-all -> React Router
│   │   │   └── admin/              # Rutas admin (App Router)
│   │   │       ├── login/
│   │   │       ├── dashboard/
│   │   │       └── register/
│   │   ├── components/
│   │   │   └── dashboard/
│   │   │       ├── OpcionesComprador.jsx
│   │   │       ├── OpcionesPromotor.jsx
│   │   │       ├── admin/          # AdminConfiguracion, AdminUsuarios, etc.
│   │   │       └── eventos/        # CRUD eventos, explorar, detalle
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Estado global auth + inactividad
│   │   ├── pages/                  # Paginas principales
│   │   │   ├── Login.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PerfilUsuario.jsx
│   │   │   ├── RecuperarPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   └── services/
│   │       ├── authService.js      # Llamadas API auth
│   │       ├── eventosService.js   # Llamadas API eventos + mapeo
│   │       └── apiHelper.js        # Fetch wrapper con JWT
│   └── package.json
│
└── docs/                           # Documentacion tecnica
    ├── GUIA_GENERAL.md             # [Este archivo]
    ├── HU-1_registro.md
    ├── HU-2_login.md
    ├── HU-3_dashboard_roles.md
    ├── HU-4_administrador.md
    ├── HU-5_seguridad_roles.md
    ├── HU-6_recuperacion_password.md
    ├── HU-7_gestion_eventos.md
    ├── HU-8_gestion_entradas.md
    ├── HU-12_explorar_eventos.md
    ├── HU-28_perfil_usuario.md
    ├── HU-29_eliminar_cuenta.md
    ├── HU-31_seguridad_contrasenas.md
    └── swagger_documentation.md
```

## Enrutamiento hibrido (Next.js + React Router)

El frontend usa dos sistemas de enrutamiento:

| Sistema | Rutas | Razon |
|---------|-------|-------|
| **Next.js App Router** | `/admin/*` | Aislamiento de seguridad para admin |
| **React Router (BrowserRouter)** | Todo lo demas (`/login`, `/dashboard`, `/perfil`, etc.) | Flujo SPA para usuarios |

- `src/app/[[...slug]]/page.page.tsx` es un catch-all que renderiza `App.jsx` con React Router
- `src/app/admin/*/page.page.jsx` son rutas directas del App Router
- **Importante:** Para navegar de React Router a App Router (ej: de `/dashboard` a `/admin/dashboard`), se debe usar `window.location.href` en vez de `navigate()` de React Router

## API Endpoints principales

### service-auth (puerto 8000)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/v1/users/register/` | POST | Registro de usuario |
| `/api/v1/users/login/` | POST | Login general (JWT) |
| `/api/v1/users/admin_login/` | POST | Login exclusivo admin (con bloqueo) |
| `/api/v1/users/me/` | GET | Obtener perfil |
| `/api/v1/users/me/` | PATCH | Actualizar perfil |
| `/api/v1/users/me/` | DELETE | Eliminar cuenta |
| `/api/v1/users/password_reset_request/` | POST | Solicitar recuperacion |
| `/api/v1/users/password_reset_confirm/` | POST | Confirmar nueva password |
| `/api/v1/users/invite_admin/` | POST | Invitar administrador |
| `/api/v1/users/apply_admin/` | POST | Aplicar como admin (con token) |
| `/api/v1/users/pending_admins/` | GET | Listar admins pendientes |
| `/api/v1/users/<id>/approve_admin/` | PATCH | Aprobar admin |
| `/api/v1/users/<id>/reject_admin/` | DELETE | Rechazar admin |

### service-events (puerto 8002)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/v1/events/` | GET/POST | Listar/crear eventos |
| `/api/v1/events/<id>/` | GET/PATCH/DELETE | Detalle/editar/eliminar evento |
| `/api/v1/events/by_promoter/` | GET | Eventos de un promotor |
| `/api/v1/events/<id>/tickets/` | GET | Tickets de un evento |
| `/api/v1/ticket-types/` | POST | Crear tipo de entrada |
| `/api/v1/ticket-types/<id>/` | PATCH/DELETE | Editar/eliminar tipo de entrada |
| `/api/v1/categories/` | GET | Listar categorias |

## Autenticacion JWT

- **Access Token:** 15 minutos de vida
- **Refresh Token:** 1 dia de vida
- Los tokens incluyen claims personalizados: `email` y `role`
- Los microservicios (events, profiles) validan el token directamente sin consultar auth_db
- El frontend almacena tokens en `localStorage` (`token`, `refresh`, `user`)

## Seguridad implementada

1. **Passwords cifradas:** PBKDF2 + SHA256 + sal aleatoria (Django default)
2. **Bloqueo por intentos:** 3 intentos fallidos en admin login -> bloqueo 15 min
3. **Timeout de inactividad:** Configurable (1-60 min) desde panel admin
4. **Anti-enumeracion:** Mensajes genericos en password reset y admin login
5. **Permisos por rol:** Classes `IsAdministrador`, `IsPromotor`, `IsComprador` en cada microservicio
6. **Auditoria:** `AccountDeletionLog` registra eliminaciones de cuentas

## Comandos utiles

```bash
# Levantar todo
docker compose up --build

# Levantar en background
docker compose up -d

# Ver logs de un servicio
docker compose logs -f service-auth

# Reiniciar un servicio
docker compose restart service-auth

# Ejecutar seeds
docker compose exec service-auth python seed_users.py
docker compose exec service-events python seed_categories.py

# Shell de Django
docker compose exec service-auth python manage.py shell

# Ver passwords hasheadas en BD
docker compose exec service-auth python manage.py shell -c "from users.models import User; [print(u.email, '->', u.password) for u in User.objects.all()]"

# Ver logs de eliminacion de cuentas
docker compose exec service-auth python manage.py shell -c "from users.models import AccountDeletionLog; [print(l.user_email, l.deleted_at) for l in AccountDeletionLog.objects.all()]"

# Eliminar todo (incluyendo datos)
docker compose down -v
```

## Indice de documentacion

| Documento | Historia de Usuario | Descripcion |
|-----------|-------------------|-------------|
| [HU-1_registro.md](HU-1_registro.md) | HU-1 | Registro de usuarios |
| [HU-2_login.md](HU-2_login.md) | HU-2 | Login con JWT |
| [HU-3_dashboard_roles.md](HU-3_dashboard_roles.md) | HU-3 | Dashboard diferenciado por rol |
| [HU-4_administrador.md](HU-4_administrador.md) | HU-4 | Acceso y gestion de administradores |
| [HU-5_seguridad_roles.md](HU-5_seguridad_roles.md) | HU-5 | Seguridad y permisos entre microservicios |
| [HU-6_recuperacion_password.md](HU-6_recuperacion_password.md) | HU-6 | Recuperacion de contrasena |
| [HU-7_gestion_eventos.md](HU-7_gestion_eventos.md) | HU-7 | CRUD de eventos (Promotor) |
| [HU-8_gestion_entradas.md](HU-8_gestion_entradas.md) | HU-8 | Gestion de tipos de entrada |
| [HU-12_explorar_eventos.md](HU-12_explorar_eventos.md) | HU-12 | Explorar eventos (Comprador) |
| [HU-28_perfil_usuario.md](HU-28_perfil_usuario.md) | HU-28 | Actualizar perfil de usuario |
| [HU-29_eliminar_cuenta.md](HU-29_eliminar_cuenta.md) | HU-29 | Eliminar cuenta voluntariamente |
| [HU-31_seguridad_contrasenas.md](HU-31_seguridad_contrasenas.md) | HU-31 | Cifrado de contrasenas |
| [swagger_documentation.md](swagger_documentation.md) | - | Documentacion API automatica |
