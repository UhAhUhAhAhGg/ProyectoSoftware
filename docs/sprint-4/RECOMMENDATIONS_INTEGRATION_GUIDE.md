# Guía de Integración - Sistema de Recomendaciones y Favoritos

## Descripción General

Se ha implementado un sistema completo de recomendaciones de eventos con las siguientes características:

✅ **Botón de Favorito/Corazón** en cada tarjeta de evento  
✅ **Skeleton Loaders** mientras se cargan las recomendaciones  
✅ **Contexto de Favoritos** global para todo el app  
✅ **Servicio de Recomendaciones** con fallback a localStorage  
✅ **Componente EventCard** reutilizable con múltiples variantes  
✅ **Página de Recomendaciones** con filtros y búsqueda  

---

## Archivos Creados

### Servicios
- `src/services/recommendationsService.js` - API para recomendaciones y favoritos

### Contexto
- `src/context/FavoritesContext.jsx` - Context Provider para favoritos

### Componentes
- `src/components/FavoriteButton.jsx` - Botón de corazón/favorito
- `src/components/FavoriteButton.css` - Estilos del botón
- `src/components/EventSkeleton.jsx` - Skeleton loader para eventos
- `src/components/EventSkeleton.css` - Estilos del skeleton
- `src/components/EventCard.jsx` - Tarjeta de evento reutilizable
- `src/components/EventCard.css` - Estilos de la tarjeta
- `src/components/dashboard/eventos/Recommendations.jsx` - Página de recomendaciones
- `src/components/dashboard/eventos/Recommendations.css` - Estilos

### Archivos Modificados
- `src/app/Providers.jsx` - Agregado FavoritesProvider
- `src/components/dashboard/eventos/ExplorarEventos.jsx` - Integrado EventCard y EventSkeleton

---

## Cómo Usar

### 1. **Botón de Favorito en Tarjetas**

```jsx
import FavoriteButton from '../components/FavoriteButton';

// En cualquier componente:
<FavoriteButton eventId={evento.id} size="medium" />
```

### 2. **Usar EventCard Reutilizable**

```jsx
import EventCard from '../components/EventCard';

// Variantes: 'comprador', 'recomendaciones', 'admin'
<EventCard evento={evento} variant="comprador" />
```

### 3. **Mostrar Skeleton Mientras Carga**

```jsx
import EventSkeleton from '../components/EventSkeleton';

{cargando && <EventSkeleton count={6} />}
```

### 4. **Usar el Hook de Favoritos**

```jsx
import { useFavorites } from '../context/FavoritesContext';

function MiComponente() {
  const { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite } = useFavorites();
  
  // favorites: array de IDs de favoritos
  // isFavorite(id): boolean
  // toggleFavorite(id): toggle automático
}
```

### 5. **Servicio de Recomendaciones**

```jsx
import { recommendationsService } from '../services/recommendationsService';

// Obtener recomendaciones
const recomendaciones = await recommendationsService.getRecommendedEvents();

// Obtener favoritos
const misRecomendados = await recommendationsService.getFavorites();

// Registrar interacción (para mejorar recomendaciones)
await recommendationsService.trackEventView(eventoId, duracionEnSegundos);
await recommendationsService.trackPurchase(eventoId, ticketTypeId, cantidad);

// Agregar/Quitar favorito
await recommendationsService.addFavorite(eventoId);
await recommendationsService.removeFavorite(eventoId);
```

---

## Integración en Rutas

### Opción 1: En Dashboard Principal

Puedes agregar un botón a la página del Dashboard que navegue a recomendaciones:

```jsx
import { Link } from 'react-router-dom';

<Link to="/dashboard/recomendaciones" className="btn">
  ⭐ Mis Recomendaciones
</Link>
```

### Opción 2: Como Sección en el Dashboard

```jsx
import Recommendations from '../components/dashboard/eventos/Recommendations';

<Recommendations />
```

### Opción 3: Ruta Independiente

