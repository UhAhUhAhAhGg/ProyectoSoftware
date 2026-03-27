# 🎟️ HU-7: ABM de Mis Eventos (Módulo Promotor)

**Objetivo:** Permitir que los Promotores puedan crear, editar, visualizar y eliminar (soft-delete) sus propios eventos de forma autónoma.

## ✨ Backend: ¡100% Completado!
*   ✅ **[TIC-88] Modelo de Datos:** Implementado en `events/models.py` (`Event`). Incluye campos esenciales como nombre, descripción, fecha, hora, ubicación, capacidad, categoría y status. Documentado automáticamente vía Swagger UI (`/api/v1/schema/swagger-ui/`).
*   ✅ **[TIC-89] Endpoint Crear:** Implementado `EventViewSet.create` protegido con JWT. Solo usuarios con rol Promotor pueden insertar eventos.
*   ✅ **[TIC-90] Endpoint Editar:** Implementado. En el método `update`, el sistema valida exitosamente que `instance.promoter_id == request.user.id` garantizando que un promotor no pueda editar eventos ajenos. Adicionalmente, prohíbe explícitamente editar eventos cuyo status sea `cancelled` o `completed`.
*   ✅ **[TIC-91] Eliminación Lógica:** Implementado magníficamente. El método `destroy` ejecuta un Soft-Delete cambiando el status a `cancelled` y desactiva en cascada todos sus tickets asociados, salvaguardando el historial de facturación de las compras previas.
*   ✅ **Integración de Categorías:** Se añadió foreign key a la tabla `Category` con script inicializador (`seed_categories.py`) alojado en la base central, logrando coherencia estructural.

## ✅ Frontend: ¡100% Completado!
*   ✅ **[TIC-92] Pantalla de listado (`ListaEventos.jsx`):** Las tarjetas muestran título, fechas formatedas amigablemente, ubicación, imagen, categoría y el estado. Los rangos de precios ahora se calculan dinámicamente ("Desde $X" leyendo la lista de tickets).
*   ✅ **[TIC-93] Formulario visual (`FormularioEvento.jsx`):** Formulario interactivo responsivo con split-column, selector robusto de categorías y validación local de formularios para UX instantánea.
*   ✅ **[TIC-94] Soporte Multimedia:** Soporte nativo para lectura y previsualización en vivo de imágenes vía Base64 Data URL, permitiendo visualizar imágenes locales subidas con el input en tiempo real.
*   ✅ **UX Detalles de Evento:** Integración de un modal inteligente que provee todos los detalles extendidos sin obligar a usar React-Router para cambiar la página bruscamente, previniendo reseteos del context.

---

## 🧪 Pruebas de Aceptación Jira (Acceptance Criteria)

Para dar por "Done" esta historia, el especialista QA debe constatar:

### Jira AC1: Creación Exitosa (End-to-End)
1. Ingresa al dashboard como Promotor y navega a "Crear Evento".
2. Rellena los datos obligatorios (nombre, categoría, fecha, ubicación, descripción, capacidad). Sube una imagen decorativa (opcional).
3. Al presionar "Crear Evento" en la placa inferior, el sistema te reconduce a la tabla general.
4. **Validación:** Validar localmente que la tarjeta correspondiente al evento brote inmediatamente reflejando exactamente la información suministrada, incluido la categoría del frontend mapping.

### Jira AC2: Seguridad de Contextos Protegidos
1. Intenta forzar disparos de HTTP Requests vía un Cliente REST (ThunderClient) al endpoint POST `/api/events/`.
2. Provee un Payload válido PERO introduce un JWT Access Token perteneciente a un actor de tipo Comprador o Visitante.
3. **Validación:** El sistema debe interrumpir la cadena emitiendo HTTP `403 Forbidden` certificando "No tienes permiso para interactuar con este recurso."

### Jira AC3: Eliminación Segura y Silenciosa (Soft Delete)
1. Busca un evento ya creado.
2. Pulsa el ícono "Tacho de Busura" (Eliminar).
3. **Validación:** Comprueba directamente desde una consola Shell a la BD (PostgreSQL: `SELECT status FROM events_event WHERE id='...'`), certificando que la celda `status` se sobrescriba a valor `cancelled` en lugar del aniquilamiento del renglón (DELETE absoluto), para mitigar incidentes de base de datos.
