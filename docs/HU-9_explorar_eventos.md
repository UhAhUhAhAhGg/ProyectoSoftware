# HU-9: Explorar Catálogo de Eventos

## Descripción
Como comprador, quiero explorar un catálogo de eventos disponibles para encontrar eventos que me interesen.

## Subtareas
1. Pantalla de listado de eventos - COMPLETADA
2. Filtros/búsqueda - COMPLETADA
3. Vista detalle de evento - COMPLETADA

## Implementación Técnica

### Backend
- **Endpoint**: `GET /api/v1/events/` (service-events, puerto 8002)
  - Retorna todos los eventos publicados (status='published')
  - Incluye: nombre, descripción, fecha, ubicación, ciudad, imagen, categoría, capacidad
  - Los ticket types se cargan en el detalle individual

- **Endpoint detalle**: `GET /api/v1/events/<uuid>/`
  - Retorna evento con sus zonas y ticket types (precios, capacidad)

### Frontend
- **Componente listado**: `frontend/src/components/dashboard/eventos/ExplorarEventos.jsx`
  - Carga eventos con `eventosService.getEventosDisponibles()`
  - Filtro de búsqueda por nombre, ubicación y ciudad (búsqueda en tiempo real, client-side)
  - Muestra tarjetas con imagen, nombre, fecha, ubicación, precio mínimo
  - Click en tarjeta → navega a `/dashboard/evento/:id`

- **Componente detalle**: `frontend/src/components/dashboard/eventos/DetalleEvento.jsx`
  - Muestra información completa del evento
  - Sección de tipos de entrada con precios y disponibilidad
  - Botón "Pagar con QR" para cada tipo de entrada

- **Servicio**: `frontend/src/services/eventosService.js`
  - `getEventosDisponibles()` - Lista eventos publicados
  - `getEvento(id)` - Detalle de un evento específico

## Rutas
- `/dashboard/eventos` → Listado de eventos
- `/dashboard/evento/:id` → Detalle de evento

## Pruebas Manuales

### Prerrequisitos
1. Docker levantado: `docker compose up`
2. Tener al menos un evento publicado (creado por un Promotor)
3. Cuenta de comprador: `comprador@ticketproject.com` / `Comprador1234!`

### Caso 1: Ver listado de eventos
1. Iniciar sesión como comprador
2. En el dashboard, click en "Explorar Eventos"
3. **Resultado esperado**: Se muestra la lista de eventos publicados con tarjetas que incluyen imagen, nombre, fecha y ubicación

### Caso 2: Buscar eventos
1. En la pantalla de explorar eventos, escribir en el buscador el nombre de un evento
2. **Resultado esperado**: La lista se filtra en tiempo real mostrando solo eventos que coincidan con nombre, ubicación o ciudad
3. Borrar el texto de búsqueda
4. **Resultado esperado**: Se muestran todos los eventos de nuevo

### Caso 3: Ver detalle de evento
1. Hacer click en una tarjeta de evento
2. **Resultado esperado**: Se navega a `/dashboard/evento/:id` con:
   - Imagen del evento
   - Nombre, descripción, fecha, hora, ubicación
   - Sección "Tipos de entrada" con nombre de zona, precio y disponibilidad
   - Botón "Pagar con QR" para cada tipo

### Caso 4: Evento sin entradas
1. Si un promotor crea un evento sin tipos de entrada y lo publica
2. **Resultado esperado**: El detalle del evento muestra que no hay entradas disponibles

## Archivos Relacionados
| Archivo | Descripción |
|---------|-------------|
| `frontend/src/components/dashboard/eventos/ExplorarEventos.jsx` | Componente de listado/búsqueda |
| `frontend/src/components/dashboard/eventos/ExplorarEventos.css` | Estilos del listado |
| `frontend/src/components/dashboard/eventos/DetalleEvento.jsx` | Vista detalle del evento |
| `frontend/src/services/eventosService.js` | Servicio de API de eventos |
| `service-events/events/views.py` | Vistas del backend (EventViewSet) |
| `service-events/events/urls.py` | Rutas de la API |
