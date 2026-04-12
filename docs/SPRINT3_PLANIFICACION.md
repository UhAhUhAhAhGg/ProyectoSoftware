# 📋 Planificación Sprint 3 — TicketGo

## 📅 Fechas y Entregables

| | Fecha |
|-|-------|
| **Inicio del Sprint** | Lunes 13 de Abril |
| **Planificación en Jira (deadline)** | Lunes 13 de Abril, 23:59 |
| **Revisión global de boards** | Martes 14 de Abril |
| **Fin del Sprint y Presentación** | Martes 28 y Jueves 30 de Abril |

---

## ✅ Checklist de la Rúbrica

Antes de la presentación verificar que en Jira esté cumplido:

- [ ] Todas las HUs del Sprint 3 tienen estimación en **Puntos de Historia**
- [ ] Todas las subtareas de desarrollo tienen estimación en **Horas**
- [ ] Todas las subtareas de desarrollo tienen una **persona asignada**
- [ ] Todas las PA están escritas en **lenguaje de negocio** (funcionalidad y comportamiento observable)
- [ ] Todas las PA están **asignadas al Product Owner**
- [ ] Definir un **Product Owner diferente** al de Sprint 1 y Sprint 2
- [ ] Item adicional: slide explicando **Feature Branches, HotFixes y Mainline** aplicados al proyecto

---

## 🌐 ¿Qué es "Creación de un Web API" en la rúbrica?

La rúbrica pide que las **tareas de desarrollo** incluyan entre ellas la creación de endpoints de Web API. En términos simples:

> Un **Web API** es un endpoint HTTP que el frontend llama para obtener o enviar datos al backend. Por ejemplo: `GET /api/v1/seats/{event_id}/` para obtener los asientos de un evento.

Cada HU que tiene lógica de backend debe tener al menos una subtarea que diga explícitamente **"Backend: Crear endpoint [MÉTODO] [ruta]"**. Esto ya está cubierto en las subtareas definidas abajo. Al presentar, debes poder mostrar en Swagger o Postman que ese endpoint existe y responde correctamente.

**Endpoints nuevos que se crearán en este Sprint (por HU):**

| HU | Método | Ruta | Descripción |
|----|--------|------|-------------|
| TIC-11 | GET | `/api/v1/seats/{ticket_type_id}/` | Obtener asientos con su estado |
| TIC-11 | POST | `/api/v1/seats/{seat_id}/reserve/` | Reservar un asiento |
| TIC-14 | GET | `/api/v1/queue-config/{event_id}/` | Obtener configuración de cola |
| TIC-14 | POST | `/api/v1/queue-config/{event_id}/` | Crear/actualizar configuración |
| TIC-18 | GET | `/api/v1/queue/{event_id}/status/` | Estado actual de la cola |
| TIC-18 | POST | `/api/v1/queue/{event_id}/enter/` | Entrar a la cola |
| TIC-19 | GET | `/api/v1/queue/{event_id}/position/` | Posición y ETA del usuario |
| TIC-20 | POST | `/api/v1/seats/release-expired/` | Job: liberar asientos expirados |
| TIC-16 | POST | `/api/v1/auth/refresh-token/` | Renovar token antes de expiración |

---

## Resumen

Sprint 3 se enfoca en implementar las funcionalidades de **gestión de asientos**, **cola virtual** y **seguridad de sesión**. Para este sprint se crea un nuevo microservicio: `service-queue`.

---

## 🆕 Nuevo Microservicio: `service-queue`

Las HUs de este sprint requieren lógica especializada que no encaja limpiamente en los servicios existentes. Crear `service-queue` como servicio independiente permite:

- Escalar la lógica de cola sin afectar la gestión de eventos
- Aislar los scheduled jobs de liberación de asientos
- Mantener el principio de responsabilidad única por servicio

### Estructura propuesta

