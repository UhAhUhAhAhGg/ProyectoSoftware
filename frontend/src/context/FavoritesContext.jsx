import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { recommendationsService } from '../services/recommendationsService';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar favoritos al montar el componente
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await recommendationsService.getFavorites();
      // Normalizar los datos en caso de que sean objetos
      const ids = Array.isArray(data)
        ? data.map((item) => (typeof item === 'object' ? item.id || item.event_id : item))
        : [];
      setFavorites(ids);
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addFavorite = useCallback(async (eventId) => {
    try {
      await recommendationsService.addFavorite(eventId);
      setFavorites((prev) =>
        prev.includes(eventId) ? prev : [...prev, eventId]
      );
    } catch (error) {
      console.error('Error añadiendo favorito:', error);
      throw error;
    }
  }, []);

  const removeFavorite = useCallback(async (eventId) => {
    try {
      await recommendationsService.removeFavorite(eventId);
      setFavorites((prev) => prev.filter((id) => id !== eventId));
    } catch (error) {
      console.error('Error removiendo favorito:', error);
      throw error;
    }
  }, []);

  const toggleFavorite = useCallback(
    async (eventId) => {
      if (isFavorite(eventId)) {
        await removeFavorite(eventId);
      } else {
        await addFavorite(eventId);
      }
    },
    [favorites, addFavorite, removeFavorite]
  );

  const isFavorite = useCallback(
    (eventId) => {
      return favorites.includes(eventId);
    },
    [favorites]
  );

  const value = {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    loadFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  }
  return context;
}
