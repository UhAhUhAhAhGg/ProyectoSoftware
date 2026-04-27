# HS-14 — Configuración de la Cola Virtual

> **Estado:** ✅ COMPLETADA — Mergeada a `Sprint3_DEV`
> **Rama:** `US14`
> **TICs:** TIC-346, TIC-347, TIC-348, TIC-349

---

## 📖 Historia de Usuario

> Como Promotor, quiero configurar los parámetros de la cola virtual para mi evento, para controlar cuántos usuarios pueden estar seleccionando asientos al mismo tiempo.

---

## ✅ Implementado

### 1. Campo `queue_timeout` en el Modelo Event (`service-events`)
- Nuevo campo `queue_timeout` (entero, minutos) en `events/models.py`
- Migración `0016_event_queue_timeout.py` creada y aplicada
- Representa el tiempo máximo que tiene un usuario para completar todo el proceso (selección + pago)

### 2. Endpoint de Configuración (`service-events`)
```
GET  /api/v1/events/{event_id}/queue-config/
PUT  /api/v1/events/{event_id}/queue-config/
```

**Campos aceptados/retornados:**
```json
{
  "waitlist_threshold": 100,
  "waitlist_active": true,
  "queue_timeout": 15
}
```

**Validaciones implementadas:**
- `waitlist_threshold` debe ser un entero positivo
- `waitlist_threshold` no puede superar la capacidad máxima del evento
- `queue_timeout` debe ser un entero positivo (en minutos)

### 3. Modelo `QueueConfig` en `service-queue`
- `max_concurrent_users` — umbral de usuarios simultáneos
- `payment_timeout_minutes` — tiempo máximo para completar selección + pago
- `is_queue_active` — bandera dinámica (se activa automáticamente en HS18)
- `updated_by` — UUID del promotor que configuró

---

## 📂 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `service-events/events/models.py` | Campo `queue_timeout` añadido |
| `service-events/events/migrations/0016_event_queue_timeout.py` | Migración nueva |
| `service-events/events/views.py` | Lógica GET/PUT de `queue-config` con validaciones |
| `service-queue/queue_app/models.py` | Modelo `QueueConfig` completo |

---

## 🧪 Cómo Probar

1. Levantar `service-events` con Docker
2. Autenticarse como **Promotor**
3. `PUT /api/v1/events/{id}/queue-config/` con body:
   ```json
   { "waitlist_threshold": 2, "waitlist_active": true, "queue_timeout": 5 }
   ```
4. Verificar respuesta `200 OK`
5. `GET /api/v1/events/{id}/queue-config/` → verificar que los valores persisten

> **Tip para pruebas:** Usar `waitlist_threshold: 1` o `2` para simular cola con pocos usuarios.
