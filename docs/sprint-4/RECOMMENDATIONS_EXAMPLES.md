# Ejemplos de Integración - Sistema de Recomendaciones

## Ejemplo 1: Integrar en Dashboard Principal

```jsx
// src/pages/Dashboard.jsx
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import Recommendations from '../components/dashboard/eventos/Recommendations';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { favorites } = useFavorites();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Bienvenido, {user?.nombre}</h1>
        <p>Descubre eventos que te pueden interesar</p>
      </header>

      {/* Sección de Recomendaciones */}
      <section className="dashboard-recommendations">
        <Recommendations />
      </section>

      {/* Otros contenidos del dashboard */}
    </div>
  );
}
```

---

## Ejemplo 2: Tarjeta de Evento en Lista

```jsx
// Usar EventCard en lugar de crear tarjetas manualmente
import EventCard from '../components/EventCard';
import EventSkeleton from '../components/EventSkeleton';

function MiListaEventos() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  return (
    <div className="eventos-grid">
      {cargando ? (
        <EventSkeleton count={6} />
      ) : (
        eventos.map(evento => (
          <EventCard key={evento.id} evento={evento} variant="comprador" />
        ))
      )}
    </div>
  );
}
```

---

## Ejemplo 3: Registrar Interacciones

```jsx
// Al ver detalles de un evento
import { recommendationsService } from '../services/recommendationsService';

function DetalleEvento() {
  const { id } = useParams();
  const viewStartTime = useRef(Date.now());

  useEffect(() => {
    return () => {
      // Registrar cuánto tiempo el usuario vio el evento
      const durationSeconds = Math.floor((Date.now() - viewStartTime.current) / 1000);
      recommendationsService.trackEventView(id, durationSeconds).catch(console.warn);
    };
  }, [id]);

  // ... resto del componente
}
```

---

## Ejemplo 4: Al Realizar Compra

```jsx
// En el servicio de compras o componente
import { recommendationsService } from '../services/recommendationsService';

async function realizarCompra(eventoId, ticketTypeId, cantidad) {
  try {
    const resultado = await compraAPI.crear({
      event_id: eventoId,
      ticket_type_id: ticketTypeId,
      quantity: cantidad
    });

    // Registrar para recomendaciones
    recommendationsService.trackPurchase(eventoId, ticketTypeId, cantidad)
      .catch(console.warn);

    return resultado;
  } catch (error) {
    throw error;
  }
}
```

---

## Ejemplo 5: Botón Flotante de Recomendaciones

```jsx
// src/components/FloatingRecommendationsButton.jsx
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import './FloatingRecommendationsButton.css';

export default function FloatingRecommendationsButton() {
  const { favorites } = useFavorites();

  return (
    <Link
      to="/dashboard/recomendaciones"
      className="floating-recommendations-btn"
      title="Ver mis recomendaciones"
    >
      <span className="icon">⭐</span>
      {favorites.length > 0 && (
        <span className="badge">{favorites.length}</span>
      )}
    </Link>
  );
}
```

```css
/* FloatingRecommendationsButton.css */
.floating-recommendations-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 86, 179, 0.3);
  transition: all 0.3s ease;
  z-index: 100;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 86, 179, 0.4);
  }

  .badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4444;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
  }
}

@media (max-width: 768px) {
  .floating-recommendations-btn {
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    font-size: 1.25rem;
  }
}
```

---

## Ejemplo 6: Mostrar Favoritos en un Sidebar

