import { useState } from 'react';
import { useFavorites } from '../context/FavoritesContext';
import './FavoriteButton.css';

/**
 * Componente botón de favorito/corazón
 * @param {number} eventId - ID del evento
 * @param {boolean} showLabel - Mostrar etiqueta de texto junto al icono
 * @param {string} size - Tamaño: 'small', 'medium', 'large'
 */
export default function FavoriteButton({ eventId, showLabel = false, size = 'medium' }) {
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const [isAnimating, setIsAnimating] = useState(false);
  const isFav = isFavorite(eventId);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading || isAnimating) return;

    try {
      setIsAnimating(true);
      await toggleFavorite(eventId);
      // Agregar efecto visual
      setIsAnimating(false);
    } catch (error) {
      console.error('Error al cambiar favorito:', error);
      setIsAnimating(false);
    }
  };

  const sizeClass = `size-${size}`;
  const stateClass = isFav ? 'active' : 'inactive';

  return (
    <button
      className={`favorite-btn ${sizeClass} ${stateClass} ${isAnimating ? 'animating' : ''}`}
      onClick={handleClick}
      disabled={loading || isAnimating}
      aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <span className="heart-icon">
        {isFav ? '❤️' : '🤍'}
      </span>
      {showLabel && (
        <span className="label">
          {isFav ? 'Favorito' : 'Favorito'}
        </span>
      )}
    </button>
  );
}
