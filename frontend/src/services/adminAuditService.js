import { apiFetch } from './apiHelper';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const adminAuditService = {
  /**
   * Obtiene registros de auditoría con paginación y filtros
   * params: { page, page_size, start_date, end_date, action_type, admin_id, search, ordering }
   */
  getAuditLogs: async (params = {}) => {
    try {
      let url = `${EVENTS_URL}/api/v1/admin/audit/`;
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', params.page);
      if (params.page_size) qs.append('page_size', params.page_size);
      if (params.start_date) qs.append('start_date', params.start_date);
      if (params.end_date) qs.append('end_date', params.end_date);
      if (params.action_type) qs.append('action_type', params.action_type);
      if (params.admin_id) qs.append('admin_id', params.admin_id);
      if (params.search) qs.append('search', params.search);
      if (params.ordering) qs.append('ordering', params.ordering);

      if (qs.toString()) url += `?${qs.toString()}`;

      const res = await apiFetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al cargar auditoría');
      }

      const data = await res.json();
      return data;
    } catch (error) {
      console.error('adminAuditService.getAuditLogs error', error);
      throw error;
    }
  },

  /**
   * Intenta recuperar tipos de acción desde backend, si no existe devuelve lista por defecto
   */
  getActionTypes: async () => {
    try {
      const res = await apiFetch(`${EVENTS_URL}/api/v1/admin/audit/action_types/`);
      if (res.ok) {
        const data = await res.json();
        return data || [];
      }
    } catch (err) {
      // ignore
    }

    return ['created', 'updated', 'deleted', 'suspended', 'reactivated', 'ticket_change'];
  },

  /**
   * Lista de administradores (para filtro). Intenta endpoint de auth, si falla devuelve vacío
   */
  getAdminsList: async () => {
    try {
      const res = await apiFetch(`${AUTH_URL}/api/v1/users/administrators/`);
      if (!res.ok) return [];
      const data = await res.json();
      // normalizar a [{id, name, email}]
      const list = (data.results || data || []).map(u => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.username, email: u.email }));
      return list;
    } catch (err) {
      console.error('adminAuditService.getAdminsList error', err);
      return [];
    }
  }
};
