# API de Cancelaciones de Eventos

Este documento describe los endpoints y la estructura de datos que el frontend espera del backend para soportar el registro y visualización de cancelaciones de eventos (PA2).

Principios:
- Todas las rutas requieren autenticación (token Bearer). Solo usuarios con rol `promoter` o `admin` pueden cancelar eventos.
- Las cancelaciones deben registrarse con quién la realizó, fecha y motivo.

Endpoints esperados

1) POST /api/v1/events/{id}/cancel/
- Descripción: Cancela el evento y registra meta datos de la cancelación.
- Autenticación: Bearer token (promoter/admin)
- Request body (JSON):
  {
    "reason": "Motivo público o interno",
    "internal_notes": "(opcional) notas adicionales",
    "notify_buyers": true
  }
- Response 200 (JSON): evento actualizado con campos de cancelación
  {
    "id": 123,
    "name": "Concierto XYZ",
    "status": "cancelled",
    "cancellation": {
      "date": "2026-04-07T12:34:56Z",
      "reason": "Condiciones climáticas",
      "internal_notes": "Cancelado por promotor",
      "by": {
        "id": 42,
        "username": "promotor_a",
        "display_name": "Promotor A"
      }
    }
  }

Notas: si el backend no soporta este endpoint, el frontend puede usar PATCH a `/api/v1/events/{id}/` con cuerpo que setee `status: "cancelled"` y un objeto `cancellation` o campos `cancellation_date`, `cancellation_reason`, `cancelled_by`.

2) GET /api/v1/events/{id}/cancellations/  (opcional)
- Descripción: devuelve historial de cancelaciones del evento (lista), útil si se registran múltiples cambios.
- Response 200 (JSON):
  [
    {
      "date": "2026-04-07T12:34:56Z",
      "reason": "Condiciones climáticas",
      "internal_notes": "",
      "by": { "id": 42, "username": "promotor_a", "display_name": "Promotor A" }
    }
  ]

3) GET /api/v1/events/{id}/  (detalle)
- Debe incluir, si existe, la propiedad `cancellation` (objeto) o los campos equivalentes:
  - `cancellation.date` o `cancellation_date`
  - `cancellation.reason` o `cancellation_reason`
  - `cancellation.by` o `cancelled_by` (objeto con id/username/display_name)

Campos esperados (frontend):
- `status` (string): 'published'|'cancelled'|'completed' etc.  (frontend usa mapping a 'activo','cancelado',...)
- `cancellation` (objeto) opcional:
  - `date` (ISO datetime)
  - `reason` (string)
  - `internal_notes` (string, opcional)
  - `by` (objeto) con `id`, `username`, `display_name`

Errores
- 401 Unauthorized: token faltante o inválido.
- 403 Forbidden: usuario sin permisos para cancelar.
- 404 Not Found: evento no existe.

Recomendaciones de implementación backend
- Registrar la acción en un modelo `EventCancellation` con referencias a `event`, `user`, `reason`, `notes`, `created_at`.
- Cuando se cancele un evento, actualizar `event.status='cancelled'` y rellenar `cancellation` o crear registro en `EventCancellation`.
- Emitir notificaciones a los compradores si `notify_buyers=true`.

Ejemplo de uso desde frontend
- Llamar a `POST /api/v1/events/{id}/cancel/` con `{ reason }`.
- Refrescar detalle del evento con `GET /api/v1/events/{id}/` y leer `cancellation`.

Fin de documento.
