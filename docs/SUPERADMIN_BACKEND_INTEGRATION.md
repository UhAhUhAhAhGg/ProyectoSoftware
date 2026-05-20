# SuperAdmin Dashboard - Guía de Integración Backend

## Endpoints Requeridos

El frontend espera los siguientes endpoints en el backend para que el SuperAdmin Dashboard funcione correctamente.

### Base URL
```
http://localhost:8000/api/v1/
```

---

## 1. Obtener Lista de Administradores

**Endpoint**: `GET /users/administrators/`

**Headers**:
```
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "nombre": "John Doe",
    "email": "john@example.com",
    "is_active": true,
    "role": "SuperAdmin",
    "permissions": ["manage_users", "manage_events", "manage_admins"],
    "created_at": "2024-01-15T10:30:00Z",
    "last_login": "2024-05-18T14:20:00Z"
  },
  {
    "id": 2,
    "nombre": "Jane Smith",
    "email": "jane@example.com",
    "is_active": true,
    "role": "Administrador",
    "permissions": ["manage_events", "view_reports"],
    "created_at": "2024-02-20T11:00:00Z",
    "last_login": "2024-05-17T09:30:00Z"
  }
]
```

---

## 2. Obtener Solicitudes Pendientes de Administrador

**Endpoint**: `GET /users/pending_admins/`

**Headers**:
```
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
[
  {
    "id": 5,
    "nombre": "Carlos Martinez",
    "email": "carlos@example.com",
    "requested_at": "2024-05-16T15:45:00Z",
    "reason": "Necesito gestionar eventos en mi región",
    "status": "pending"
  }
]
```

---

## 3. Obtener Detalles de Administrador

**Endpoint**: `GET /users/{user_id}/`

**Headers**:
```
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "nombre": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "is_active": true,
  "role": "SuperAdmin",
  "permissions": ["manage_users", "manage_events", "manage_admins"],
  "profile_photo_url": null,
  "created_at": "2024-01-15T10:30:00Z",
  "last_login": "2024-05-18T14:20:00Z",
  "deactivation_reason": null
}
```

---

## 4. Actualizar Permisos de Administrador

**Endpoint**: `PATCH /users/{user_id}/permissions/`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "permissions": ["manage_users", "manage_events", "view_reports"]
}
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "nombre": "John Doe",
  "email": "john@example.com",
  "permissions": ["manage_users", "manage_events", "view_reports"]
}
```

---

## 5. Desactivar Administrador

**Endpoint**: `PATCH /users/{user_id}/`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "is_active": false,
  "deactivation_reason": "Razón de desactivación"
}
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "nombre": "John Doe",
  "email": "john@example.com",
  "is_active": false,
  "deactivation_reason": "Razón de desactivación"
}
```

---

## 6. Reactivar Administrador

**Endpoint**: `PATCH /users/{user_id}/`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "is_active": true,
  "deactivation_reason": null
}
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "nombre": "John Doe",
  "email": "john@example.com",
  "is_active": true
}
```

---

## 7. Aprobar Solicitud de Administrador

**Endpoint**: `POST /users/{user_id}/approve_admin/`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "permissions": ["manage_events", "view_reports"]
}
```

**Response (200 OK)**:
```json
{
  "id": 5,
  "nombre": "Carlos Martinez",
  "email": "carlos@example.com",
  "role": "Administrador",
  "permissions": ["manage_events", "view_reports"],
  "status": "approved"
}
```

---

## 8. Rechazar Solicitud de Administrador

**Endpoint**: `POST /users/{user_id}/reject_admin/`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "reason": "No cumple los requisitos necesarios"
}
```

**Response (200 OK)**:
```json
{
  "id": 5,
  "nombre": "Carlos Martinez",
  "email": "carlos@example.com",
  "status": "rejected",
  "rejection_reason": "No cumple los requisitos necesarios"
}
```

---

## 9. Invitar Usuario a ser Administrador

**Endpoint**: `POST /users/invite_admin/`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "email": "newadmin@example.com",
  "permissions": ["manage_events", "view_reports"]
}
```

