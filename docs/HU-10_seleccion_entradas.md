# HU-10: Selección de Tipo de Entrada

## Descripción
Como comprador, quiero seleccionar el tipo de entrada que deseo comprar para un evento.

## Subtareas
1. Mostrar tipos de entrada por evento - COMPLETADA
2. Selección de tipo y cantidad - COMPLETADA (cantidad fija = 1 por la restricción TIC-13)
3. Resumen de selección antes de pago - COMPLETADA (integrado en ModalPagoQR)

## Implementación Técnica

### Backend
- **Endpoint**: `GET /api/v1/events/<uuid>/` (service-events:8002)
- Retorna el evento con sus `ticket_types` que incluyen:
  - `id`, `name` (nombre de la zona/tipo), `price`, `zone_type` (VIP/General/etc), `capacity`, `available` (entradas disponibles)

### Frontend
- **Componente**: `frontend/src/components/dashboard/eventos/DetalleEvento.jsx`
  - Sección "Tipos de entrada" renderiza cada ticket_type del evento
  - Muestra: nombre de la zona, tipo (VIP/General), precio en Bs., entradas disponibles
  - Botón "Pagar con QR" por cada tipo de entrada
  - Al hacer click:
    1. Llama a `eventosService.realizarCompra(eventoId, ticketTypeId, 1)`
    2. Si éxito → abre `ModalPagoQR` con datos de la orden
    3. Si error 409 → muestra mensaje "Ya compraste una entrada para este evento"
    4. Si otro error → muestra mensaje genérico

- **Servicio**: `frontend/src/services/eventosService.js`
  - `realizarCompra(eventoId, ticketTypeId, quantity)` - POST a `/api/v1/purchase/`
  - Incluye manejo de status code para diferenciar errores

## Flujo Completo
1. Comprador ve detalle de evento → ve sección "Tipos de entrada"
2. Cada tipo muestra: nombre, zona, precio, disponibilidad
3. Click "Pagar con QR" → se crea orden en status pending
4. Se abre ModalPagoQR con QR de pago y temporizador de 15 min
5. (Continúa en HU-17: Pago con QR)

## Pruebas Manuales

### Prerrequisitos
1. Docker levantado: `docker compose up`
2. Evento publicado con al menos 2 tipos de entrada (ej: VIP y General)
3. Cuenta de comprador: `comprador@ticketproject.com` / `Comprador1234!`

### Caso 1: Ver tipos de entrada
1. Login como comprador
2. Ir a Explorar Eventos → click en un evento
3. Scroll a "Tipos de entrada"
4. **Resultado esperado**: Se ven los tipos con nombre, zona, precio y "X disponibles"

### Caso 2: Seleccionar tipo de entrada
1. En la sección de tipos de entrada, click "Pagar con QR" en un tipo
2. **Resultado esperado**: Se abre el modal de pago QR mostrando:
   - QR de pago
   - Resumen: evento, tipo de entrada, total
   - Temporizador de 15 minutos
   - Botón "Simular pago" (modo desarrollo)

### Caso 3: Tipo de entrada agotado
1. Si un tipo de entrada tiene 0 disponibles
2. **Resultado esperado**: El botón debe estar deshabilitado o mostrar "Agotado"

### Caso 4: Intento de compra duplicada
1. Comprar una entrada para un evento
2. Volver al mismo evento e intentar comprar otra entrada
3. **Resultado esperado**: Mensaje "🛑 Ya compraste una entrada para este evento. Revisa tu historial en Mis Compras"

## Archivos Relacionados
| Archivo | Descripción |
|---------|-------------|
| `frontend/src/components/dashboard/eventos/DetalleEvento.jsx` | Vista con tipos de entrada y botón de compra |
| `frontend/src/components/dashboard/eventos/ModalPagoQR.jsx` | Modal de pago con QR |
| `frontend/src/services/eventosService.js` | `realizarCompra()` |
| `service-events/events/views.py` | PurchaseView (crea la orden) |
| `service-events/events/models.py` | Purchase, TicketType models |
