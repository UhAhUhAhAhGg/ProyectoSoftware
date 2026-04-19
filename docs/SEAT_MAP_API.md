# API de Mapa de Asientos — Especificación mínima

Este documento describe los endpoints y mensajes esperados por el frontend para soportar mapa de asientos en tiempo real, bloqueo temporal y flujo de compra. Está pensado como guía para que el equipo backend implemente las rutas necesarias.

Principios:
- Todas las respuestas JSON deben usar `application/json`.
- Autenticación: usar `Authorization: Bearer <token>` para endpoints que modifiquen estado (lock, purchase, release).
- Manejar concurrencia: devolver 409 cuando haya conflictos de plazas.

---

## 1) Obtener seat-map

GET /api/v1/events/{event_id}/seat-map/?ticket_type={ticket_type_id}

Descripción: devuelve el estado actual de plazas (ocupadas/reservadas) para un tipo de ticket.

Response 200
{
  "event_id": 123,
  "ticket_type_id": 45,
  "rows": 12,
  "seats_per_row": 20,
  "occupiedSeats": ["A1","A2","B5"],
  "reservedSeats": [{ "seat": "C3", "until": "2026-04-19T15:23:00Z" }]
}

Notas:
- `occupiedSeats` incluye plazas definitivamente vendidas/ocupadas.
- `reservedSeats` opcional: locks temporales con `until` ISO.

Ejemplo curl:
```
curl -s "https://api.example.com/api/v1/events/123/seat-map/?ticket_type=45"
```

---

## 2) Bloquear temporalmente plazas (seat-lock)

POST /api/v1/events/{event_id}/seat-lock/

Headers: `Authorization: Bearer <token>`

Body JSON
{
  "seats": ["A1","A2"],
  "hold_seconds": 120
}

Success 200
{
  "lock_id": "lock-uuid-abc123",
  "event_id": 123,
  "seats": ["A1","A2"],
  "expires_at": "2026-04-19T15:24:30Z"
}

Conflict 409 (si alguna plaza ya ocupada o bloqueada por otro)
{
  "error": "seats_unavailable",
  "conflicting_seats": ["A2"]
}

Notas:
- El lock debe reservar las plazas durante `hold_seconds`. Retornar 409 si no se puede reservar.
- El servidor puede imponer un máximo por user/IP para evitar DOS.

---

## 3) Extender y liberar locks

PATCH /api/v1/events/{event_id}/seat-lock/{lock_id}/extend/
Body: { "hold_seconds": 60 }

DELETE /api/v1/events/{event_id}/seat-lock/{lock_id}/release/

Responses: 200 con estado actualizado o 404/410 si el lock no existe.

---

## 4) Mensajes WebSocket para actualizaciones en tiempo real

Endpoint WS: `ws(s)://<host>/ws/events/{event_id}/seats/`

Mensajes (JSON) que el servidor debe emitir cuando cambie disponibilidad:

1) Estado completo (broadcast):
{
  "type": "seat_map",
  "occupiedSeats": ["A1","B2"],
  "reservedSeats": [{"seat":"C3","until":"2026-04-19T15:24:00Z"}],
  "timestamp": "2026-04-19T15:20:00Z"
}

2) Evento incremental (opcional):
{
  "type": "seat_locked",
  "seat": "C3",
  "lock_id": "lock-uuid-...",
  "until": "2026-04-19T15:24:00Z"
}

3) Evento de compra:
{
  "type": "seat_purchased",
  "seats": ["A1","A2"],
  "order_id": 9876
}

Notas:
- El frontend acepta tanto estado completo como eventos incrementales para mantener UI en sync.

---

## 5) Flujo de compra (sincronizar lock → purchase)

1. Frontend: POST `/seat-lock/` para reservar plazas temporalmente.
2. Backend devuelve `lock_id`.
3. Frontend: confirmar pago / realizar compra con `POST /api/v1/purchase/` incluyendo `seats` y `lock_id`:

POST /api/v1/purchase/
{
  "event_id": 123,
  "ticket_type_id": 45,
  "seats": ["A1","A2"],
  "lock_id": "lock-uuid-abc123"
}

Respuesta exitosa 200/201:
{
  "purchase_id": 9876,
  "status": "confirmed",
  "seats": ["A1","A2"]
}

Si el `lock_id` expiró o fue liberado, retornar 409 con detalle:
{
  "error": "lock_expired",
  "conflicting_seats": ["A2"]
}

Recomendación: backend debe verificar atomically (en la misma transacción) que las plazas del `lock_id` siguen disponibles antes de marcar como vendidas.

---

## 6) Requisitos/consideraciones operativas

- Idempotency: aceptar cabecera `Idempotency-Key` en el endpoint de compra para evitar cobros duplicados si el cliente reintenta.
- Seguridad: validar que el usuario que solicita `lock`/`purchase` está autorizado y que el `lock` pertenece a dicho usuario.
- Escalabilidad: emitir mensajes WS desde el proceso que cambia estado (o a través de pub/sub) para evitar race conditions.
- TTL y limpieza: los locks deben expirar y liberarse automáticamente.

---

## 7) Ejemplos curl rápidos

Lock seats:
```
curl -X POST "https://api.example.com/api/v1/events/123/seat-lock/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"seats":["A1","A2"],"hold_seconds":120}'
```

Purchase (usar `lock_id` devuelto):
```
curl -X POST "https://api.example.com/api/v1/purchase/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id":123,"ticket_type_id":45,"seats":["A1","A2"],"lock_id":"lock-uuid-abc123"}'
```

---

Si quieres, puedo:
- generar especificación OpenAPI/Swagger mínima para estos endpoints, o
- añadir un mock server (Express/Flask) con estas rutas para pruebas locales.

Fin del documento.
