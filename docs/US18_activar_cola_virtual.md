# 🚷 US18 — Activar Cola Virtual Automáticamente

> **Estado:** ⏳ PENDIENTE — Empezar después de US14
> **Rama:** Crear `feature/US18-activar-cola` partiendo de `Sprint3_DEV`
> **Story Points:** 8 SP | **Microservicio principal:** `service-queue`

---

## 📖 Historia de Usuario

> Como comprador, quiero que el sistema me coloque automáticamente en una lista de espera cuando el evento tiene alta demanda, para tener la oportunidad de comprar cuando haya disponibilidad.

---

## 📋 Prerequisitos antes de empezar

- [ ] US14 mergeada a `Sprint3_DEV` (necesitas `QueueConfig` y `QueueEntry` en la BD)
- [ ] `service-queue` levantando correctamente en Docker (puerto 8003)
- [ ] Hacer `git checkout Sprint3_DEV && git pull` antes de crear la rama

```bash
git checkout Sprint3_DEV
git pull origin Sprint3_DEV
git checkout -b feature/US18-activar-cola
```

---

## 🏗️ Plan de Implementación

### Paso 1 — Middleware de conteo de usuarios activos (`service-queue`)

Crear `queue_app/middleware.py`. Este middleware intercepta cada request autenticado al evento y lleva un contador en **memoria o cache** de cuántos usuarios únicos están activos en ese evento en los últimos N minutos.

```python
# queue_app/middleware.py
# Estructura sugerida:
# - Diccionario en memoria: { event_id: set(user_ids) }
# - Cada request con JWT que incluya event_id actualiza el set
# - Usuarios inactivos >5 minutos se eliminan del set (limpieza periódica)
```

> **Nota de arquitectura:** La manera más simple y sin Redis es usar un diccionario en memoria del proceso Django. Funciona para desarrollo. Para producción se usaría Redis, pero el docker-compose ya tiene APScheduler como alternativa.

### Paso 2 — Endpoint de entrada a cola

**Archivo:** `queue_app/views.py` (añadir nueva clase)

```
POST /api/v1/queue/{event_id}/enter/
```

**Lógica:**
1. Obtener `QueueConfig` del evento (si no existe → cola desactivada → permitir acceso directo)
2. Contar usuarios activos actuales en el evento
3. Si `usuarios_activos >= max_concurrent_users`:
   - Crear `QueueEntry` con `status='waiting'` y `position` calculada
   - Activar cola: `QueueConfig.is_queue_active = True`
   - Responder `{ "queued": true, "position": N, "estimated_wait": X }`
4. Si `usuarios_activos < max_concurrent_users`:
   - Registrar al usuario como activo
   - Responder `{ "queued": false, "message": "Acceso directo permitido" }`

**Respuesta cuando está en cola:**
```json
{
  "queued": true,
  "queue_entry_id": "uuid",
  "position": 15,
  "estimated_wait_minutes": 8,
  "message": "Estás en la cola de espera. Serás admitido cuando haya disponibilidad."
}
```

### Paso 3 — Endpoint de estado de cola

```
GET /api/v1/queue/{event_id}/status/
```

Devuelve si la cola está activa y cuántos usuarios hay esperando. Útil para que el frontend decida si mostrar el botón "Comprar" o "Entrar a la cola".

```json
{
  "is_queue_active": true,
  "users_waiting": 42,
  "users_admitted": 98,
  "max_concurrent_users": 100
}
```

### Paso 4 — Mecanismo de admisión automática

Cuando un usuario sale del flujo de compra (completa el pago, cancela, o expira su sesión), el sistema debe admitir al siguiente de la cola.

**Dónde dispararlo:**
- Al confirmar un pago en `service-events` → llamar a `service-queue` para admitir al siguiente
- En el job de limpieza de US20 cuando libera asientos

**Lógica de admisión:**
```python
def admit_next_in_queue(event_id):
    next_entry = QueueEntry.objects.filter(
        event_id=event_id,
        status='waiting'
    ).order_by('joined_at').first()
    
    if next_entry:
        next_entry.status = 'admitted'
        next_entry.notified_at = timezone.now()
        next_entry.save()
        # Notificar al usuario (polling o WebSocket)
```

### Paso 5 — Frontend: Pantalla de espera en cola

**Archivo nuevo:** `frontend/src/components/dashboard/eventos/ColaEspera.jsx`

**Comportamiento:**
- Se muestra cuando el backend responde `"queued": true`
- Deshabilita los botones de selección de asientos y pago
- Hace polling cada 5s a `/api/v1/queue/{event_id}/position/` (preparar para US19)
- Cuando `status = 'admitted'` → redirige automáticamente al mapa de asientos

```jsx
// Estructura visual sugerida:
// ┌────────────────────────────────────────┐
// │  ⏳ Estás en la cola de espera         │
// │                                        │
// │  Tu posición: #15                      │
// │  Tiempo estimado: ~8 minutos           │
// │                                        │
// │  [████████░░░░░░░░░░] 42% avanzado     │
// │                                        │
// │  Cuando sea tu turno, serás            │
// │  redirigido automáticamente.           │
// └────────────────────────────────────────┘
```

### Paso 6 — Deshabilitar selección de asientos si usuario está en cola

En `DetalleEvento.jsx`, al cargar el evento:
1. Llamar a `GET /api/v1/queue/{event_id}/status/`
2. Llamar a `GET /api/v1/queue/{event_id}/position/` (si el usuario tiene un `QueueEntry` activo)
3. Si el usuario tiene estado `waiting` → mostrar `ColaEspera.jsx` en lugar del mapa

---

## 🛠️ Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `service-queue/queue_app/views.py` | MODIFICAR | Añadir `QueueEnterView` y `QueueStatusView` |
| `service-queue/queue_app/urls.py` | MODIFICAR | Añadir rutas `/queue/{event_id}/enter/` y `/queue/{event_id}/status/` |
| `service-queue/queue_app/middleware.py` | NUEVO | Conteo de usuarios activos por evento |
| `frontend/src/components/dashboard/eventos/ColaEspera.jsx` | NUEVO | Pantalla de espera visual |
| `frontend/src/components/dashboard/eventos/ColaEspera.css` | NUEVO | Estilos de la pantalla de espera |
| `frontend/src/components/dashboard/eventos/DetalleEvento.jsx` | MODIFICAR | Integrar verificación de cola al cargar el evento |
| `frontend/src/services/queueService.js` | NUEVO | Servicio JS para llamadas a service-queue |

---

## 🧪 Criterios de Aceptación

| PA | Descripción |
|----|-------------|
| PA1 | Cuando usuarios activos = umbral → siguiente solicitud entra en cola automáticamente |
| PA2 | Comprador en cola → no puede navegar a selección de asientos ni al pago |
| PA3 | Cuando otro usuario se retira o completa compra → el primero de la cola es admitido |
| PA4 | Cola vacía y usuarios < umbral → cola se desactiva y nuevos acceden sin esperar |
| PA5 | Al activarse la cola → `QueueConfig.is_queue_active` cambia a `true` |

---

## 🔗 Dependencias

- **Depende de:** US14 (necesita `QueueConfig`)
- **Bloquea a:** US19 (que necesita `QueueEntry` con `status='waiting'`)