```jsx
// src/components/FavoritesSidebar.jsx
import { useFavorites } from '../context/FavoritesContext';
import { eventosService } from '../services/eventosService';
import { useEffect, useState } from 'react';
import EventCard from './EventCard';

export default function FavoritesSidebar() {
  const { favorites } = useFavorites();
  const [favoriteEvents, setFavoriteEvents] = useState([]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const allEvents = await eventosService.getEventosDisponibles();
        const filtered = allEvents.filter(e => favorites.includes(e.id));
        setFavoriteEvents(filtered);
      } catch (error) {
        console.error('Error cargando favoritos:', error);
      }
    };

    if (favorites.length > 0) {
      loadFavorites();
    }
  }, [favorites]);

  if (favorites.length === 0) {
    return (
      <aside className="favorites-sidebar">
        <h3>❤️ Mis Favoritos</h3>
        <p>Aún no tienes favoritos. ¡Marca tus eventos preferidos!</p>
      </aside>
    );
  }

  return (
    <aside className="favorites-sidebar">
      <h3>❤️ Mis Favoritos ({favorites.length})</h3>
      <div className="favorites-list">
        {favoriteEvents.map(evento => (
          <div key={evento.id} className="favorite-item">
            <img src={evento.imagen} alt={evento.nombre} />
            <div className="favorite-info">
              <h4>{evento.nombre}</h4>
              <p>{evento.ubicacion}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
```

---

## Ejemplo 7: Hook Personalizado para Recomendaciones

```jsx
// src/hooks/useEventRecommendations.js
import { useEffect, useState } from 'react';
import { recommendationsService } from '../services/recommendationsService';
import { useFavorites } from '../context/FavoritesContext';

export function useEventRecommendations() {
  const { favorites, loadFavorites } = useFavorites();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recommendationsService.getRecommendedEvents();
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (eventId) => {
    try {
      if (favorites.includes(eventId)) {
        await recommendationsService.removeFavorite(eventId);
      } else {
        await recommendationsService.addFavorite(eventId);
      }
      await loadFavorites();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  return {
    recommendations,
    favorites,
    loading,
    error,
    toggleFavorite,
    refresh: loadRecommendations,
  };
}

// Uso:
function MiComponente() {
  const { recommendations, favorites, toggleFavorite } = useEventRecommendations();

  return (
    <div>
      {recommendations.map(evento => (
        <div key={evento.id}>
          <h3>{evento.nombre}</h3>
          <button onClick={() => toggleFavorite(evento.id)}>
            {favorites.includes(evento.id) ? '❤️' : '🤍'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Ejemplo 8: Formulario para Filtrar Recomendaciones

```jsx
// src/components/RecommendationsFilters.jsx
import { useState } from 'react';
import { recommendationsService } from '../services/recommendationsService';
import './RecommendationsFilters.css';

export default function RecommendationsFilters({ onFilter }) {
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [location, setLocation] = useState('all');

  const handleFilterChange = async () => {
    try {
      let events = [];

      if (category !== 'all') {
        events = await recommendationsService.getEventsByCategory(category);
      } else {
        events = await recommendationsService.getRecommendedEvents();
      }

      // Aplicar otros filtros
      if (priceRange !== 'all') {
        const [min, max] = priceRange.split('-').map(Number);
        events = events.filter(e => e.precio >= min && e.precio <= max);
      }

      onFilter(events);
    } catch (error) {
      console.error('Error filtering:', error);
    }
  };

  return (
    <div className="recommendations-filters">
      <div className="filter-group">
        <label>Categoría</label>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            handleFilterChange();
          }}
        >
          <option value="all">Todas</option>
          <option value="musica">Música</option>
          <option value="teatro">Teatro</option>
          <option value="deportes">Deportes</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Rango de Precio</label>
        <select
          value={priceRange}
          onChange={(e) => {
            setPriceRange(e.target.value);
            handleFilterChange();
          }}
        >
          <option value="all">Todos</option>
          <option value="0-50">0 - 50 Bs.</option>
          <option value="50-100">50 - 100 Bs.</option>
          <option value="100-500">100 - 500 Bs.</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Notas Importantes

1. **Always wrap children in FavoritesProvider** - El contexto debe estar disponible en toda la app
2. **Use EventSkeleton during loading** - Mejor experiencia de usuario
3. **Track user interactions** - Ayuda a mejorar recomendaciones
4. **Handle errors gracefully** - El sistema tiene fallbacks builtin
5. **Test on mobile** - Los estilos son responsive