```
service-queue/
├── app.py
├── requirements.txt
├── models/
│   ├── seat.py
│   ├── seat_reservation.py
│   ├── queue_config.py
│   ├── queue_entry.py
│   └── queue_log.py
├── views/
│   ├── seats_views.py
│   ├── queue_views.py
│   └── reservation_views.py
├── services/
│   ├── seat_service.py
│   ├── queue_service.py
│   └── scheduler_service.py
└── config.py
```

---

## 🗃️ Modelo de Base de Datos — `service-queue`

> Las referencias a `User`, `Event`, `Ticket_Type` y `Purchase` son **lógicas** (UUID guardado, sin FK real entre servicios).

### Seat (Asiento)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| id | UUID | PK |
| ticket_type_id | UUID | Referencia lógica a Ticket_Type |
| seat_code | VARCHAR(20) | Código del asiento (ej: "A-12") |
| row | VARCHAR(10) | Fila (nullable) |
| column | INT | Número de columna (nullable) |
| zone | VARCHAR(50) | Zona: "VIP", "GENERAL", etc. (nullable) |
| status | VARCHAR(20) | `available` / `reserved` / `sold` |
| created_at | TIMESTAMP | Fecha de creación |

### Seat_Reservation (Reserva temporal)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| id | UUID | PK |
| seat_id | UUID | FK → Seat |
| user_id | UUID | Ref lógica a User (service-auth) |
| purchase_id | UUID | Ref lógica a Purchase (service-events), nullable si expiró |
| reserved_at | TIMESTAMP | Inicio de la reserva |
| expires_at | TIMESTAMP | reserved_at + payment_timeout_minutes |
| status | VARCHAR(20) | `active` / `confirmed` / `expired` |
| released_at | TIMESTAMP | Nullable, se llena cuando expira |

### Queue_Config (Configuración por evento)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| id | UUID | PK |
| event_id | UUID | Ref lógica a Event — único por evento (1:1) |
| max_concurrent_users | INT | Umbral de usuarios antes de activar la cola |
| payment_timeout_minutes | INT | Minutos máximos para completar el pago |
| is_queue_active | BOOLEAN | Estado actual de la cola |
| updated_by | UUID | Ref lógica al Promotor (User) que configuró |
| updated_at | TIMESTAMP | Última modificación |

### Queue_Entry (Posición en la cola)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| id | UUID | PK |
| user_id | UUID | Ref lógica a User (service-auth) |
| event_id | UUID | Ref lógica a Event (service-events) |
| position | INT | Posición calculada en la cola |
| joined_at | TIMESTAMP | Cuándo entró a la cola |
| notified_at | TIMESTAMP | Nullable — cuándo fue notificado de su turno |
| accessed_at | TIMESTAMP | Nullable — cuándo fue admitido |
| status | VARCHAR(20) | `waiting` / `admitted` / `expired` / `left` |

### Queue_Log (Auditoría)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| id | UUID | PK |
| event_type | VARCHAR(50) | `seat_released`, `user_admitted`, `reservation_expired` |
| user_id | UUID | Nullable |
| seat_id | UUID | Nullable |
| queue_entry_id | UUID | Nullable |
| description | TEXT | Nullable |
| created_at | TIMESTAMP | Cuándo ocurrió |

### Relaciones internas

- `Seat` → `Seat_Reservation`: 1:N (un asiento puede tener muchas reservas en el tiempo, solo 1 activa)
- `Queue_Config` ↔ `Event`: 1:1 lógica (un evento tiene exactamente una configuración)
- `Queue_Entry` → `Event`: N:1 lógica (un evento puede tener muchos usuarios en cola)
- `Queue_Log` → `Seat`: N:1 nullable (auditoría)
- `Queue_Log` → `Queue_Entry`: N:1 nullable (auditoría)

---

## 📝 Aclaraciones sobre la BD

### Relación con `TicketType` (ya existente en service-events)

En Sprint 2 se agregaron los campos `seat_rows`, `seats_per_row` y `zone_type` al modelo `TicketType`. Es importante distinguir sus roles:

