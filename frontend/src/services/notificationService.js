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

  // TIC-377: Obtener preferencias del usuario desde service-events.
  // El backend devuelve { status, results: [{id, category_id, category_name, enabled}] }
  // Lo normalizamos al shape que usa el frontend: { categorias: {slug: bool}, categoriasIds: {slug: uuid} }
  getPreferencias: async () => {
    const userId = getCurrentUserId();
    const defaults = {
      email_enabled: true,
      in_app_enabled: true,
      categorias: {},
      categoriasIds: {},
    };
    // Guard: si no hay sesion, no llamar al backend (evita 401 → loop redirect)
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) return defaults;
    if (!userId) return defaults;

    try {
      const res = await apiFetch(
        `${EVENTS_URL}/api/v1/users/${userId}/notification-preferences/`
      );
      if (!res.ok) {
        // Fallback a localStorage si el backend falla
        try {
          const local = JSON.parse(localStorage.getItem('user_categorias_pref') || '{}');
          return { ...defaults, categorias: local };
        } catch {
          return defaults;
        }
      }
      const data = await res.json();
      const results = data.results || [];

      // Convertir [{category_id, category_name, enabled}] -> { categorias: {slug: bool}, categoriasIds }
      const categorias = {};
      const categoriasIds = {};
      for (const p of results) {
        const slug = (p.category_name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (slug) {
          categorias[slug] = !!p.enabled;
          categoriasIds[slug] = p.category_id;
        }
      }
      // Sincronizar con localStorage para que ExplorarEventos lo lea
      try {
        localStorage.setItem('user_categorias_pref', JSON.stringify(categorias));
      } catch {}

      return { ...defaults, categorias, categoriasIds };
    } catch (error) {
      console.warn('Preferencias no disponibles (usando localStorage):', error?.message);
      try {
        const local = JSON.parse(localStorage.getItem('user_categorias_pref') || '{}');
        return { ...defaults, categorias: local };
      } catch {
        return defaults;
      }
    }
  },

  // TIC-377: Actualizar preferencias en service-events.
  // Recibe el shape del frontend { categorias: {slug: bool}, categoriasIds: {slug: uuid} }
  // y lo convierte a {preferences: [{category_id, enabled}]} que espera el backend.
  actualizarPreferencias: async (preferencias) => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.warn('No hay user_id — preferencias solo se guardan localmente');
      return preferencias;
    }

    // Construir lista de {category_id, enabled} para todos los slugs con UUID conocido
    const cats = preferencias.categorias || {};
    const ids = preferencias.categoriasIds || {};
    const prefs = [];
    for (const slug of Object.keys(cats)) {
      const uuid = ids[slug];
      if (uuid) {
        prefs.push({ category_id: uuid, enabled: !!cats[slug] });
      }
    }

    if (prefs.length === 0) {
      // No tenemos los UUIDs todavia — el toggle se guardo en localStorage,
      // pero no podemos enviar al backend hasta que NotificationPreferences.jsx
      // cargue las categorias (entonces va a venir con categoriasIds)
      console.warn('Sin UUIDs de categoria — solo localStorage. Recarga el perfil para sincronizar.');
      return preferencias;
    }

    try {
      const res = await apiFetch(
        `${EVENTS_URL}/api/v1/users/${userId}/notification-preferences/`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: prefs }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Error actualizando preferencias');
      }
      return preferencias;
    } catch (error) {
      console.error('Error en actualizarPreferencias:', error?.message);
      // Aun asi devolvemos las preferencias para que el UI se mantenga consistente
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
