# US-26 — Auditoría unificada (eventos + usuarios)

## Resumen

Toda acción administrativa queda registrada automáticamente en dos tablas de auditoría:

- **`EventAuditLog`** (en `service-events`) — acciones sobre eventos: `edit`, `deactivate`, `reactivate`.
- **`AdminAuditLog`** (en `service-auth`) — acciones sobre usuarios y administradores: `suspend`, `reactivate`, `ban`, `create_admin`, `update_admin`, `delete`, `grant_superadmin`, `revoke_superadmin`.

El frontend las consume en paralelo y las muestra en una **tabla unificada** con columna "Tipo" (📅 Evento / 👤 Usuario).

## Endpoints

| Método | URL | Capability | Descripción |
|---|---|---|---|
| GET | `/api/v1/admin/audit-log/` | `view_reports` | Historial de eventos (filtros + paginación) |
| GET | `/api/v1/admin/audit-log-v2/` | `view_reports` | Variante paralela con filtros en español |
| GET | `/api/v1/admin/events/{id}/audit-log/` | `view_reports` | Detalle por evento |
| GET | `/api/v1/admin/events/{id}/audit-log-v2/` | `view_reports` | Variante paralela |
| GET | `/api/v1/admin/audit-log/export/` | `view_reports` | Exportar CSV |
| GET | `/api/v1/users/admin-audit-log/` | `view_reports` | Historial de acciones sobre usuarios |

## Frontend

- Servicio: [`adminAuditService.js`](../../frontend/src/services/adminAuditService.js) — `getAuditLogs` consulta ambos endpoints en paralelo y mergea por `created_at` desc.
- Componente: [`AdminAuditoria.jsx`](../../frontend/src/components/dashboard/admin/AdminAuditoria.jsx) — tabla con filtros (fechas, tipo de acción, administrador), búsqueda, paginación, exportar CSV.
- Cada fila incluye:
  - **Tipo**: pill 📅 Evento o 👤 Usuario.
  - **Acción**: edición / baja / reactivación / suspender / ban / crear-admin / actualizar permisos.
  - **Objetivo**: nombre del evento o email del usuario afectado.
  - **Detalles**: para eventos, snapshot antes→después de cada campo modificado; para usuarios, motivo + cambio de `account_status`.

## Acceso

- Admins con `view_reports`: ven el log en su panel.
- SuperAdmin: bypass automático, ve también desde su propio panel.

## Pruebas manuales

1. Suspender un comprador → entrar a "Log de Auditoría" → aparece fila tipo 👤 Usuario, acción "Suspender cuenta", objetivo = email, detalles = motivo + `active → suspended`.
2. Editar un evento desde el panel admin → aparece fila tipo 📅 Evento, acción "edit", detalles con los campos modificados.
3. Cambiar permisos a un admin desde el panel SuperAdmin → aparece fila acción `update_admin` con `Permisos: [antes] → [después]`.
4. Filtrar por fecha / tipo de acción / administrador → la tabla se actualiza.
5. "Exportar CSV" → descarga `audit_log_YYYY-MM-DD.csv`.
6. Admin sin `view_reports`: la pestaña "Log de Auditoría" no aparece en el sidebar.
