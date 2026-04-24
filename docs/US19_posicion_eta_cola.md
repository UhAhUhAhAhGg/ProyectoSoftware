# ⏳ US19 — Posición en Cola y Tiempo Estimado de Espera (ETA)

> **Estado:** ⏳ PENDIENTE — Empezar después de US18
> **Rama:** Crear `feature/US19-posicion-eta` partiendo de `Sprint3_DEV`
> **Story Points:** 13 SP | **Microservicio principal:** `service-queue`

---

## 📖 Historia de Usuario

> Como comprador, quiero ver mi posición actual en la cola y el tiempo estimado de espera, para decidir si continúo esperando o regreso más tarde.

---

## 📋 Prerequisitos antes de empezar

- [ ] US18 mergeada a `Sprint3_DEV` (necesitas que existan `QueueEntry` con `status='waiting'`)
- [ ] El endpoint `POST /api/v1/queue/{event_id}/enter/` ya funciona

```bash
git checkout Sprint3_DEV
git pull origin Sprint3_DEV
git checkout -b feature/US19-posicion-eta
```

---

## 🏗️ Plan de Implementación

### Paso 1 — Endpoint de posición y ETA

**Archivo:** `queue_app/views.py` (añadir nueva clase)

```
GET /api/v1/queue/{event_id}/position/
Authorization: Bearer <token>
```

**Lógica de cálculo:**

```python
class QueuePositionView(APIView):
    def get(self, request, event_id):
        user_id = request.user.id
        
        # Buscar la entrada del usuario en la cola
        try:
            my_entry = QueueEntry.objects.get(
                user_id=user_id,
                event_id=event_id,
                status='waiting'
            )
        except QueueEntry.DoesNotExist:
            return Response({"queued": False}, status=200)
        
        # Posición = cuántos usuarios tienen joined_at ANTERIOR al mío + 1
        position = QueueEntry.objects.filter(
            event_id=event_id,
            status='waiting',
            joined_at__lt=my_entry.joined_at
        ).count() + 1
        
        # ETA = posición × promedio de minutos por transacción
        # (máximo 15 minutos por usuario según payment_timeout_minutes)
        avg_minutes_per_user = _calculate_avg_transaction_time(event_id)
        eta_minutes = position * avg_minutes_per_user
        
        return Response({
            "queued": True,
            "position": position,
            "estimated_wait_minutes": round(eta_minutes),
            "joined_at": my_entry.joined_at.isoformat(),
            "status": my_entry.status,
        })
```

**Cálculo de tiempo promedio por transacción:**
```python
def _calculate_avg_transaction_time(event_id):
    """
    Calcula el tiempo promedio que tarda un usuario admitido en completar su compra.
    Basado en los últimos 20 usuarios admitidos del evento.
    Si no hay datos históricos, usa el payment_timeout_minutes / 2 como estimado conservador.
    """
    try:
        config = QueueConfig.objects.get(event_id=event_id)
        default_minutes = config.payment_timeout_minutes / 2  # ~7.5 min si timeout=15
    except QueueConfig.DoesNotExist:
        default_minutes = 7.5
    
    # Calcular promedio real de las últimas admisiones completadas
    admitted = QueueEntry.objects.filter(
        event_id=event_id,
        status='admitted',
        accessed_at__isnull=False,
        notified_at__isnull=False
    ).order_by('-accessed_at')[:20]
    
    if admitted.count() > 0:
        times = [(e.accessed_at - e.notified_at).total_seconds() / 60 for e in admitted]
        return max(1, sum(times) / len(times))
    
    return default_minutes
```

### Paso 2 — Endpoint de abandono de cola (opcional pero recomendado)

```
DELETE /api/v1/queue/{event_id}/leave/
```

Permite al usuario salir voluntariamente de la cola. Marca su `QueueEntry` como `status='left'`.

### Paso 3 — Frontend: Pantalla de espera con posición y ETA

Esta pantalla es la evolución del `ColaEspera.jsx` creado en US18. Ahora mostrará datos reales en lugar de placeholders.

