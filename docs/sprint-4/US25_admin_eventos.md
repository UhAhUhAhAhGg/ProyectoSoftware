# US-25 — Modificación y baja de eventos por Administrador

## Resumen

El Administrador (con `manage_events`) o el SuperAdmin pueden editar cualquier evento de la plataforma y darlo de baja con motivo obligatorio. La vista de edición es **la misma del Promotor** — incluye todos los campos y la gestión de tipos de entrada — con un bloque adicional de "Control Administrativo".

## Endpoints

| Método | URL | Capability | Descripción |
|---|---|---|---|
| PATCH | `/api/v1/admin/events/{id}/` | `manage_events` | Editar cualquier campo del evento (TIC-406) |
| PATCH | `/api/v1/admin/events/{id}/deactivate/` | `manage_events` | Dar de baja con motivo (TIC-407) |
| PATCH | `/api/v1/admin/events/{id}/baja/` | `manage_events` | Variante paralela (Ariana) |
| PATCH | `/api/v1/admin/events/{id}/modificar/` | `manage_events` | Variante paralela (Ariana) |

Los endpoints registran cada cambio en `EventAuditLog` con snapshot antes/después de los campos modificados.

## Frontend

- Acceso desde [`AdminEventsTable.jsx`](../../frontend/src/components/dashboard/admin/AdminEventsTable.jsx) (botones de editar / dar de baja por fila).
- Editor unificado: [`FormularioEvento.jsx`](../../frontend/src/components/dashboard/eventos/FormularioEvento.jsx) con prop `adminMode={true}` — reusa el formulario del Promotor, mostrando además:
  - Selector de estado del evento (Borrador / Activo / Dado de baja / Finalizado).
  - Textarea de motivo / notas administrativas (se guardan en `EventAuditLog`).
- Modal de baja en la tabla con razón obligatoria y mensaje de validación inline.

## Reglas

- **No es el promotor dueño**: el endpoint admin permite editar eventos de cualquier promotor; el endpoint genérico `PATCH /events/{id}/` sigue restringido al dueño.
- **Eventos finalizados**: cuando `event_date < hoy`, un job lazy en `EventViewSet.get_queryset` los marca como `completed` y los oculta a los compradores. Los admins los siguen viendo.
- **Categoría como FK**: el endpoint admin acepta `category` como UUID y lo resuelve a instancia `Category` antes de persistir.

## Pruebas manuales

1. Como admin con `manage_events`, abrir Gestión de Eventos → "Editar" en cualquier evento → cambiar el nombre/fecha + motivo → guardar → ver en Auditoría la entrada `edit` con los `changed_fields`.
2. Dar de baja sin seleccionar motivo → el modal muestra el mensaje "Debes seleccionar una razón antes de confirmar la baja".
3. Confirmar baja con motivo válido → status pasa a `cancelled` / `admin_status='deactivated'`.
4. Admin sin `manage_events`: el sidebar oculta "Gestión de Eventos" y un `PATCH` directo por API devuelve **403**.
