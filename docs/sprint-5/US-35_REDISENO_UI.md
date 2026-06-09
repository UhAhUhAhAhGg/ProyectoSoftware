# Rediseño de Interfaz: Dashboard de Comprador y Explorar Eventos

Como parte de los últimos pulidos del **Sprint 5**, se implementó un rediseño completo de las pantallas orientadas al comprador, alineándolas con la estética *premium* del proyecto (paleta de colores Marrón/Dorado) e integrando principios modernos de diseño (glassmorphism, animaciones fluidas, grid centrado en imágenes).

## Objetivos del Rediseño
1. **Unificación de marca:** Asegurar que todos los botones, alertas y elementos sigan la paleta de colores oficial (`#4A3219` a `#AD8149`).
2. **Mejora de experiencia de usuario (UX):** Hacer que las tarjetas de eventos destaquen más las imágenes y que los botones de acción reaccionen de manera fluida al cursor.
3. **Limpieza visual:** Eliminar redundancias (saludos duplicados) y estructurar mejor el espacio con tarjetas *glassmorphism* (cristal esmerilado).

## Componentes Actualizados

### 1. Dashboard Principal (`Dashboard.jsx` y `Dashboard.css`)
- **Hero Banner:** Se implementó un banner interactivo con gradiente Marrón Oscuro (`#4A3219`) a Dorado (`#AD8149`), sombras amplias y *chips* de estado con efecto de desenfoque.
- Se eliminó el saludo duplicado ("Hola Comprador") que se renderizaba desde el componente hijo.

### 2. Opciones de Comprador (`OpcionesComprador.jsx` y `OpcionesComprador.css`)
- **Acciones Rápidas:** Los botones se transformaron en tarjetas flotantes sobre fondo blanco con un delicado borde y sombras dinámicas al pasar el mouse.
- **Categorías:** Se reemplazó el diseño de cajas aburridas por un grid interactivo que rota el ícono ligeramente en el estado `hover`.
- **Eventos Destacados:** Se reemplazó la vista de lista por una **cuadrícula vertical (Grid) amplia**.
  - Las imágenes ahora ocupan la mitad superior de la tarjeta (220px de altura).
  - Al pasar el cursor, la imagen hace un ligero `zoom in` (escala 1.05).
  - Los precios se reubicaron en la esquina inferior derecha como una "etiqueta" independiente.

### 3. Explorar Eventos (`ExplorarEventos.jsx` y `ExplorarEventos.css`)
- **Filtros de búsqueda:** Los inputs de texto y selectores pasaron de tener bordes grises genéricos a bordes sutiles que brillan en color dorado al recibir foco (`:focus`).
- **Alerta de Categorías:** Se modificó el diseño de la alerta amarilla para que utilice un gradiente casi blanco/crema con *glassmorphism*, eliminando los colores planos estridentes.
- **Tarjetas de Eventos Generales (`EventCard.css`):**
  - **Botón "Ver detalle":** Cambió del color azul genérico (`#007bff`) al gradiente oficial marrón/dorado.
  - **Etiquetas (Badges):** Los colores genéricos (verde, morado brillante, naranja) para indicar "Premium" o "Pro" se reemplazaron por diseños sutiles de cristal que laten ligeramente, para no robar atención excesiva a la imagen del evento.

## Conclusión
Estos cambios garantizan que toda la navegación del Comprador, desde el ingreso al Dashboard hasta la exploración de eventos, comunique "exclusividad" y "modernidad", cumpliendo con el objetivo estético del proyecto TicketGo.