**Polling cada 5 segundos:**
```javascript
// En ColaEspera.jsx
useEffect(() => {
    const interval = setInterval(async () => {
        const data = await queueService.getPosition(eventId);
        setPosition(data.position);
        setEta(data.estimated_wait_minutes);
        
        if (data.status === 'admitted') {
            clearInterval(interval);
            // Notificación visual + sonido
            showAdmissionNotification();
            // Redirigir al mapa de asientos con tiempo limitado
            navigate(`/dashboard/evento/${eventId}`);
        }
    }, 5000);
    
    return () => clearInterval(interval);
}, [eventId]);
```

**Diseño de la pantalla:**
```
┌──────────────────────────────────────────────┐
│              ⏳ Cola de Espera               │
│                                              │
│         Tu posición actual:                  │
│              #15 en la cola                  │
│                                              │
│         Tiempo estimado de espera:           │
│              ~8 minutos                      │
│                                              │
│  [░░░░░████████████░░░░░░░░░░] Posición 15/42│
│                                              │
│  🔔 Recibirás una notificación automática    │
│     cuando sea tu turno.                     │
│                                              │
│  [  Abandonar la cola  ]                     │
└──────────────────────────────────────────────┘
```

**Notificación cuando es admitido:**
- Cambio visual: pantalla se vuelve verde con "🎉 ¡Es tu turno!"
- Sonido de notificación (usando `new Audio()` en JS)
- Contador regresivo de 60 segundos para acceder (o pierde su turno)
- Redirección automática al mapa de asientos

### Paso 4 — Barra de progreso dinámica

La barra de progreso debe reflejar el avance en la cola:
```
posicion_inicial = posición cuando el usuario entró a la cola (guardar en localStorage)
progreso = (posicion_inicial - posicion_actual) / posicion_inicial * 100
```

### Paso 5 — Manejo del caso "el usuario abandona y regresa"

Al volver a cargar la página de un evento en el que el usuario está en cola, el sistema debe:
1. Detectar que hay un `QueueEntry` activo (`status='waiting'`)
2. Mostrar automáticamente la pantalla de cola con la posición actualizada

En `DetalleEvento.jsx`:
```javascript
// Al cargar el evento, verificar estado en cola
const queueStatus = await queueService.getPosition(eventId);
if (queueStatus.queued) {
    setEnCola(true);
    setQueueData(queueStatus);
}
```

---

## 🛠️ Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `service-queue/queue_app/views.py` | MODIFICAR | Añadir `QueuePositionView` y `QueueLeaveView` |
| `service-queue/queue_app/urls.py` | MODIFICAR | Añadir `/queue/{event_id}/position/` y `/queue/{event_id}/leave/` |
| `frontend/src/components/dashboard/eventos/ColaEspera.jsx` | MODIFICAR | Añadir posición real, ETA, barra de progreso y notificación |
| `frontend/src/components/dashboard/eventos/ColaEspera.css` | MODIFICAR | Estilos de la barra de progreso y pantalla de admisión |
| `frontend/src/services/queueService.js` | MODIFICAR | Añadir `getPosition()` y `leaveQueue()` |

---

## 🧪 Criterios de Aceptación

| PA | Descripción |
|----|-------------|
| PA1 | El comprador en cola ve su posición inmediatamente (ej: "Eres el #45 en la cola") |
| PA2 | El comprador ve el tiempo estimado de espera (ej: "~8 minutos") |
| PA3 | La posición se actualiza sin recargar la página (cada 5 segundos) |
| PA4 | Cuando llega al #1 y es su turno → recibe notificación y se redirige a asientos |
| PA5 | Al abandonar la página y regresar → ve su posición actualizada |
| PA6 | Si el ETA cambia por variaciones en el ritmo de compras → se actualiza |

---

## 🔗 Dependencias

- **Depende de:** US18 (necesita `QueueEntry` con usuarios en cola)
- **No bloquea a nadie:** US20 es paralela e independiente
