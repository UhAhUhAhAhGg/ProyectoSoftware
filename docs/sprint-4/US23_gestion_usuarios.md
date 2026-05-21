# US-23 — Gestión de usuarios desde panel de Administrador

## Resumen

El Administrador puede listar promotores y compradores, suspender y reactivar cuentas (cambio temporal de `account_status`), y dar de baja permanente (`account_status='banned'`). Toda acción queda registrada en `AdminAuditLog` con motivo obligatorio.

## Endpoints

| Método | URL | Capability requerida | Descripción |
|---|---|---|---|
| GET | `/api/v1/users/promotores/` | `manage_users` | Lista paginada de Promotores |
| GET | `/api/v1/users/compradores/` | `manage_users` | Lista paginada de Compradores |
| POST | `/api/v1/admin/users/` | `manage_users` | Crear cuenta de Promotor/Comprador |
| PATCH | `/api/v1/users/{id}/suspend/` | `manage_users` | Suspender (motivo obligatorio) |
| PATCH | `/api/v1/users/{id}/reactivate/` | `manage_users` | Reactivar |
| PATCH | `/api/v1/users/{id}/ban/` | `manage_users` | Baja permanente (motivo obligatorio) |

> `manage_users` se asigna desde el panel SuperAdmin. El SuperAdmin tiene bypass automático. Ver [US24_permisos_granulares.md](./US24_permisos_granulares.md).

## Restricciones / reglas de negocio

- **Auto-protección (TIC-440)**: un admin no puede suspender ni dar de baja su propia cuenta. Backend devuelve 400.
- **Bloqueo de sesión activa**: cuando se suspende a un usuario logueado, el polling cada 60s del `AuthContext` recibe `403 ACCOUNT_SUSPENDED` y `apiHelper` fuerza logout mostrando el motivo en `/login`.
- **Email obligatorio único, motivo obligatorio en suspend/ban**, audit log siempre se escribe.

## Frontend

- Componente: [`frontend/src/components/dashboard/admin/AdminUsuarios.jsx`](../../frontend/src/components/dashboard/admin/AdminUsuarios.jsx) (parametrizado por `module='promotores'|'compradores'`).
- Modal de acción con motivo: [`AdminActionModal.jsx`](../../frontend/src/components/dashboard/admin/AdminActionModal.jsx).
- Sidebar del admin oculta esta sección si no tiene `manage_users`.

## Pruebas manuales (PA)

1. **Listar**: login como admin (con `manage_users`) → sidebar "Gestionar Usuarios → Promotores" → tabla con paginación y filtros por estado.
2. **Suspender**: en la fila de un usuario activo, abrir modal → exigir motivo → confirmar → la fila pasa a estado "suspendido" y aparece la acción en Auditoría.
3. **Sesión bloqueada**: en otra pestaña con sesión del usuario suspendido, en ≤60s aparece la pantalla de login con el motivo.
4. **Reactivar**: en la fila suspendida → reactivar → estado vuelve a "activo".
5. **Sin permiso**: login como admin sin `manage_users` → la sección no aparece en sidebar; con deep-link `?section=promotores` aparece "Sin permisos".
6. **Bypass por API (con permiso)**: `PATCH /users/{id}/suspend/` con token del admin que tiene `manage_users` → 200. Sin el permiso → **403** con `Falta el permiso 'manage_users'`.
