import { apiFetch } from './apiHelper';

const PROFILES_URL = process.env.NEXT_PUBLIC_PROFILES_URL || 'http://localhost:8001';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

// Helper para obtener el user_id del usuario logueado
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  } catch {
    return null;
  }
};

export const notificationService = {
  // Obtener todas las notificaciones del usuario (TIC-375)
  getNotificaciones: async () => {
    const userId = getCurrentUserId();
    if (!userId) return { results: [] };
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/users/${userId}/notifications/`);
      if (!res.ok) return { results: [] };
      const data = await res.json();
      return data.results ? data : { results: data };
    } catch (error) {
      console.warn('Notificaciones no disponibles (fallback a lista vacia):', error?.message);
      return { results: [] };
    }
  },

  // Obtener notificaciones no leídas
  getNotificacionesNoLeidas: async () => {
    const userId = getCurrentUserId();
    if (!userId) return { results: [] };
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/users/${userId}/notifications/?leida=false`);
      if (!res.ok) return { results: [] };
      const data = await res.json();
      return data.results ? data : { results: data };
    } catch (error) {
      console.warn('No-leidas no disponibles (fallback a lista vacia):', error?.message);
      return { results: [] };
    }
  },

  // Marcar una notificación como leída
  marcarComoLeida: async (notificationId) => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/notifications/${notificationId}/mark-as-read/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!res.ok) throw new Error('Error marcando notificación como leída');
      return await res.json();
    } catch (error) {
      console.error('Error en marcarComoLeida:', error);
      throw error;
    }
  },

  // Marcar todas las notificaciones como leídas
  marcarTodasComoLeidas: async () => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/notifications/mark-all-as-read/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!res.ok) throw new Error('Error marcando todas como leídas');
      return await res.json();
    } catch (error) {
      console.error('Error en marcarTodasComoLeidas:', error);
      throw error;
    }
  },

  // Eliminar una notificación
  eliminarNotificacion: async (notificationId) => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/notifications/${notificationId}/`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error('Error eliminando notificación');
      return true;
    } catch (error) {
      console.error('Error en eliminarNotificacion:', error);
      throw error;
    }
  },

  // Obtener preferencias de notificación del usuario
  getPreferencias: async () => {
    try {
      const res = await apiFetch(`${AUTH_URL}/api/v1/users/me/notification-preferences/`);
      if (!res.ok) throw new Error('Endpoint no disponible');
      return await res.json();
    } catch (error) {
      console.warn('Preferencias no disponibles (usando defaults):', error?.message);
      // Retornar preferencias por defecto si el endpoint no existe
      return {
        email_enabled: true,
        in_app_enabled: true,
        categorias: {
          futbol: true,
          cine: true,
          teatro: true,
          musica: true,
          deportes: true,
          conciertos: true,
          otros: true,
        },
      };
    }
  },

  // Actualizar preferencias de notificación
  actualizarPreferencias: async (preferencias) => {
    try {
      const res = await apiFetch(
        `${AUTH_URL}/api/v1/users/me/notification-preferences/`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferencias),
        }
      );
      if (!res.ok) throw new Error('Error actualizando preferencias');
      return await res.json();
    } catch (error) {
      console.error('Error en actualizarPreferencias:', error);
      // Si el endpoint no existe, retornar las preferencias que se intentaron guardar
      return preferencias;
    }
  },

  // Obtener notificaciones por categoría
  getNotificacionesPorCategoria: async (categoria) => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/notifications/?category=${categoria}`
      );
      if (!res.ok) throw new Error('Error cargando notificaciones por categoría');
      return await res.json();
    } catch (error) {
      console.error('Error en getNotificacionesPorCategoria:', error);
      throw error;
    }
  },

  // Suscribirse a notificaciones de una categoría
  suscribirseACategoria: async (categoria) => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/categories/${categoria}/subscribe/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!res.ok) throw new Error('Error suscribiéndose a categoría');
      return await res.json();
    } catch (error) {
      console.error('Error en suscribirseACategoria:', error);
      throw error;
    }
  },

  // Desuscribirse de una categoría
  desuscribirseDeCategoria: async (categoria) => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/categories/${categoria}/unsubscribe/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!res.ok) throw new Error('Error desuscribiéndose de categoría');
      return await res.json();
    } catch (error) {
      console.error('Error en desuscribirseDeCategoria:', error);
      throw error;
    }
  },
};