| Modelo | Rol | Ejemplo |
|--------|-----|---------|
| `TicketType.seat_rows / seats_per_row` | Define el **layout** del mapa (cuántas filas y columnas) | `seat_rows=10, seats_per_row=20` → hay 200 asientos |
| `Seat` (service-queue, NUEVO) | Registra el **estado individual** de cada asiento en tiempo real | `seat_code="A-01", status="reserved"` |

Al activar un evento, `service-queue` puede leer `seat_rows` y `seats_per_row` de `TicketType` para **generar automáticamente** los registros `Seat` correspondientes. No hay duplicación — son capas complementarias.

### Sobre `purchase_id` en `Seat_Reservation`

El modelo `Purchase` **sí existe** en `service-events` — fue creado en Sprint 2 al implementar el flujo de compra (TIC-17). Su `id` es UUID. Por lo tanto, `purchase_id` en `Seat_Reservation` es una referencia lógica válida a `Purchase.id` de `service-events`. Se llena cuando el pago se completa; queda `NULL` si la reserva expira antes de pagarse.

---

## 🔄 Cambios en Servicios Existentes

### `service-events` — Tabla `Ticket_Type`

**Agregar atributo:** `has_seats` (BOOLEAN, default `FALSE`)

Indica si ese tipo de entrada maneja asientos asignados. Si es `FALSE`, funciona como antes (entrada libre sin asiento). Si es `TRUE`, el flujo de compra deberá consultar `service-queue` para seleccionar y reservar un asiento.

### `service-events` — Tabla `Purchase`

No requiere cambios en la BD, pero sí en la lógica de negocio:

> Antes de confirmar una compra, verificar que exista una `Seat_Reservation` con `status = 'active'` para ese usuario (solo si el evento tiene `has_seats = TRUE`).

### `service-auth`

No requiere cambios en BD. El timeout de sesión (TIC-16) se implementa mediante configuración de JWT y detección de inactividad en el frontend.

### `service-profiles`

Sin cambios.

---

## 📖 Historias de Usuario del Sprint 3

---

### TIC-11 — Mapa de asientos (13 SP)

**Historia:** Como comprador, quiero ver y seleccionar un asiento disponible al momento de comprar una entrada, para elegir mi lugar preferido en el evento.

#### Subtareas

| # | Área | Descripción | Tiempo |
|---|------|-------------|--------|
| 1 | Frontend | Diseñar interfaz visual del mapa/lista de asientos | 8h |
| 2 | Backend - BD | Crear endpoint para obtener estado actual de asientos | 6h |
| 3 | Frontend | Renderización dinámica: disponible / ocupado / seleccionado | 7h |
| 4 | Frontend | Interactividad de selección de asientos | 5h |
| 5 | Backend | Validar disponibilidad del asiento seleccionado | 4h |
| 6 | Frontend - Backend | Actualización en tiempo real de disponibilidad | 7h |
| 7 | Backend | Sincronización de estado con base de datos | 6h |
| 8 | Frontend | Zoom/pan en mapa de asientos para eventos grandes | 4h |

#### Criterios de Aceptación

- **PA:** Dado que el comprador accede a "Seleccionar asientos", entonces ve el mapa/lista completa de asientos organizados por zonas.
- **PA:** Dado que un asiento está disponible, entonces el comprador puede clickearlo para seleccionarlo (cambio visual).
- **PA:** Dado que un asiento está ocupado, entonces el comprador NO puede seleccionarlo (aparece deshabilitado).
- **PA:** Dado que el comprador selecciona un asiento, entonces el sistema valida disponibilidad en backend; si fue comprado simultáneamente, muestra error "Asiento no disponible".
- **PA:** Dado que múltiples usuarios están en la misma página, entonces cuando uno compra un asiento, la lista se actualiza para los demás sin recargar.
- **PA:** Dado que el comprador selecciona múltiples asientos, entonces el sistema permite la multi-selección y muestra el total.

