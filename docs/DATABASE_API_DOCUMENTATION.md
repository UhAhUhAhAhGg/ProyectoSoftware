# 📚 Documentación Completa de API - Elementos de Base de Datos

> **Última actualización:** 4 de abril de 2026  
> **Descripción:** Documentación centralizada de todos los endpoints que interactúan con la base de datos en los microservicios

---

## 📋 Tabla de Contenidos

1. [Acceso a Documentación Swagger](#acceso-a-documentación-swagger)
2. [Service-Auth](#service-auth)
3. [Service-Events](#service-events)
4. [Service-Profiles](#service-profiles)
5. [Modelo de Datos Completo](#modelo-de-datos-completo)
6. [Guía para Frontend](#guía-para-frontend)

---

## 🔗 Acceso a Documentación Swagger

Cada microservicio expone documentación interactiva Swagger en las siguientes URLs:

### Service-Auth (Puerto 8001)
- **Swagger UI:** `http://localhost:8001/api/v1/schema/swagger-ui/`
- **ReDoc:** `http://localhost:8001/api/v1/schema/redoc/`
- **Schema OpenAPI:** `http://localhost:8001/api/v1/schema/`

### Service-Events (Puerto 8002)
- **Swagger UI:** `http://localhost:8002/api/v1/schema/swagger-ui/`
- **ReDoc:** `http://localhost:8002/api/v1/schema/redoc/`
- **Schema OpenAPI:** `http://localhost:8002/api/v1/schema/`

### Service-Profiles (Puerto 8003)
- **Swagger UI:** `http://localhost:8003/api/v1/schema/swagger-ui/`
- **ReDoc:** `http://localhost:8003/api/v1/schema/redoc/`
- **Schema OpenAPI:** `http://localhost:8003/api/v1/schema/`

---

## 🔐 Service-Auth

### Descripción
Servicio de autenticación y gestión de usuarios con control de roles y permisos.

### Modelos de Base de Datos

#### 1. **User** (Usuarios)
```json
{
  "id": "uuid",
  "email": "string (único)",
  "password": "string (hash)",
  "is_active": "boolean",
  "is_staff": "boolean",
  "reset_token": "string",
  "reset_token_expires": "datetime",
  "created_at": "datetime",
  "deleted_at": "datetime (soft delete)",
  "role_id": "uuid (FK → Role)"
}
```

#### 2. **Role** (Roles)
```json
{
  "id": "uuid",
  "name": "string (único) - Admin, Promotor, Buyer"
}
```

#### 3. **Permission** (Permisos)
```json
{
  "id": "uuid",
  "name": "string (único) - create_event, delete_user, etc."
}
```

#### 4. **RolePermission** (Relación Rol-Permiso)
```json
{
  "role_id": "uuid (FK)",
  "permission_id": "uuid (FK)"
}
```

#### 5. **UserProfile** (Perfil del Usuario)
```json
{
  "user_id": "uuid (PK, FK)",
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "date_of_birth": "date",
  "profile_photo_url": "string (base64 o URL)"
}
```

#### 6. **AccountDeletionLog** (Auditoría)
```json
{
  "id": "uuid",
  "user_email": "string",
  "user_role": "string",
  "deleted_at": "datetime (auto)"
}
```

### Endpoints Principales

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|----------------|
| **POST** | `/api/v1/users/register/` | Registrar nuevo usuario | ❌ No requerida |
| **POST** | `/api/v1/token/` | Obtener JWT token | ❌ No requerida |
| **POST** | `/api/v1/token/refresh/` | Refrescar JWT token | ❌ No requerida |
| **GET** | `/api/v1/users/me/` | Obtener datos del usuario autenticado | ✅ JWT |
| **PUT/PATCH** | `/api/v1/users/me/` | Actualizar perfil del usuario | ✅ JWT |
| **DELETE** | `/api/v1/users/me/` | Eliminar cuenta (con confirmación de contraseña) | ✅ JWT |
| **POST** | `/api/v1/users/password_reset_request/` | Solicitar enlace de recuperación | ❌ No requerida |
| **POST** | `/api/v1/users/password_reset_confirm/` | Confirmar nueva contraseña | ❌ No requerida |
| **POST** | `/api/v1/users/admin_login/` | Login como administrador | ❌ No requerida |
| **POST** | `/api/v1/users/apply_admin/` | Solicitar rol de administrador | ✅ JWT |

---

## 🎯 Service-Events

### Descripción
Servicio para gestión de eventos, categorías y tipos de entradas.

### Modelos de Base de Datos

#### 1. **Category** (Categorías de Eventos)
```json
{
  "id": "uuid",
  "name": "string (único) - Música, Deportes, etc.",
  "description": "text",
  "is_active": "boolean"
}
```

#### 2. **Event** (Eventos)
```json
{
  "id": "uuid",
  "promoter_id": "uuid (referencia a User en service-auth)",
  "name": "string",
  "description": "text",
  "event_date": "date",
  "event_time": "time",
  "location": "string",
  "capacity": "integer",
  "image": "image field",
  "status": "string (draft, published, cancelled, completed)",
  "created_at": "datetime",
  "category_id": "uuid (FK)"
}
```

#### 3. **TicketType** (Tipos de Entradas)
```json
{
  "id": "uuid",
  "event_id": "uuid (FK)",
  "name": "string",
  "description": "text",
  "price": "decimal",
  "max_capacity": "integer",
  "zone_type": "string (general, platea, preferencial, vip, palco)",
  "is_vip": "boolean",
  "seat_rows": "integer",
  "seats_per_row": "integer",
  "status": "string (active, inactive, sold_out)",
  "current_sold": "integer"
}
```

### Endpoints Principales

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|----------------|
| **GET** | `/api/v1/categories/` | Listar categorías activas | ✅ JWT |
| **POST** | `/api/v1/categories/` | Crear categoría (Admin) | ✅ JWT + Admin |
| **GET** | `/api/v1/events/` | Listar eventos publicados | ✅ JWT |
| **POST** | `/api/v1/events/` | Crear evento (Promotor) | ✅ JWT + Promotor |
| **GET** | `/api/v1/events/{id}/` | Obtener detalles del evento | ✅ JWT |
| **PUT/PATCH** | `/api/v1/events/{id}/` | Actualizar evento (solo propietario) | ✅ JWT |
| **DELETE** | `/api/v1/events/{id}/` | Cancelar evento (soft delete) | ✅ JWT |
| **GET** | `/api/v1/events/upcoming/` | Obtener eventos próximos | ✅ JWT |
| **GET** | `/api/v1/tickettypes/` | Listar tipos de entradas | ✅ JWT |
| **POST** | `/api/v1/tickettypes/` | Crear tipo de entrada | ✅ JWT + Promotor |
| **PUT/PATCH** | `/api/v1/tickettypes/{id}/` | Actualizar tipo de entrada | ✅ JWT |

### Filtros y Búsqueda

Los eventos pueden filtrase por:
- `status`: draft, published, cancelled, completed
- `category`: ID de la categoría
- `event_date`: fecha del evento

---

## 👤 Service-Profiles

### Descripción
Servicio para gestión de perfiles específicos según el rol del usuario.

### Modelos de Base de Datos

#### 1. **AdminProfile** (Perfil de Administrador)
```json
{
  "user_id": "uuid (PK, referencia a User)",
  "employee_code": "string (único)",
  "department": "string"
}
```

#### 2. **BuyerProfile** (Perfil de Comprador)
```json
{
  "user_id": "uuid (PK, referencia a User)"
}
```

#### 3. **PromotorProfile** (Perfil de Promotor)
```json
{
  "user_id": "uuid (PK, referencia a User)",
  "company_name": "string",
  "comercial_nit": "string (único)",
  "bank_account": "string"
}
```

### Endpoints Principales

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|----------------|
| **GET** | `/api/v1/admin-profiles/` | Listar perfiles de admin | ✅ JWT + Admin |
| **POST** | `/api/v1/admin-profiles/` | Crear perfil admin | ✅ JWT + Admin |
| **GET** | `/api/v1/admin-profiles/by_user/?user_id=...` | Obtener perfil admin por user_id | ✅ JWT |
| **GET** | `/api/v1/buyer-profiles/` | Listar perfiles de comprador | ✅ JWT |
| **POST** | `/api/v1/buyer-profiles/` | Crear perfil de comprador | ✅ JWT |
| **GET** | `/api/v1/buyer-profiles/by_user/?user_id=...` | Obtener perfil de comprador | ✅ JWT |
| **GET** | `/api/v1/promotor-profiles/` | Listar perfiles de promotor | ✅ JWT |
| **POST** | `/api/v1/promotor-profiles/` | Crear perfil de promotor | ✅ JWT |
| **GET** | `/api/v1/promotor-profiles/by_user/?user_id=...` | Obtener perfil de promotor | ✅ JWT |
| **GET** | `/api/v1/promotor-profiles/{id}/events/` | Obtener eventos del promotor | ✅ JWT |

---

## 🗂️ Modelo de Datos Completo

### Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE-AUTH                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐          ┌──────────────┐              │
│  │     User     │          │     Role     │              │
│  ├──────────────┤    ┌─────├──────────────┤              │
│  │ id (UUID)    │────┤     │ id (UUID)    │              │
│  │ email        │    │     │ name         │              │
│  │ password     │    └─────┤              │              │
│  │ is_active    │          └──────────────┘              │
│  │ role_id (FK) │                                        │
│  └──────────────┘          ┌──────────────┐              │
│         ▲                  │  Permission  │              │
│         │                  ├──────────────┤              │
│  ┌──────┴─────────┐        │ id (UUID)    │              │
│  │  UserProfile   │        │ name         │              │
│  ├────────────────┤        └──────────────┘              │
│  │ user_id (FK)   │               ▲                      │
│  │ first_name     │               │                      │
│  │ last_name      │        ┌──────┴───────────┐          │
│  │ phone          │        │ RolePermission   │          │
│  │ date_of_birth  │        ├──────────────────┤          │
│  │ profile_photo  │        │ role_id (FK)     │          │
│  └────────────────┘        │ permission_id    │          │
│                            └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SERVICE-EVENTS                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐         ┌─────────────────┐           │
│  │   Category     │         │      Event      │           │
│  ├────────────────┤    ┌────├─────────────────┤           │
│  │ id (UUID)      │────┤    │ id (UUID)       │           │
│  │ name           │    │    │ promoter_id     │           │
│  │ description    │    └────│ category_id(FK) │           │
│  │ is_active      │         │ name            │           │
│  └────────────────┘         │ description     │           │
│                             │ event_date      │           │
│                             │ location        │           │
│                             │ capacity        │           │
│                             │ status          │           │
│                             └─────────────────┘           │
│                                    ▲                       │
│                  ┌─────────────────┘                       │
│                  │                                         │
│            ┌─────┴──────────┐                             │
│            │   TicketType   │                             │
│            ├────────────────┤                             │
│            │ id (UUID)      │                             │
│            │ event_id (FK)  │                             │
│            │ name           │                             │
│            │ price          │                             │
│            │ max_capacity   │                             │
│            │ zone_type      │                             │
│            │ current_sold   │                             │
│            └────────────────┘                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 SERVICE-PROFILES                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │   AdminProfile   │  │  BuyerProfile    │              │
│  ├──────────────────┤  ├──────────────────┤              │
│  │ user_id (PK/FK)  │  │ user_id (PK/FK)  │              │
│  │ employee_code    │  │                  │              │
│  │ department       │  │ (simple)         │              │
│  └──────────────────┘  └──────────────────┘              │
│                                                             │
│  ┌──────────────────┐                                      │
│  │ PromotorProfile  │                                      │
│  ├──────────────────┤                                      │
│  │ user_id (PK/FK)  │                                      │
│  │ company_name     │                                      │
│  │ comercial_nit    │                                      │
│  │ bank_account     │                                      │
│  └──────────────────┘                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Guía para Frontend

### 1. **Flujo de Autenticación**

```mermaid
graph TD
    A["Usuario"] -->|POST /register| B["Service-Auth<br/>Crear User"]
    B -->|Respuesta| A
    A -->|POST /token| C["Service-Auth<br/>Validar credentials"]
    C -->|Retorna JWT| A
    A -->|Authorization header<br/>Bearer {token}| D["Cualquier endpoint"]
    D -->|Respuesta| A
```

### 2. **Estructura de Peticiones y Respuestas**

#### Petición de Login
```json
POST /api/v1/token/
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "contraseña"
}
```

#### Respuesta de Login
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "role": "buyer"
}
```

#### Encabezados de Autorización
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json
```

### 3. **Flujo de Creación de Eventos (Promotor)**

```mermaid
graph TD
    A["Promotor autenticado"] -->|GET /categories| B["Service-Events<br/>Obtener categorías"]
    B -->|Lista categorías| A
    A -->|POST /events| C["Service-Events<br/>Crear evento"]
    C -->|Event creado| A
    A -->|POST /tickettypes| D["Service-Events<br/>Crear tipos entrada"]
    D -->|TicketType creado| A
```

### 4. **Roles y Permisos**

| Rol | Operaciones Permitidas | Endpoints |
|-----|------------------------|-----------|
| **Admin** | Ver/crear/editar categorías, ver usuarios, auditoría | `/admin-profiles/*`, `/categories/*` |
| **Promotor** | Crear/editar/eliminar eventos propios, crear tipos entrada | `/events/*`, `/tickettypes/*`, `/promotor-profiles/*` |
| **Buyer** | Ver eventos, ver perfil, comprar entradas (futuro) | `/events/*`, `/buyer-profiles/*`, `/users/me/` |

### 5. **Manejo de Errores**

Las APIs retornan errores con formato estándar:

```json
{
  "status": "error",
  "message": "Descripción del error",
  "details": {
    "field_name": ["Error specific del campo"]
  }
}
```

### 6. **Ejemplo: Crear Evento**

```javascript
// 1. Obtener token
const loginResponse = await fetch('http://localhost:8001/api/v1/token/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'promotor@example.com',
    password: 'password123'
  })
});
const { access } = await loginResponse.json();

// 2. Obtener categorías
const categoriesResponse = await fetch('http://localhost:8002/api/v1/categories/', {
  headers: { 'Authorization': `Bearer ${access}` }
});
const categories = await categoriesResponse.json();

// 3. Crear evento
const eventResponse = await fetch('http://localhost:8002/api/v1/events/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Concierto de Rock',
    description: 'Un increíble concierto',
    event_date: '2026-06-15',
    event_time: '20:00:00',
    location: 'Auditorio Nacional',
    capacity: 2000,
    category: categories[0].id,
    status: 'draft'
  })
});
const event = await eventResponse.json();
```

### 7. **Paginación**

```
GET /api/v1/events/?page=1

Respuesta:
{
  "count": 150,
  "next": "http://localhost:8002/api/v1/events/?page=2",
  "previous": null,
  "results": [...]
}
```

### 8. **Filtrado**

```
GET /api/v1/events/?status=published&category=uuid&event_date=2026-06-15
GET /api/v1/events/?search=concierto&ordering=-event_date
```

---

## 📝 Notas Importantes

### Seguridad
- Los tokens JWT expiran en **15 minutos**
- Los refresh tokens expiran en **1 día**
- Las contraseñas se hashean con PBKDF2
- Las peticiones deben incluir el header `Authorization: Bearer {token}`

### Base de Datos
- Los eventos se eliminan **lógicamente** (soft delete) para mantener historial de compras
- Las cuentas de usuario se eliminan **físicamente** cuando se confirma
- Los IDs son **UUIDs** para mejor seguridad

### CORS
- Configurado para `http://localhost:3000` (frontend local)
- También permite `http://frontend:3000` (Docker)

---

## 🔄 Próximas Implementaciones

- [ ] Endpoint de compra de entradas (service-tickets)
- [ ] Reportes de ventas (service-reports)
- [ ] Sistema de notificaciones (email)
- [ ] Pagos integrados (Stripe/MercadoPago)
- [ ] WebSockets para actualizaciones en tiempo real

---

**Para acceder a la documentación interactiva, abre Swagger UI en el puerto correspondiente de cada servicio.**
