# HU-13: Compra Única por Evento

## Descripción
Como sistema, debo impedir que un comprador adquiera más de una entrada para el mismo evento, mostrando un mensaje claro si lo intenta.

## Subtareas
1. Validación en backend (respuesta 409 Conflict) - COMPLETADA
2. Restricción a nivel de base de datos (UniqueConstraint) - COMPLETADA
3. Mensaje claro en frontend cuando se intenta compra duplicada - COMPLETADA

## Implementación Técnica

### Backend - Modelo
- **Archivo**: `service-events/events/models.py`
- **Constraint**: `UniqueConstraint` en el modelo `Purchase`:
  ```python
  constraints = [
      models.UniqueConstraint(
          fields=['user_id', 'event'],
          condition=models.Q(status__in=['active', 'pending']),
          name='unique_active_purchase_per_user_event'
      )
  ]
  ```
- Solo aplica a compras con status `active` o `pending` (permite recomprar si la anterior fue `cancelled`)

### Backend - Vista
- **Archivo**: `service-events/events/views.py` → `PurchaseView`
- **Verificación**: Antes de crear una nueva compra, verifica:
  ```python
  existing_purchase = Purchase.objects.filter(
      user_id=user_id,
      event=event,
      status__in=['active', 'pending']
  ).exists()
  ```
- **Respuesta si duplicada**: HTTP 409 con:
  ```json
  {
    "error": "Ya tienes una entrada para este evento. Revisa tu historial de compras.",
    "error_code": "DUPLICATE_PURCHASE"
  }
  ```

### Frontend
- **Archivo**: `frontend/src/services/eventosService.js` → `realizarCompra()`
- Captura el status code de la respuesta HTTP y lo adjunta al error:
  ```javascript
  error.status = res.status;
  error.errorCode = data.error_code;
  ```

- **Archivo**: `frontend/src/components/dashboard/eventos/DetalleEvento.jsx`
- Detecta error 409 y muestra mensaje específico:
  ```
  🛑 Ya compraste una entrada para este evento. Revisa tu historial en "Mis Compras".
  ```
- Otros errores muestran mensaje genérico

## Pruebas Manuales

### Prerrequisitos
1. Docker levantado: `docker compose up`
2. Evento publicado con entradas disponibles
3. Cuenta de comprador: `comprador@ticketproject.com` / `Comprador1234!`

### Caso 1: Primera compra exitosa
1. Login como comprador
2. Ir a un evento → seleccionar tipo de entrada → "Pagar con QR"
3. En el modal, click "Simular pago (modo desarrollo)"
4. **Resultado esperado**: Pago exitoso, se genera QR y código de respaldo

### Caso 2: Intento de compra duplicada
1. Con la misma cuenta, volver al mismo evento
2. Intentar comprar otra entrada (click "Pagar con QR")
3. **Resultado esperado**: Aparece el mensaje "🛑 Ya compraste una entrada para este evento..."
4. **NO** se abre el modal de pago

### Caso 3: Compra a diferente evento
1. Con la misma cuenta, ir a un DIFERENTE evento
2. Comprar una entrada
3. **Resultado esperado**: La compra se realiza normalmente (la restricción es por evento)

### Caso 4: Recompra tras cancelación
1. Si una compra previa fue cancelada (status='cancelled')
2. Intentar comprar nuevamente para ese mismo evento
3. **Resultado esperado**: La compra se permite (el constraint solo aplica a active/pending)

### Verificación por API (Postman/curl)
```bash
# Primera compra (debería funcionar)
curl -X POST http://localhost:8002/api/v1/purchase/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "<uuid>", "ticket_type_id": "<uuid>", "quantity": 1}'

# Segunda compra al mismo evento (debería devolver 409)
curl -X POST http://localhost:8002/api/v1/purchase/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "<uuid>", "ticket_type_id": "<uuid>", "quantity": 1}'
# Respuesta esperada: 409 Conflict con error_code: "DUPLICATE_PURCHASE"
```

## Archivos Relacionados
| Archivo | Descripción |
|---------|-------------|
| `service-events/events/models.py` | UniqueConstraint en modelo Purchase |
| `service-events/events/views.py` | PurchaseView - verificación de duplicados |
| `frontend/src/services/eventosService.js` | realizarCompra() con status code |
| `frontend/src/components/dashboard/eventos/DetalleEvento.jsx` | Manejo de error 409 |
