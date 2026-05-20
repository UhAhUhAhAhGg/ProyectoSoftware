import api from './api';
import { mapEvento } from './eventosService';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

export const recommendationsService = {
  /**
   * Marca un evento como favorito del usuario actual
   */
  addFavorite: async (eventId) => {
    try {
      const response = await api.post(`${EVENTS_URL}/api/v1/favorites/`, {
        event_id: eventId,
      });
      return response.data;
    } catch (error) {
      // Si el endpoint no existe, guardar en localStorage como fallback
      if (error.response?.status === 404) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        if (!favorites.includes(eventId)) {
          favorites.push(eventId);
          localStorage.setItem('favorites', JSON.stringify(favorites));
        }
        return { event_id: eventId };
      }
      throw error;
    }
  },

  /**
   * Elimina un evento de los favoritos del usuario
   */
  removeFavorite: async (eventId) => {
    try {
      await api.delete(`${EVENTS_URL}/api/v1/favorites/${eventId}/`);
    } catch (error) {
      // Si el endpoint no existe, eliminar de localStorage como fallback
      if (error.response?.status === 404) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const filtered = favorites.filter((id) => id !== eventId);
        localStorage.setItem('favorites', JSON.stringify(filtered));
        return;
      }
      throw error;
    }
  },

  /**
   * Obtiene todos los eventos favoritos del usuario actual
   */
  getFavorites: async () => {
    try {
      const response = await api.get(`${EVENTS_URL}/api/v1/favorites/`);
      return response.data.results || response.data;
    } catch (error) {
      // Si el endpoint no existe, leer de localStorage como fallback
      if (error.response?.status === 404) {
        return JSON.parse(localStorage.getItem('favorites') || '[]');
      }
      throw error;
    }
  },

  /**
   * Verifica si un evento es favorito del usuario
   */
  isFavorite: async (eventId) => {
    try {
      const favorites = await recommendationsService.getFavorites();
      if (Array.isArray(favorites)) {
        return favorites.includes(eventId);
      }
      // Si es array de objetos
      return favorites.some((fav) => fav.id === eventId || fav.event_id === eventId);
    } catch {
      return false;
    }
  },

  /**
   * Registra una visualización de evento para el algoritmo de recomendaciones
   */
  trackEventView: async (eventId, durationSeconds = 0) => {
    try {
      await api.post(`${EVENTS_URL}/api/v1/event-views/`, {
        event_id: eventId,
        duration_seconds: durationSeconds,
      });
    } catch (error) {
      // Si falla, solo registrar en consola
      console.warn('No se pudo registrar la visualización:', error);
    }
  },

  /**
   * Registra una acción de compra para el algoritmo de recomendaciones
   */
  trackPurchase: async (eventId, ticketTypeId, quantity = 1) => {
    try {
      await api.post(`${EVENTS_URL}/api/v1/purchase-tracking/`, {
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity,
      });
    } catch (error) {
      console.warn('No se pudo registrar la compra:', error);
    }
  },

  /**
   * Obtiene eventos recomendados para el usuario basado en comportamiento y favoritos
   */
  getRecommendedEvents: async () => {
    try {
      // Intentar el endpoint personalizado del usuario logueado (TIC-362)
      const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (userId) {
        const response = await api.get(
          `${EVENTS_URL}/api/v1/users/${userId}/recommendations/`
        );
        const raw = response.data.results || response.data;
        return Array.isArray(raw) ? raw.map(mapEvento) : [];
      }
      // Sin usuario logueado → fallback a populares
      return await recommendationsService.getPopularEvents();
    } catch (error) {
      // Cualquier error (404, 401, etc) → fallback a populares
      return await recommendationsService.getPopularEvents();
    }
  },

  /**
   * Obtiene eventos populares como fallback
   */
  getPopularEvents: async () => {
    try {
      const response = await api.get(
        `${EVENTS_URL}/api/v1/events/?status=published&ordering=-created_at`
      );
      const raw = (response.data.results || response.data).slice(0, 10);
      return Array.isArray(raw) ? raw.map(mapEvento) : [];
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtiene eventos filtrados por categoría para recomendaciones
   */
  getEventsByCategory: async (categoryId) => {
    try {
      const response = await api.get(
        `${EVENTS_URL}/api/v1/events/?status=published&category=${categoryId}`
      );
      const raw = response.data.results || response.data;
      return Array.isArray(raw) ? raw.map(mapEvento) : [];
    } catch (error) {
      throw error;
    }
  },
};