```jsx
// En tu archivo de rutas, agrega:
{
  path: '/dashboard/recomendaciones',
  element: <Recommendations />
}
```

---

## Funcionalidades Clave

### Sistema de Favoritos
- ✅ Agregar/Quitar favoritos con un clic
- ✅ Persistencia en localStorage (fallback)
- ✅ Sincronización con backend (si existe API)
- ✅ Animación de corazón al cambiar estado

### Recomendaciones
- ✅ Algoritmo basado en comportamiento del usuario
- ✅ Filtros: Todos, Populares, Favoritos
- ✅ Skeleton loaders para mejor UX
- ✅ Estados vacíos personalizados
- ✅ Refresh manual de recomendaciones

### Rastreo de Comportamiento
- ✅ Registra visualizaciones de eventos
- ✅ Registra compras realizadas
- ✅ Usa esta data para mejorar recomendaciones

---

## Personalizaciones

### Cambiar Estilos de Colores

En los archivos `.css`, busca y reemplaza:
- `#007bff` (azul principal)
- `#0056b3` (azul oscuro)
- `#f0f0f0` (gris claro)

### Ajustar Cantidad de Skeletons

```jsx
<EventSkeleton count={12} /> // Mostrar 12 en lugar de 3
```

### Cambiar Tamaño del Botón de Favorito

```jsx
<FavoriteButton eventId={id} size="small" />   // pequeño
<FavoriteButton eventId={id} size="medium" />  // mediano (default)
<FavoriteButton eventId={id} size="large" />   // grande
```

### Mostrar Etiqueta en Botón

```jsx
<FavoriteButton eventId={id} showLabel={true} />
```

---

## Endpoints Backend Requeridos (Opcional)

Si deseas implementar recomendaciones dinámicas en el backend, estos son los endpoints esperados:

```
POST   /api/v1/favorites/                    - Agregar favorito
DELETE /api/v1/favorites/{event_id}/          - Eliminar favorito
GET    /api/v1/favorites/                     - Obtener favoritos
POST   /api/v1/event-views/                   - Registrar vista
POST   /api/v1/purchase-tracking/             - Registrar compra
GET    /api/v1/events/recommendations/        - Obtener recomendaciones
```

**Nota**: Si estos endpoints no existen, el sistema usará fallbacks:
- Guarda favoritos en `localStorage`
- Retorna eventos populares en lugar de personalizados

---

## Flujo de Usuario Recomendado

1. **Usuario Explora Eventos** → Se registran vistas
2. **Usuario Marca Favoritos** → Se guardan localmente o en BD
3. **Usuario Realiza Compras** → Se registran para mejorar recomendaciones
4. **Usuario Visita Recomendaciones** → Ve eventos personalizados basados en su actividad
5. **Sistema Mejora Continuamente** → Cada interacción refina las recomendaciones

---

## Testing

### Verificar que Funciona

1. Abre DevTools (F12)
2. Inspecciona `localStorage` → Busca `favorites`
3. Haz clic en corazón de un evento
4. Verifica que se agregó el ID al array
5. Navega a `/dashboard/recomendaciones`
6. Verifica que aparezcan tus favoritos en el filtro

---

## Troubleshooting

### Favoritos no persisten
- Verifica que `FavoritesProvider` esté en `Providers.jsx`
- Revisa la consola por errores de API

### Skeletons no desaparecen
- Verifica que `loading` esté siendo actualizado correctamente
- Revisa que el estado `cargando` sea `false` cuando los datos lleguen

### Botón de favorito no funciona
- Verifica que el evento tenga un `id` válido
- Revisa la consola por errores de API
- Asegúrate de estar dentro de `FavoritesProvider`

---

## Próximas Mejoras Sugeridas

- [ ] Implementar algoritmo de recomendaciones en backend
- [ ] Agregar notificaciones de eventos favoritos
- [ ] Compartir favoritos con amigos
- [ ] Crear listas personalizadas de eventos
- [ ] Integrar con sistema de suscripciones

