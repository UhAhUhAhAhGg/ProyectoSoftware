# US-24 — Panel SuperAdmin + Permisos granulares (estado canónico)

> Este documento describe el estado **actual y final** de US-24 después de los fixes de TIC-398, TIC-443, TIC-445, TIC-446 y TIC-447. Los archivos `SUPERADMIN_*.md` son históricos de la entrega inicial y conservan el contexto previo.

## Resumen

El SuperAdmin (`is_superadmin=True`) gestiona la lista de Administradores: los crea con datos completos + permisos iniciales, modifica sus permisos en cualquier momento, los suspende/reactiva, y revisa la auditoría consolidada. Los Administradores normales tienen **permisos granulares** (`User.admin_permissions`) que controlan qué secciones del panel ven y qué endpoints pueden invocar.

## Capabilities

Definidas en [`service-auth/users/permissions.py`](../../service-auth/users/permissions.py) (`ADMIN_CAPABILITIES`):

| Capability | Habilita |
|---|---|
| `manage_users` | Gestión de Promotores y Compradores (US-23) |
| `manage_events` | Edición y baja de eventos (US-25) |
| `view_reports` | Log de auditoría y reportes (US-26) |
| `manage_queue` | Gestión de cola virtual |
| `system_config` | Configuración global del sistema |

> `manage_admins` **no es una capability asignable**: la gestión de administradores es prerrogativa exclusiva del SuperAdmin (`is_superadmin=True`). El backend descarta silenciosamente este valor si llega.

## Flujo de enforcement

1. **JWT enriquecido**: al login, el JWT incluye `admin_permissions`, `is_superadmin`, `is_staff` (ver [`serializers.py`](../../service-auth/users/serializers.py) `LoginSerializer` y `AdminLoginSerializer`, y [`jwt_serializers.py`](../../service-auth/users/jwt_serializers.py)).
2. **Backend `service-auth`**: `HasAdminCapability('manage_users')` decora cada endpoint sensible. Bypass automático para `is_superadmin=True`.
3. **Backend `service-events`**: `JWTUser` lee `admin_permissions` de los claims y los endpoints `/admin/*` los validan con el mismo helper local.
4. **Frontend `AuthContext`**: hace polling cada 60s a `/users/me/`, merge `admin_permissions` + `is_superadmin` sin re-login. Expone `hasPermission(cap)`.
5. **Frontend `AdminDashboard`**: cada item del sidebar tiene `requiredPermission`. Items sin permiso se ocultan; deep-links muestran un componente `SinPermisos`.

## Endpoints exclusivos del SuperAdmin

| Método | URL | Acción |
|---|---|---|
| GET | `/users/superadmin/admins/` | Listar admins con permisos y estado |
| POST | `/users/superadmin/admins/` | Crear nuevo Administrador (capabilities iniciales) |
| PATCH | `/users/{id}/superadmin/admins/permissions/` | Modificar capabilities |
| PATCH | `/users/{id}/superadmin/admins/suspend/` | Suspender admin (motivo obligatorio) |
| PATCH | `/users/{id}/superadmin/admins/reactivate/` | Reactivar admin |

> El POST y el PATCH de permisos **sanitizan** la lista contra `ADMIN_CAPABILITIES` — cualquier capability inválida (incluido `manage_admins`) se descarta antes de persistir.

## Frontend

- Panel: [`frontend/src/pages/SuperAdminDashboard.jsx`](../../frontend/src/pages/SuperAdminDashboard.jsx).
- Componentes:
  - [`AdminTable.jsx`](../../frontend/src/components/dashboard/admin/AdminTable.jsx) — tabla con modal "Gestionar Permisos" (5 checkboxes).
  - [`SuperAdminCrearAdmin.jsx`](../../frontend/src/components/dashboard/admin/SuperAdminCrearAdmin.jsx) — formulario de creación directa.
  - [`SuperAdminSolicitudes.jsx`](../../frontend/src/components/dashboard/admin/SuperAdminSolicitudes.jsx) — pendientes.
  - [`AdminAuditoria.jsx`](../../frontend/src/components/dashboard/admin/AdminAuditoria.jsx) — historial unificado.

## Pruebas manuales (PAs Sprint 4)

1. **TIC-443 (crear admin con permisos)**: como SuperAdmin → "Crear nuevo Administrador" → llenar formulario + marcar `manage_events` → guardar. El admin aparece en la tabla con ese permiso.
2. **TIC-444 (acceso negado a admin estándar)**: login como ese admin → intenta `/superadmin/dashboard` → redirige a `/admin/dashboard` (no es SuperAdmin).
3. **TIC-445 (aplicación inmediata)**: SuperAdmin abre "Gestionar Permisos" del admin y le agrega `manage_users` → en la pestaña del admin, sin recargar, en ≤60s aparece "Gestionar Usuarios" en el sidebar.
4. **TIC-446 (no gestionar SuperAdmin)**: un admin con `manage_users` intentando suspender al SuperAdmin → 403.
5. **TIC-447 (auditoría)**: suspender/reactivar un admin → aparece la entrada en "Auditoría" con tipo "Usuario" y la acción correspondiente.
6. **Bypass SuperAdmin**: SuperAdmin con `admin_permissions=[]` → sigue viendo TODAS las secciones (bypass por `is_superadmin=True`).
