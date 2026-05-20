import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { recommendationsService } from '../../../services/recommendationsService';
import { useFavorites } from '../../../context/FavoritesContext';
import EventCard from '../../EventCard';
import EventSkeleton from '../../EventSkeleton';
import './Recommendations.css';

function Recommendations() {
  const { favorites, loadFavorites } = useFavorites();
  const [recommendations, setRecommendations] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, favorites, popular

  useEffect(() => {
  loadRecommendations();
}, [favorites]);

useEffect(() => {
  loadFavorites();
}, []);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener eventos recomendados
      const recommended = await recommendationsService.getRecommendedEvents();

      // Si la recomendación falla, obtener eventos populares
      let events = recommended;
      if (!events || events.length === 0) {
        events = await recommendationsService.getPopularEvents();
      }

      setRecommendations(events);
      setAllEvents(events);
    } catch (err) {
      console.error('Error al cargar recomendaciones:', err);
      setError(
        'No se pudieron cargar las recomendaciones. Por favor, intenta más tarde.'
      );
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecommendations = useMemo(() => {
    switch (filterType) {
      case 'favorites':
        return allEvents.filter((evento) => favorites.includes(evento.id));
      case 'popular':
        // Mostrar eventos con más views/compras (primeros de la lista)
        return allEvents.slice(0, 6);
      case 'all':
      default:
        return allEvents;
    }
  }, [allEvents, favorites, filterType]);

  const handleFilterChange = (newFilter) => {
    setFilterType(newFilter);
  };

  const handleRefresh = () => {
    loadRecommendations();
  };

  return (
    <section className="recommendations-section">
      <div className="recommendations-header-nav">
        <Link to="/dashboard" className="btn-volver-dashboard">
          ← Volver al dashboard
        </Link>
      </div>

      <header className="recommendations-header">
        <div className="header-content">
          <h1>Eventos Recomendados</h1>
          <p>Descubre eventos basados en tus gustos y preferencias</p>
        </div>
        <button
          className="btn-refresh"
          onClick={handleRefresh}
          disabled={loading}
          title="Actualizar recomendaciones"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </header>

      {/* Filtros */}
      <div className="recommendations-filters">
        <button
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          <span className="icon">✨</span>
          Todos
        </button>
        <button
          className={`filter-btn ${filterType === 'popular' ? 'active' : ''}`}
          onClick={() => handleFilterChange('popular')}
        >
          <span className="icon">🔥</span>
          Populares
        </button>
        <button
          className={`filter-btn ${filterType === 'favorites' ? 'active' : ''}`}
          onClick={() => handleFilterChange('favorites')}
        >
          <span className="icon">❤️</span>
          Favoritos ({favorites.length})
        </button>
      </div>

      {/* Contenido */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button className="btn-retry" onClick={handleRefresh}>
            Reintentar
          </button>
        </div>
      )}

      {loading && (
        <div className="eventos-grid-recomendaciones loading">
          <EventSkeleton count={6} />
        </div>
      )}

      {!loading && filteredRecommendations.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            {filterType === 'favorites' ? '💔' : '🎭'}
          </div>
          <h3>
            {filterType === 'favorites'
              ? 'Aún no tienes favoritos'
              : 'No hay recomendaciones disponibles'}
          </h3>
          <p>
            {filterType === 'favorites'
              ? 'Marca eventos como favoritos para verlos aquí'
              : 'Sigue explorando eventos y las recomendaciones se actualizarán'}
          </p>
          {filterType === 'favorites' && (
            <button
              className="btn-explore"
              onClick={() => handleFilterChange('all')}
            >
              Ver todos los eventos
            </button>
          )}
        </div>
      )}

      {!loading && filteredRecommendations.length > 0 && (
        <div className="eventos-grid-recomendaciones">
          {filteredRecommendations.map((evento) => (
            <EventCard
              key={evento.id}
              evento={evento}
              variant="recomendaciones"
            />
          ))}
        </div>
      )}

      {/* Info adicional */}
      {!loading && filteredRecommendations.length > 0 && (
        <div className="recommendations-footer">
          <p>
            Mostrando {filteredRecommendations.length} de {allEvents.length}{' '}
            eventos
          </p>
          <Link to="/dashboard/explorar" className="btn-explore-more">
            Ver todos los eventos →
          </Link>
        </div>
      )}
    </section>
  );
}

export default Recommendations;
