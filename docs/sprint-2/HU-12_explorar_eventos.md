# HU-12: Explorar Eventos (Comprador)

> Como usuario comprador, quiero visualizar los eventos disponibles con sus detalles para poder elegir cual me interesa.

## Arquitectura

### Flujo

```
Comprador autenticado en /dashboard
  -> Clic en "Explorar Eventos"
  -> Frontend: /dashboard/eventos (ExplorarEventos.jsx)
  -> GET /api/v1/events/?status=published
  -> Muestra grid de eventos con filtro de busqueda
  -> Clic en "Ver detalle"
  -> Frontend: /dashboard/evento/:id (DetalleEvento.jsx)
  -> GET /api/v1/events/{id}/ + GET /api/v1/events/{id}/tickets/
  -> Muestra detalle completo + tipos de entrada
```

## Backend (service-events)

### Endpoints utilizados

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/v1/events/?status=published` | GET | Lista eventos publicados |
| `/api/v1/events/{id}/` | GET | Detalle de un evento |
| `/api/v1/events/{id}/tickets/` | GET | Tipos de entrada de un evento |
| `/api/v1/categories/` | GET | Lista de categorias |

### Contexto de imagenes

Los endpoints `/by_promoter/` y `/upcoming/` usan `context={'request': request}` en el serializer para generar URLs completas de imagenes (ej: `http://localhost:8002/media/events/foto.jpg`).

## Frontend

### ExplorarEventos.jsx

- **Ruta:** `/dashboard/eventos`
- **States:** `eventos`, `cargando`, `busqueda`
- **Flujo:**
  1. Al montar, llama `eventosService.getEventosDisponibles()`
  2. Muestra grid de tarjetas con: imagen, nombre, fecha, hora, ubicacion, ciudad, descripcion, precio minimo
  3. Barra de busqueda filtra por nombre, ciudad o ubicacion (filtrado en memoria via `useMemo`)
  4. Cada tarjeta tiene link "Ver detalle" a `/dashboard/evento/{id}`
- **Estados vacios:**
  - Sin eventos: "No hay eventos disponibles" + link a dashboard
  - Sin resultados de busqueda: "No se encontraron eventos"

### DetalleEvento.jsx

- **Ruta:** `/dashboard/evento/:id`
- **States:** `evento`, `cargando`
- **Flujo:**
  1. Extrae `id` de la URL via `useParams()`
  2. Llama `eventosService.getEventoById(id)` que hace 2 peticiones (evento + tickets)
  3. Muestra: imagen, nombre, descripcion, fecha, hora, ubicacion
  4. **Tipos de entrada:** Lista cada tipo con nombre, precio (Bs) y entradas disponibles
  5. **Barra de disponibilidad:** Porcentaje visual de boletos vendidos vs capacidad
  6. Boton "Seleccionar este evento" (placeholder para futuro flujo de compra)
- **Estado no disponible:** Si el evento no es `activo`, muestra "Evento no disponible"

### eventosService.js - Funciones clave

```javascript
getEventosDisponibles()           // GET /api/v1/events/?status=published
getEventoById(id)                 // GET evento + GET tickets (2 llamadas)
getCategorias()                   // GET /api/v1/categories/
```

### Mapeo de datos (eventosService.js)

La capa de servicio traduce nombres de campos del backend (ingles) al frontend (espanol):

| Backend | Frontend | Ejemplo |
|---------|----------|---------|
| `name` | `nombre` | "Concierto Rock" |
| `location` | `ubicacion` / `ciudad` | "Cochabamba" |
| `status` | `estado` | "activo" |
| `tickets[].name` | `tiposEntrada[].nombre` | "VIP" |
| `tickets[].price` | `tiposEntrada[].precio` | 150.0 |
| `category_name` | `categoriaNombre` | "Musica" |

**`mapEvento(e)`** calcula `precio` como el minimo de los tickets activos.
**`mapTipoEntrada(t)`** calcula `disponibles` desde `available_capacity` o `max_capacity - current_sold`.

## Archivos relacionados

| Archivo | Descripcion |
|---------|-------------|
| `frontend/src/components/dashboard/eventos/ExplorarEventos.jsx` | Grid de eventos para comprador |
| `frontend/src/components/dashboard/eventos/ExplorarEventos.css` | Estilos del grid |
| `frontend/src/components/dashboard/eventos/DetalleEvento.jsx` | Vista detalle de evento |
| `frontend/src/components/dashboard/eventos/DetalleEvento.css` | Estilos del detalle |
| `frontend/src/services/eventosService.js` | Capa de servicio con mapeo |
| `frontend/src/services/apiHelper.js` | Helper para fetch con JWT |
| `service-events/events/views.py` | ViewSets de eventos |
| `service-events/events/serializers.py` | Serializadores con context de request |

## Pruebas de aceptacion

### PA-1: Ver lista de eventos disponibles
1. Iniciar sesion como `comprador@ticketproject.com`
2. Clic en "Explorar Eventos"
3. **Verificar:** Grid con eventos publicados, mostrando imagen, nombre, precio

### PA-2: Filtrar eventos por busqueda
1. Escribir el nombre de un evento en la barra de busqueda
2. **Verificar:** Solo se muestran eventos que coincidan
3. Borrar busqueda -> vuelven todos los eventos

### PA-3: Ver detalle de un evento
1. Clic en "Ver detalle" de cualquier evento
2. **Verificar:** Se muestra descripcion, fecha, ubicacion, tipos de entrada con precios, barra de disponibilidad