---

### TIC-14 — Configuración de umbral de cola virtual (13 SP)

**Historia:** Como Promotor, quiero configurar el umbral de usuarios simultáneos para mis eventos, para activar automáticamente la lista de espera y gestionar la alta demanda de forma ordenada.

> **Nota:** El umbral es **por evento**, no global. Cada evento tiene su propia configuración en `Queue_Config`. El promotor accede a esta configuración desde la ficha del evento.

#### Subtareas

| # | Área | Descripción | Tiempo |
|---|------|-------------|--------|
| 1 | Backend - BD | Crear tabla Queue_Config con umbral y timeout por evento | 3h |
| 2 | Backend | Endpoint POST/PUT para crear/actualizar configuración de cola | 4h |
| 3 | Backend | Endpoint GET para obtener configuración actual de un evento | 2h |
| 4 | Backend | Validación: umbral debe ser entero positivo ≤ capacidad del evento | 2h |
| 5 | Frontend | Panel de configuración de cola en la ficha del evento | 6h |
| 6 | Frontend - Backend | Integrar formulario de configuración con el endpoint | 4h |
| 7 | Frontend | Mostrar estado actual: umbral, timeout y si la cola está activa | 3h |
| 8 | Backend | Agregar atributo has_seats a Ticket_Type en service-events | 2h |

#### Criterios de Aceptación

- **PA:** Dado que el promotor accede a la ficha de un evento, entonces ve la sección "Configuración de Cola" con umbral actual y timeout de pago.
- **PA:** Dado que el promotor ingresa un umbral válido (ej: 150) y guarda, entonces el sistema persiste la configuración y muestra confirmación.
- **PA:** Dado que el promotor ingresa un umbral mayor a la capacidad del evento, entonces el sistema muestra error "El umbral no puede superar la capacidad del evento".
- **PA:** Dado que el promotor ingresa 0 o un número negativo, entonces el sistema muestra error "El umbral debe ser mayor a 0".
- **PA:** Dado que la cola se activa automáticamente (TIC-18), entonces usa el umbral configurado por el promotor para ese evento específico.

---

### TIC-18 — Activar cola virtual automáticamente (8 SP)

**Historia:** Como comprador, quiero que el sistema me coloque automáticamente en una lista de espera cuando el evento tiene alta demanda, para tener la oportunidad de comprar cuando haya disponibilidad.

#### Subtareas

| # | Área | Descripción | Tiempo |
|---|------|-------------|--------|
| 1 | Backend | Middleware que cuente usuarios activos simultáneos por evento | 5h |
| 2 | Backend | Lógica para comparar usuarios activos vs umbral de Queue_Config | 3h |
| 3 | Backend | Cuando se supere el umbral, colocar usuario en Queue_Entry con status `waiting` | 4h |
| 4 | Frontend | Mostrar mensaje "Estás en cola de espera" cuando usuario entra en cola | 3h |
| 5 | Backend - BD | Almacenar timestamp de entrada a cola para calcular posición | 3h |
| 6 | Frontend | Deshabilitar selección de asientos y pago mientras usuario está en cola | 2h |
| 7 | Backend | Mecanismo para sacar al primer usuario de la cola cuando hay disponibilidad | 4h |

#### Criterios de Aceptación

- **PA:** Dado que usuarios activos = umbral configurado, entonces la siguiente solicitud es automáticamente colocada en cola (sin intervención del promotor).
- **PA:** Dado que un comprador está en cola, entonces no puede navegar a selección de asientos ni proceder al pago.
- **PA:** Dado que un usuario en cola espera su turno, entonces cuando otro usuario se retira o completa su compra, el primero de la cola es admitido automáticamente.
- **PA:** Dado que la cola está vacía y usuarios activos < umbral, entonces la cola se desactiva y nuevos usuarios acceden sin esperar.
- **PA:** Dado que la cola se activa, entonces `Queue_Config.is_queue_active` cambia a `TRUE` automáticamente.

