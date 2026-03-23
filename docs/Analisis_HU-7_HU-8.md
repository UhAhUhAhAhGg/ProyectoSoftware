# Análisis de Cumplimiento: HU-7 y HU-8 (Módulo Promotor)

Tras revisar a fondo el código del microservicio **`service-events`** (modelos, vistas y serializadores), aquí tienes el estado desglosado de las dos Historias de Usuario:

## 🎭 HU-7: ABM de Mis Eventos
El objetivo es que los Promotores puedan crear, editar y eliminar sus eventos.

### ✨ Backend: ¡100% Completado!
*   ✅ **[TIC-88] Modelo de Datos:** Implementado en `models.py` (`Event`). **Nota sobre Documentación:** Al igual que la TIC-97, esta API ya está documentada automáticamente. El `drf-spectacular` (Swagger) que configuraste previamente lee todo el proyecto `service-events`, por lo tanto, el modelo y endpoints de Eventos ya figuran en `http://localhost:8002/api/v1/schema/swagger-ui/`.
*   ✅ **[TIC-89] Endpoint Crear:** Implementado y protegido recientemente. Solo un usuario con el JWT de Promotor puede llamar al POST de `EventViewSet`.
*   ✅ **[TIC-90] Endpoint Editar:** Implementado. En el método `update`, el sistema valida exitosamente que `instance.promoter_id == request.user.id` (garantizando propiedad) y prohíbe explícitamente editar si el evento ya está cancelado o completado.
*   ✅ **[TIC-91] Eliminación Lógica:** Absolutamente genial. El método `destroy` no hace un `DELETE` a la base de datos, sino un Soft-Delete que cambia el status a `cancelled`, y de paso paraliza la venta inactivando sus tickets en un bucle for. Esto protege las compras previas.

### 🚧 Frontend: Pendiente
*   **[TIC-92]** Pantalla con tabla/listado de eventos.
*   **[TIC-93]** Formulario visual para ABM de Eventos.
*   **[TIC-94]** Conectar Front con Back (Axios/Fetch).

---

## 🎟️ HU-8: ABM de Tipos de Entradas
El objetivo es que el promotor asigne entradas VIP o Generales con cupos y precios a sus propios eventos.

### ✨ Backend: ¡100% Completado y Validado Matemáticamente!
*   ✅ **[TIC-97] Modelo de Datos:** `TicketType` ya existe en la base de datos con relaciones `ForeignKey` a `Event`, conteniendo campos vitales como `max_capacity`, `price`, y `current_sold` (para saber cuántas se vendieron ya).
*   ✅ **[TIC-98] Endpoint Crear:** El POST está activo y protegido. Solo permite crear entradas si el ID del evento le pertenece verdaderamente al Promotor que hace la llamada.
*   ✅ **[TIC-99] Endpoint Actualizar:** Listo. Restringe intentos de bajar el cupo a números menores a los tickets ya vendidos.
*   ✅ **[TIC-100] Validación anti-sobreventa:** Implementado magníficamente en `TicketTypeViewSet`. El código hace matemáticamente la suma acumulada de las entradas `TicketType.objects.filter(event=event).aggregate(total=Sum('max_capacity'))` y arroja 400 Bad Request si la suma excede la capacidad global del Teatro/Estadio (`event.capacity`).

### 🚧 Frontend: Pendiente
*   **[TIC-101]** Sección dentro del Detalle del Evento para ver/listar Entradas.
*   **[TIC-102]** Formulario para crear tipo de entrada (VIP, General) con restricciones de validación.
*   **[TIC-103] y [TIC-104]** Integración de Fetch/Axios.

---

¡No necesitas escribir ni una línea de código más de Backend para satisfacer estas dos Historias de Usuario! Toda tu lógica de negocio (ABM, Soft-Deletes, Restricción de dueños, y Matemáticas de Cupos) está maravillosamente orquestada. Todo lo que resta en Jira respecto a la HU-7 y HU-8 corresponde única y exclusivamente al equipo **Frontend**.

---

## 🧪 Guía de Pruebas Manuales (Cómo comprobar que el Backend funciona)

Para probar que efectivamente estas HUs están completas antes de conectar el Front, puedes realizar los siguientes tests rápidos (usando **Postman**, **ThunderClient** o **cURL**):

### Prerrequisitos
1. Asegúrate de tener corriendo los contenedores Docker (`docker compose up`).
2. Loguéate como un Promotor en `http://localhost:8000/api/users/login/` y copia el `access` Token.

### Test 1: Intentar Crear un Evento como Comprador (Prueba de Seguridad)
*   **Acción:** Haz un `POST` a `http://localhost:8002/api/events/` enviando datos de evento, pero usando el Token de un Comprador o Administrador.
*   **Resultado Esperado:** Un error `403 Forbidden`. Esto demuestra que el endpoint está restringido exitosamente (TIC-118).

### Test 2: Crear un Evento Exitoso (HU-7)
*   **Acción:** Haz un `POST` a `http://localhost:8002/api/events/` usando el Token de Promotor.
    *   *Body (JSON):* `{"promoter_id": "<tu-uuid>", "name": "Concierto Rock", "event_date": "2026-12-01", "event_time": "20:00:00", "location": "Estadio", "capacity": 100, "status": "draft"}`
*   **Resultado Esperado:** Un status `201 Created` y el JSON del evento con su nuevo `id`.

### Test 3: Restricción de Cupos de Entrada (HU-8 / TIC-100)
*   **Acción:** Intenta crear un `TicketType` (`POST http://localhost:8002/api/tickets/`) para el evento anterior (capacidad 100).
    *   Crea una entrada VIP con `max_capacity: 60`. (Éxito `201`).
    *   Luego, intenta crear una entrada General con `max_capacity: 50` para el mismo evento.
*   **Resultado Esperado:** Un error `400 Bad Request` indicando que `La capacidad solicitada supera el límite del evento. Solo te queda espacio para 40 entradas más.` Esto comprueba las matemáticas estrictas de TIC-100.

### Test 4: Eliminación Lógica (Soft-Delete) (HU-7 / TIC-91)
*   **Acción:** Haz un `DELETE` a `http://localhost:8002/api/events/<id-del-evento>/`.
*   **Resultado Esperado:** Un `200 OK`. Si luego haces un `GET`, verás que el evento sigue existiendo en el sistema pero su `status` cambió a `cancelled`, conservando la integridad de base de datos.
