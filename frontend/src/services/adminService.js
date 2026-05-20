import api from './api';

const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const adminService = {
  /**
   * Obtiene lista de administradores con permisos y estado.
   * TIC-396: GET /users/superadmin/admins/
   */
  getAdministradores: async () => {
    try {
      const response = await api.get(`${API_URL}/api/v1/users/superadmin/admins/`);
      // El endpoint devuelve { status, total, results: [...] }
      return response.data?.results || [];
    } catch (error) {
      console.warn('Error al obtener administradores:', error?.message);
      return [];
    }
  },

  /**
   * Crea un nuevo Administrador.
   * TIC-397: POST /users/superadmin/admins/
   */
  crearAdministrador: async ({ email, password, first_name, last_name, reason }) => {
    try {
      const response = await api.post(`${API_URL}/api/v1/users/superadmin/admins/`, {
        email,
        password,
        first_name,
        last_name,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error al crear administrador:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || 'Error al crear administrador');
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
   * Actualiza permisos de un administrador.
   * TIC-398: PATCH /users/{id}/superadmin/admins/permissions/
   */
  updateAdminPermissions: async (adminId, permissions) => {
    try {
      const response = await api.patch(
        `${API_URL}/api/v1/users/${adminId}/superadmin/admins/permissions/`,
        { permissions }
      );
      return response.data;
    } catch (error) {
      console.error('Error al actualizar permisos:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || 'Error al actualizar permisos');
    }
  },

  /**
   * Suspende una cuenta de administrador.
   * TIC-399: PATCH /users/{id}/superadmin/admins/suspend/
   */
  deactivateAdmin: async (adminId, reason = '') => {
    try {
      const response = await api.patch(
        `${API_URL}/api/v1/users/${adminId}/superadmin/admins/suspend/`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error('Error al suspender administrador:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || 'Error al suspender administrador');
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