---

### TIC-19 — Posición en cola y tiempo estimado de espera (13 SP)

**Historia:** Como comprador, quiero ver mi posición actual en la cola y el tiempo estimado de espera, para decidir si continúo esperando o regreso más tarde.

#### Subtareas

| # | Área | Descripción | Tiempo |
|---|------|-------------|--------|
| 1 | Backend | Calcular posición del usuario en cola basado en `joined_at` | 3h |
| 2 | Backend | Estimar tiempo de espera según promedio de tiempo por usuario | 4h |
| 3 | Frontend | Diseñar pantalla de espera con posición y ETA | 6h |
| 4 | Frontend - Backend | Endpoint para obtener posición + ETA actualizada | 4h |
| 5 | Frontend | Polling cada 5 segundos para actualizar posición/ETA sin recargar | 3h |
| 6 | Backend | Calcular promedio dinámico de tiempo por compra (máximo 15 min) | 4h |
| 7 | Frontend | Animación/barra de progreso de avance en cola | 3h |
| 8 | Frontend | Notificación cuando el usuario es admitido (sonido/visual) | 2h |

#### Criterios de Aceptación

- **PA:** Dado que un comprador entra en cola, entonces inmediatamente ve su posición (ej: "Eres el #45 en la cola").
- **PA:** Dado que el comprador está en cola, entonces ve el tiempo estimado de espera (ej: "Tiempo estimado: 8 minutos").
- **PA:** Dado que pasan 5 segundos, entonces la posición se actualiza sin recargar la página.
- **PA:** Dado que la posición llega a #1 y es su turno, entonces el comprador recibe notificación y se redirige automáticamente a selección de asientos con tiempo limitado.
- **PA:** Dado que el comprador abandona la página mientras está en cola, entonces al regresar ve su posición actualizada.
- **PA:** Dado que el tiempo estimado cambia por variaciones en el ritmo de compras, entonces la pantalla de espera se actualiza automáticamente.

---

### TIC-16 — Timeout de sesión por inactividad (8 SP)

**Historia:** Como usuario, quiero que el sistema cierre automáticamente mi sesión tras un período de inactividad, para proteger mi cuenta en caso de que olvide cerrar sesión.

> **Nota:** Se implementa en `service-auth` (configuración JWT) y en el frontend (detección de inactividad). No requiere cambios en la BD.

#### Subtareas

| # | Área | Descripción | Tiempo |
|---|------|-------------|--------|
| 1 | Backend | Configurar JWT con expiración por inactividad (30 minutos) | 2h |
| 2 | Frontend | Implementar detector de inactividad del usuario (mouse, teclado, scroll) | 3h |
| 3 | Frontend | Mostrar modal de advertencia 2 minutos antes de expirar sesión | 4h |
| 4 | Frontend | Botón "Continuar sesión" en el modal de advertencia | 2h |
| 5 | Backend | Endpoint para renovar token antes de expiración | 2h |
| 6 | Frontend | Logout automático y redirección a login cuando la sesión expira | 3h |
| 7 | Frontend | Limpiar datos sensibles de localStorage al expirar sesión | 2h |

#### Criterios de Aceptación

- **PA:** Dado que el usuario está inactivo 28 minutos, entonces aparece modal: "Tu sesión expirará en 2 minutos. ¿Deseas continuar?".
- **PA:** Dado que el usuario ve la advertencia y hace clic en "Continuar", entonces su sesión se extiende otros 30 minutos.
- **PA:** Dado que el usuario no responde en 2 minutos, entonces es automáticamente desconectado y redirigido al login.
- **PA:** Dado que la sesión expira, entonces el localStorage queda vacío (sin token ni datos de usuario).
- **PA:** Dado que el usuario intenta usar la app con sesión expirada, entonces recibe error 401 y debe iniciar sesión nuevamente.

