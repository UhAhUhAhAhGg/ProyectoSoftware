# HS-18 — Fila Virtual: Puerta de Acceso

> **Estado:** ✅ IMPLEMENTADA — Rama `US18` lista para merge
> **TICs de Gustavo:** TIC-294, TIC-295, TIC-298, TIC-299, TIC-300

---

## 📖 Historia de Usuario

> Como comprador, quiero que el sistema me coloque automáticamente en una cola virtual cuando la plataforma alcance su límite de capacidad simultánea, para garantizar una compra ordenada.

---

## 🏗️ Cómo Funciona

```
Comprador hace clic en "Seleccionar Asientos"
          │
          ▼
  POST /api/v1/queue/{event_id}/enter/
          │
    ┌─────┴──────┐
    │            │
  activos <   activos >=
  umbral       umbral
    │            │
    ▼            ▼
 Acceso       QueueEntry
 directo      status='waiting'
 al mapa      → ColaEspera.jsx
```

---

## ✅ Implementado

### Backend — `service-queue`

#### 1. Tracking de Usuarios Activos (`queue_app/active_users.py`)
- Diccionario en memoria `{ event_id: { user_id: timestamp } }`
- **Thread-safe** con `Lock`
- Usuarios inactivos > 2 minutos se eliminan automáticamente del conteo
- Funciones: `register_user_activity()`, `remove_user_activity()`, `get_active_users_count()`

#### 2. Middleware de Actividad (`queue_app/middleware.py`)
- `ActiveUserTrackingMiddleware` — intercepta cada request autenticado a rutas `/queue/{event_id}/...`
- Actualiza el `last_seen` del usuario en el diccionario en memoria
- Sin costo de BD — solo RAM

#### 3. Endpoint de Entrada (`queue_app/views.py`)
```
POST /api/v1/queue/{event_id}/enter/
```
**Lógica:**
1. Si no hay `QueueConfig` para el evento → acceso libre
2. Si el usuario ya tiene un `QueueEntry` admitido → verificar que no expiró su tiempo
3. Si el usuario ya está esperando → retornar su posición actualizada
4. Si `activos < umbral` → admitir, registrar en memoria
5. Si `activos >= umbral` → crear `QueueEntry(status='waiting')`, activar cola

**Respuestas:**
```json
// Acceso directo:
{ "queued": false, "message": "Admitido automáticamente" }

// En cola:
{ "queued": true, "position": 3, "queue_entry_id": "uuid", "estimated_wait_minutes": 6 }

// Tiempo expirado:
HTTP 403 — { "error": "Tu tiempo máximo para seleccionar y comprar ha expirado." }
```

#### 4. Endpoint de Estado (`queue_app/views.py`)
```
GET /api/v1/queue/{event_id}/status/
```
```json
{
  "is_queue_active": true,
  "users_waiting": 5,
  "users_admitted": 2,
  "max_concurrent_users": 2
}
```

### Frontend

#### `ColaEspera.jsx`
- Overlay de pantalla completa con diseño glassmorphism oscuro
- Muestra posición y tiempo estimado de espera
- **Polling automático cada 5s** al endpoint `enter/` para detectar si fue admitido
- Contador de tiempo de espera en tiempo real
- Barra de progreso visual animada
- Aviso de "no cerrar la ventana"
- Al ser admitido → cierra el overlay y abre el mapa de asientos

#### `DetalleEvento.jsx` (modificado)
- Antes de abrir SeatMap: llama a `POST /queue/{event_id}/enter/`
- Si `queued: true` → muestra `ColaEspera` en lugar del mapa
- **Fail-open:** si `service-queue` no está disponible, permite acceso directo

---

## 📂 Archivos Creados/Modificados

| Archivo | Acción |
|---------|--------|
| `service-queue/queue_app/active_users.py` | NUEVO — Tracking en memoria |
| `service-queue/queue_app/middleware.py` | NUEVO — Middleware de actividad |
| `service-queue/queue_app/views.py` | MODIFICADO — +QueueEnterView, +QueueStatusView |
| `service-queue/queue_app/urls.py` | MODIFICADO — Rutas `/enter/` y `/status/` |
| `service-queue/queue_config/settings.py` | MODIFICADO — Middleware registrado |
| `frontend/src/components/dashboard/eventos/ColaEspera.jsx` | NUEVO |
| `frontend/src/components/dashboard/eventos/ColaEspera.css` | NUEVO |
| `frontend/src/components/dashboard/eventos/DetalleEvento.jsx` | MODIFICADO |

---

## 🧪 Cómo Probar

1. **Configurar umbral a 1** como Promotor (via `PUT /queue-config/`)
2. **Usuario A** hace clic en "Seleccionar Asientos" → acceso directo concedido
3. **Usuario B** (otro navegador/sesión) hace clic en el mismo evento → ve la pantalla de Cola
4. Verificar que Usuario B **no puede** seleccionar asientos
5. Cuando Usuario A sale del mapa → Usuario B debe ser admitido automáticamente (en el próximo polling de 5s)