**Response (201 Created)**:
```json
{
  "id": 10,
  "email": "newadmin@example.com",
  "invitation_sent": true,
  "invitation_token": "token_here",
  "invitation_expires_at": "2024-06-01T15:45:00Z"
}
```

---

## 10. Obtener Estadísticas de Administradores

**Endpoint**: `GET /users/admin_stats/`

**Headers**:
```
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
{
  "total_admins": 5,
  "active_admins": 4,
  "inactive_admins": 1,
  "pending_requests": 2,
  "total_permissions_assigned": 18,
  "last_updated": "2024-05-18T15:45:00Z"
}
```

---

## 11. Obtener Audit Log de Administrador

**Endpoint**: `GET /users/{user_id}/audit_log/?limit=50`

**Headers**:
```
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "action": "permissions_updated",
    "description": "Permisos actualizados: manage_users, manage_events",
    "performed_by": "superadmin@example.com",
    "timestamp": "2024-05-18T14:30:00Z",
    "details": {
      "old_permissions": ["manage_users"],
      "new_permissions": ["manage_users", "manage_events"]
    }
  },
  {
    "id": 2,
    "action": "account_deactivated",
    "description": "Cuenta desactivada",
    "performed_by": "superadmin@example.com",
    "timestamp": "2024-05-17T10:15:00Z",
    "details": {
      "reason": "Inactividad prolongada"
    }
  }
]
```

---

## Validaciones y Requisitos

### Seguridad
- ✅ Todos los endpoints requieren autenticación (Bearer token)
- ✅ Solo SuperAdmin puede acceder a estos endpoints
- ✅ Se debe validar que no se desactive el único SuperAdmin

### Permisos Válidos
```
- manage_users: Gestionar Usuarios
- manage_events: Gestionar Eventos
- manage_admins: Gestionar Administradores
- view_reports: Ver Reportes
- manage_queue: Gestionar Cola
- system_config: Configuración del Sistema
```

### Estados Esperados
```
- active: Administrador activo
- inactive: Administrador inactivo
- pending: Solicitud pendiente
- approved: Solicitud aprobada
- rejected: Solicitud rechazada
```

---

## Manejo de Errores

### 401 Unauthorized
```json
{
  "detail": "Token no válido o expirado"
}
```

### 403 Forbidden
```json
{
  "detail": "No tienes permisos para realizar esta acción"
}
```

### 404 Not Found
```json
{
  "detail": "Administrador no encontrado"
}
```

### 400 Bad Request
```json
{
  "permissions": ["Campo requerido"],
  "email": ["Email inválido"]
}
```

### 409 Conflict
```json
{
  "detail": "No se puede desactivar al único SuperAdmin"
}
```

---

## Pruebas

### Con cURL
```bash
# Obtener administradores
curl -H "Authorization: Bearer token_here" \
  http://localhost:8000/api/v1/users/administrators/

# Actualizar permisos
curl -X PATCH \
  -H "Authorization: Bearer token_here" \
  -H "Content-Type: application/json" \
  -d '{"permissions": ["manage_users", "view_reports"]}' \
  http://localhost:8000/api/v1/users/1/permissions/
```

### Con Python/Requests
```python
import requests

headers = {"Authorization": "Bearer token_here"}
url = "http://localhost:8000/api/v1/users/administrators/"

response = requests.get(url, headers=headers)
admins = response.json()
```

---

## Notas Importantes

1. El campo `nombre` es el nombre completo del usuario
2. Los `permissions` son siempre un array de strings
3. El `id` es el ID del usuario en la base de datos
4. `is_active` controla si un administrador puede acceder al sistema
5. `last_login` se actualiza automáticamente en cada autenticación exitosa
6. `created_at` es de solo lectura
7. Los cambios de permisos deben auditarse automáticamente en el backend