---

### TIC-20 — Liberación automática de asientos no pagados (13 SP)

**Historia:** Como comprador, quiero que los asientos que seleccioné sean liberados automáticamente si no completo el pago a tiempo, para que otros compradores puedan adquirirlos.

#### Subtareas

| # | Área | Descripción | Tiempo |
|---|------|-------------|--------|
| 1 | Backend - BD | Agregar columnas `reserved_at` y `expires_at` a Seat_Reservation | 3h |
| 2 | Backend | Scheduled job que revise reservas no confirmadas cada minuto | 5h |
| 3 | Backend | Lógica: si `NOW() > expires_at` y status = `active`, marcar como `expired` | 4h |
| 4 | Backend | Liberar asientos: cambiar Seat.status de `reserved` a `available` | 3h |
| 5 | Frontend | Mostrar mensaje al usuario: "Tiempo de pago agotado, asientos liberados" | 3h |
| 6 | Frontend - Backend | Enviar email de notificación al usuario cuando pierde sus asientos | 4h |
| 7 | Backend | Los asientos liberados quedan inmediatamente disponibles para otros compradores | 2h |
| 8 | Backend | Registrar cada liberación en Queue_Log con motivo y timestamp | 3h |

#### Criterios de Aceptación

- **PA:** Dado que un comprador selecciona asientos y entra a pago, entonces se registra `reserved_at` y `expires_at = reserved_at + payment_timeout_minutes`.
- **PA:** Dado que el comprador completa el pago antes del timeout, entonces los asientos pasan a estado `sold` y son suyos definitivamente.
- **PA:** Dado que el comprador NO completa el pago después del timeout, entonces el scheduled job libera automáticamente esos asientos.
- **PA:** Dado que los asientos son liberados, entonces el comprador ve en la app: "Tu reserva expiró. Los asientos han sido liberados" con opción de intentar de nuevo.
- **PA:** Dado que los asientos son liberados, entonces recibe email: "Tu reserva de entradas ha expirado".
- **PA:** Dado que los asientos fueron liberados, entonces otros compradores pueden verlos disponibles e inmediatamente comprarlos.

---

## 📊 Resumen Sprint 3

| HU | Story Points | Subtareas | PA | Servicio principal |
|----|-------------|-----------|----|--------------------|
| TIC-11 Mapa de asientos | 13 SP | 8 | 6 | service-queue |
| TIC-14 Umbral de cola | 13 SP | 8 | 5 | service-queue |
| TIC-18 Activar cola automático | 8 SP | 7 | 5 | service-queue |
| TIC-19 Posición y ETA en cola | 13 SP | 8 | 6 | service-queue |
| TIC-16 Timeout de sesión | 8 SP | 7 | 5 | service-auth |
| TIC-20 Liberar asientos automático | 13 SP | 8 | 6 | service-queue |
| **TOTAL** | **68 SP** | **46** | **33** | |

---

## 🔗 Dependencias entre HUs

```
TIC-14 (umbral config)
    └─→ TIC-18 (activar cola) depende de que exista Queue_Config
            └─→ TIC-19 (posición/ETA) depende de que exista Queue_Entry

TIC-11 (mapa asientos)
    └─→ TIC-20 (liberar asientos) depende de que exista Seat y Seat_Reservation

TIC-16 (timeout sesión) — independiente, no bloquea ni depende de otras HUs del sprint
```

---

## ✅ Checklist pre-implementación

- [ ] Crear base de datos para `service-queue`
- [ ] Ejecutar migraciones: Seat, Seat_Reservation, Queue_Config, Queue_Entry, Queue_Log
- [ ] Modificar `Ticket_Type` en `service-events`: agregar `has_seats`
- [ ] Agregar `service-queue` al `docker-compose.yml`
- [ ] Configurar variables de entorno del nuevo servicio
- [ ] Actualizar el modelo de Vertabelo con las nuevas entidades
