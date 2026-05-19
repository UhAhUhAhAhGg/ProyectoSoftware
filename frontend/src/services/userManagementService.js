import { apiFetch } from './apiHelper';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';
const PROFILES_URL = process.env.NEXT_PUBLIC_PROFILES_URL || 'http://localhost:8001';

export const userManagementService = {
  // ===== GESTIÓN DE USUARIOS =====

  /**
   * Obtener lista de todos los usuarios (clientes y promotores)
   * @param {Object} params - Parámetros de filtro y paginación
   * @returns {Promise<Array>}
   */
  getUsuarios: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const res = await apiFetch(
        `${AUTH_URL}/api/v1/users/?${queryString}`
      );
      if (!res.ok) throw new Error('Error al obtener usuarios');
      return await res.json();
    } catch (error) {
      console.error('Error en getUsuarios:', error);
      throw error;
    }
  },

  /**
   * Obtener un usuario específico
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>}
   */
  getUsuario: async (userId) => {
    try {
      const res = await apiFetch(`${AUTH_URL}/api/v1/users/${userId}/`);
      if (!res.ok) throw new Error('Error al obtener usuario');
      return await res.json();
    } catch (error) {
      console.error('Error en getUsuario:', error);
      throw error;
    }
  },

  /**
   * Suspender cuenta de usuario
   * @param {string} userId - ID del usuario
   * @param {string} razon - Razón de la suspensión
   * @returns {Promise<Object>}
   */
  suspenderUsuario: async (userId, razon) => {
    try {
      const res = await apiFetch(
        `${AUTH_URL}/api/v1/users/${userId}/suspend/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ razon }),
        }
      );
      if (!res.ok) throw new Error('Error al suspender usuario');
      return await res.json();
    } catch (error) {
      console.error('Error en suspenderUsuario:', error);
      throw error;
    }
  },

  /**
   * Reactivar usuario suspendido
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>}
   */
  reactivarUsuario: async (userId) => {
    try {
      const res = await apiFetch(
        `${AUTH_URL}/api/v1/users/${userId}/reactivate/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!res.ok) throw new Error('Error al reactivar usuario');
      return await res.json();
    } catch (error) {
      console.error('Error en reactivarUsuario:', error);
      throw error;
    }
  },

  /**
   * Dar de baja (eliminar) usuario de manera permanente
   * @param {string} userId - ID del usuario
   * @param {string} razon - Razón de la baja
   * @returns {Promise<Object>}
   */
  darDeBajaUsuario: async (userId, razon) => {
    try {
      const res = await apiFetch(
        `${AUTH_URL}/api/v1/users/${userId}/delete-account/`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ razon, admin_initiated: true }),
        }
      );
      if (!res.ok) throw new Error('Error al dar de baja usuario');
      return await res.json();
    } catch (error) {
      console.error('Error en darDeBajaUsuario:', error);
      throw error;
    }
  },

  /**
   * Obtener historial de acciones sobre un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>}
   */
  getHistorialAcciones: async (userId) => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/user-actions/${userId}/`
      );
      if (!res.ok) throw new Error('Error al obtener historial');
      return await res.json();
    } catch (error) {
      console.error('Error en getHistorialAcciones:', error);
      return [];
    }
  },

  /**
   * Filtrar usuarios por estado
   * @param {string} estado - 'activo', 'suspendido', 'baja'
   * @returns {Promise<Array>}
   */
  getUsuariosPorEstado: async (estado) => {
    try {
      const res = await apiFetch(
        `${AUTH_URL}/api/v1/users/?status=${estado}`
      );
      if (!res.ok) throw new Error('Error al filtrar usuarios');
      return await res.json();
    } catch (error) {
      console.error('Error en getUsuariosPorEstado:', error);
      throw error;
    }
  },

  /**
   * Obtener promotores específicamente
   * @returns {Promise<Array>}
   */
  getPromotores: async () => {
    try {
      const res = await apiFetch(`${AUTH_URL}/api/v1/users/promotores/`);
      if (!res.ok) throw new Error('Error al obtener promotores');
      return await res.json();
    } catch (error) {
      console.error('Error en getPromotores:', error);
      throw error;
    }
  },

  /**
   * Obtener compradores específicamente
   * @returns {Promise<Array>}
   */
  getCompradores: async () => {
    try {
      const res = await apiFetch(`${AUTH_URL}/api/v1/users/compradores/`);
      if (!res.ok) throw new Error('Error al obtener compradores');
      return await res.json();
    } catch (error) {
      console.error('Error en getCompradores:', error);
      throw error;
    }
  },

  /**
   * Enviar notificación a usuario
   * @param {string} userId - ID del usuario
   * @param {string} titulo - Título del mensaje
   * @param {string} mensaje - Contenido del mensaje
   * @returns {Promise<Object>}
   */
  enviarNotificacion: async (userId, titulo, mensaje) => {
    try {
      const res = await apiFetch(
        `${PROFILES_URL}/api/v1/notifications/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, titulo, mensaje }),
        }
      );
      if (!res.ok) throw new Error('Error al enviar notificación');
      return await res.json();
    } catch (error) {
      console.error('Error en enviarNotificacion:', error);
      throw error;
    }
  },

  /**
   * Generar reporte de usuarios
   * @param {Object} filters - Filtros para el reporte
   * @returns {Promise<Object>}
   */
  generarReporteUsuarios: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const res = await apiFetch(
        `${AUTH_URL}/api/v1/users/report/?${queryString}`
      );
      if (!res.ok) throw new Error('Error al generar reporte');
      return await res.json();
    } catch (error) {
      console.error('Error en generarReporteUsuarios:', error);
      throw error;
    }
  },
};
