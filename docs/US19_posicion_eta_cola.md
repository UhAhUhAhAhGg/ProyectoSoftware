# HS-19 — Posición en Cola y Tiempo Estimado de Espera (ETA)

> **Estado:** ✅ IMPLEMENTADA (Backend) — Rama `US19` lista para merge
> **TICs de Gustavo:** TIC-309, TIC-311
> **TICs de compañeros:** TIC-308, TIC-310 (Ariana/Frontend), TIC-312, TIC-313 (Alex)

---

## 📖 Historia de Usuario

> Como comprador, quiero ver mi posición actual en la cola y el tiempo estimado de espera, para decidir si continúo esperando o regreso más tarde.

---

## ✅ Implementado

### Backend — `service-queue`

#### Endpoint de Posición y ETA (TIC-309)
```
GET /api/v1/queue/{event_id}/position/
Authorization: Bearer <token>
```

**Lógica de cálculo:**
- **Posición** = cantidad de entradas `waiting` con `joined_at` anterior al del usuario + 1
- **ETA** = `posición × promedio_dinámico_de_tiempo_por_transacción`
- **Total en cola** = devuelto para que el frontend calcule la barra de progreso

**Respuesta cuando está en cola (`waiting`):**
```json
{
  "queued": true,
  "status": "waiting",
  "position": 3,
  "total_waiting": 5,
  "estimated_wait_minutes": 11,
  "joined_at": "2026-04-27T14:30:00Z"
}
```

**Respuesta cuando fue admitido:**
```json
{
  "queued": false,
  "status": "admitted",
  "message": "¡Eres el siguiente! Ya puedes seleccionar tus asientos."
}
```

**Respuesta si expiró su turno:**
```json
{
  "queued": false,
  "status": "expired",
  "error": "Tu tiempo para comprar ha expirado."
}
```

#### Cálculo Dinámico de ETA (TIC-311)
```python
def _calculate_avg_transaction_time(event_id) -> float
```
- Consulta los últimos **20 usuarios admitidos** que ya completaron su proceso
- Calcula el promedio real de minutos entre `notified_at` y `accessed_at`
- **Fallback:** `payment_timeout_minutes / 2` si no hay historial suficiente (mínimo 1 min)
- El ETA mejora progresivamente a medida que hay más datos históricos reales

#### Endpoint de Abandono Voluntario
```
DELETE /api/v1/queue/{event_id}/leave/
```
- Marca el `QueueEntry` del usuario como `status='left'`
- El cupo queda libre para el barrendero (US20) o para la admisión directa

---

## 📂 Archivos Modificados

| Archivo | Acción |
|---------|--------|
| `service-queue/queue_app/views.py` | MODIFICADO — +`QueuePositionView`, +`QueueLeaveView`, +`_calculate_avg_transaction_time()` |
| `service-queue/queue_app/urls.py` | MODIFICADO — Rutas `/position/` y `/leave/` |

---

## 🔗 Dependencias

- **Depende de:** HS-18 (necesita `QueueEntry` con usuarios en cola)
- **No bloquea a nadie:** HS-20 es independiente

---

## 🧪 Cómo Probar

```bash
# Con un usuario en estado 'waiting':
curl -X GET http://localhost:8003/api/v1/queue/{event_id}/position/ \
  -H "Authorization: Bearer <token>"

# Abandonar la cola:
curl -X DELETE http://localhost:8003/api/v1/queue/{event_id}/leave/ \
  -H "Authorization: Bearer <token>"
```

---

## 📋 Pendiente (Compañeros)

| TIC | Asignado | Descripción |
|-----|---------|-------------|
| TIC-308 | Ariana | Diseño final de pantalla de espera con posición real |
| TIC-310 | Ariana | Polling en frontend cada 5s al endpoint `/position/` |
| TIC-312 | Alex | Animación/progreso de avance en cola |
| TIC-313 | Alex | Sonido/notificación cuando el usuario es admitido |
