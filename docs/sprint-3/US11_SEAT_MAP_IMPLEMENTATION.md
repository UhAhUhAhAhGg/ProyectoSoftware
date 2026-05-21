# 💺 US11 — Mapa de Asientos Interactivo

> **Estado:** ✅ COMPLETADA Y MERGEADA a `Sprint3_DEV`
> **Rama:** `feature/US11` (o la rama donde trabajó Marcia + tus correcciones)
> **Story Points:** 13 SP | **Microservicio principal:** `service-events`

---

## 📖 Historia de Usuario

> Como comprador, quiero ver y seleccionar un asiento disponible al momento de comprar una entrada, para elegir mi lugar preferido en el evento.

---

## ✅ Todo lo implementado

### Backend — `service-events`

#### Modelo `Seat` (ya existe en BD)
Tabla en `service-events/events/models.py`. Cada asiento pertenece a un `TicketType`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador único |
| `ticket_type` | FK → TicketType | Zona/tipo de entrada al que pertenece |
| `seat_code` | VARCHAR(20) | Código del asiento ej: `"F-03"` |
| `row` | VARCHAR(10) | Fila (ej: `"F"`) |
| `number` | INT | Número de columna |
| `status` | VARCHAR(20) | `available` / `reserved` / `sold` |
| `reserved_by` | UUID | UUID del usuario que lo reservó |
| `reserved_at` | TIMESTAMP | Cuándo fue reservado |

#### Endpoints implementados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/seats/?ticket_type_id={id}` | Lista asientos con su estado actual. Los crea automáticamente (seed) si es la primera consulta. |
| `POST` | `/api/v1/seats/bulk-reserve/` | **Reserva atómica** de múltiples asientos en una sola transacción SQL |
| `POST` | `/api/v1/seats/{id}/release/` | Libera un asiento reservado (cancelación) |

#### Lógica atómica anti-concurrencia (`SeatBulkReserveView`)
- Usa `transaction.atomic()` + `select_for_update(nowait=True)`
- Si **cualquier** asiento de la selección ya fue tomado → **rollback total**, no quedan asientos "fantasma"
- Responde `409 Conflict` con la lista de asientos en conflicto

#### Filtro anti-doble compra en `PurchaseHistoryView`
- Acepta parámetro `?event_id=<uuid>` para filtrar el historial por evento específico
- Evita el bug de paginación (usuario con muchas compras no bypasea el bloqueo)

### Frontend — `service-events` / `frontend`

#### `SeatMapModal.jsx` + `SeatMap.jsx`
- Modal interactivo que muestra la cuadrícula de asientos por zona
- Estados visuales: `disponible` (verde) / `seleccionado` (azul) / `ocupado` (gris)
- Sincronización en tiempo real vía **WebSocket** con fallback a **polling cada 5s**
- Si el backend devuelve `409 Conflict`, muestra alerta y refresca el mapa automáticamente

#### `VenueLayoutPreview.jsx`
- Vista previa en las tarjetas de tipo de entrada
- Oscurece proporcionalmente los puntos de asiento según `cupoVendido / cupoMaximo`

#### `DetalleEvento.jsx`
- Al cargar, consulta `GET /api/v1/purchases/history/?event_id={id}` con el token del usuario
- Si existe una compra `active` o `pending` → deshabilita el botón y muestra **"Ya compraste entrada"**
- Actualizado: usa `history.results.some(...)` (respeta la estructura paginada del backend)

#### `eventosService.js`
- `mapEvento()`: calcula `boletosVendidos` sumando `cupoVendido` de todos los tipos de entrada
- `lockSeats()`: refactorizado para usar el nuevo endpoint `bulk-reserve` en lugar de reservas individuales

---

## 🧪 Criterios de Aceptación — Estado

| PA | Descripción | Estado |
|----|-------------|--------|
| PA1 | Comprador ve el mapa/lista de asientos por zonas | ✅ |
| PA2 | Asiento disponible → se puede seleccionar (cambio visual) | ✅ |
| PA3 | Asiento ocupado → NO se puede seleccionar | ✅ |
| PA4 | Selección validada en backend; si fue tomado simultáneamente → error | ✅ |
| PA5 | Cuando un usuario compra, el mapa de los demás se actualiza sin recargar | ✅ |
| PA6 | El sistema permite multi-selección y muestra el total | ✅ |

---

## 🔜 Pendiente / Deuda técnica conocida

- El servidor de desarrollo de Next.js (Turbopack) puede mostrar un **404 temporal** después de editar código rápidamente. Solución: `Ctrl+C` y reiniciar `npm run dev`.
- La tabla `Seat` en `service-events` fue el punto de partida. `service-queue` la referencia lógicamente (ver US20).
