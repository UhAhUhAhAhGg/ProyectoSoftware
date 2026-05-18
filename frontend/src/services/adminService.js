import api from './api';

const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const adminService = {
  /**
   * Obtiene lista de administradores activos
   */
  getAdministradores: async () => {
    try {
      const response = await api.get(`${API_URL}/api/v1/users/administrators/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener administradores:', error);
      throw error;
    }
  },

  /**
   * Obtiene lista de solicitudes de administrador pendientes
   */
  getPendingAdminRequests: async () => {
    try {
      const response = await api.get(`${API_URL}/api/v1/users/pending_admins/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener solicitudes pendientes:', error);
      throw error;
    }
  },

  /**
   * Obtiene detalles de un administrador específico
   */
  getAdministradorById: async (adminId) => {
    try {
      const response = await api.get(`${API_URL}/api/v1/users/${adminId}/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener administrador:', error);
      throw error;
    }
  },

  /**
   * Actualiza permisos de un administrador
   */
  updateAdminPermissions: async (adminId, permissions) => {
    try {
      const response = await api.patch(`${API_URL}/api/v1/users/${adminId}/permissions/`, {
        permissions: permissions
      });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
      throw error;
    }
  },

  /**
   * Desactiva/suspende una cuenta de administrador
   */
  deactivateAdmin: async (adminId, reason = '') => {
    try {
      const response = await api.patch(`${API_URL}/api/v1/users/${adminId}/`, {
        is_active: false,
        deactivation_reason: reason
      });
      return response.data;
    } catch (error) {
      console.error('Error al desactivar administrador:', error);
      throw error;
    }
  },

  /**
   * Reactiva una cuenta de administrador
   */
  reactivateAdmin: async (adminId) => {
    try {
      const response = await api.patch(`${API_URL}/api/v1/users/${adminId}/`, {
        is_active: true,
        deactivation_reason: null
      });
      return response.data;
    } catch (error) {
      console.error('Error al reactivar administrador:', error);
      throw error;
    }
  },

  /**
   * Aprueba una solicitud de administrador
   */
  approveAdminRequest: async (userId, permissions = []) => {
    try {
      const response = await api.post(`${API_URL}/api/v1/users/${userId}/approve_admin/`, {
        permissions: permissions
      });
      return response.data;
    } catch (error) {
      console.error('Error al aprobar solicitud:', error);
      throw error;
    }
  },

  /**
   * Rechaza una solicitud de administrador
   */
  rejectAdminRequest: async (userId, reason = '') => {
    try {
      const response = await api.post(`${API_URL}/api/v1/users/${userId}/reject_admin/`, {
        reason: reason
      });
      return response.data;
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      throw error;
    }
  },

  /**
   * Invita a un usuario a ser administrador
   */
  inviteAdmin: async (email, permissions = []) => {
    try {
      const response = await api.post(`${API_URL}/api/v1/users/invite_admin/`, {
        email: email,
        permissions: permissions
      });
      return response.data;
    } catch (error) {
      console.error('Error al enviar invitación:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de administradores
   */
  getAdminStats: async () => {
    try {
      const response = await api.get(`${API_URL}/api/v1/users/admin_stats/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },

  /**
   * Obtiene audit log de acciones de administrador
   */
  getAdminAuditLog: async (adminId, limit = 50) => {
    try {
      const response = await api.get(`${API_URL}/api/v1/users/${adminId}/audit_log/`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener audit log:', error);
      throw error;
    }
  }
};
