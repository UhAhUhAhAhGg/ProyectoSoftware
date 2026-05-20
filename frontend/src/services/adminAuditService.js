import { apiFetch } from './apiHelper';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const adminAuditService = {
  /**
   * TIC-421: Obtiene registros de auditoría con paginación y filtros.
   * Backend: GET /api/v1/admin/audit-log/?event_id&admin_id&action&date_from&date_to&page&page_size
   */
  getAuditLogs: async (params = {}) => {
    try {
      let url = `${EVENTS_URL}/api/v1/admin/audit-log/`;
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', params.page);
      if (params.page_size) qs.append('page_size', params.page_size);
      // Mapear nombres del frontend a los que espera el backend
      if (params.start_date || params.date_from) qs.append('date_from', params.start_date || params.date_from);
      if (params.end_date || params.date_to) qs.append('date_to', params.end_date || params.date_to);
      if (params.action_type || params.action) qs.append('action', params.action_type || params.action);
      if (params.admin_id) qs.append('admin_id', params.admin_id);
      if (params.event_id) qs.append('event_id', params.event_id);

      if (qs.toString()) url += `?${qs.toString()}`;

      const res = await apiFetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.detail || 'Error al cargar auditoría');
      }

      const data = await res.json();
      // Backend devuelve { status, total, page, page_size, total_pages, results }
      return data;
    } catch (error) {
      console.error('adminAuditService.getAuditLogs error', error);
      throw error;
    }
  },

  /**
   * Lista de tipos de acción soportados por EventAuditLog.
   * Los valores coinciden con ACTION_CHOICES del modelo.
   */
  getActionTypes: async () => {
    return [
      { value: 'edit', label: 'Edición de campos' },
      { value: 'deactivate', label: 'Dar de baja' },
      { value: 'reactivate', label: 'Reactivar evento' },
    ];
  },

  /**
   * Lista de administradores (para filtro).
   * Backend: GET /api/v1/users/administradores/
   */
  getAdminsList: async () => {
    try {
      const res = await apiFetch(`${AUTH_URL}/api/v1/users/administradores/`);
      if (!res.ok) return [];
      const data = await res.json();
      const list = (data.results || data || []).map((u) => ({
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        email: u.email,
      }));
      return list;
    } catch (err) {
      console.warn('adminAuditService.getAdminsList: fallback a vacio', err?.message);
      return [];
    }
  },

  /**
   * TIC-423: Exporta el historial de auditoria a CSV.
   * Backend: GET /api/v1/admin/audit-log/export/
   */
  exportToCsv: async () => {
    const url = `${EVENTS_URL}/api/v1/admin/audit-log/export/`;
    const res = await apiFetch(url);
    if (!res.ok) {
      throw new Error('No se pudo exportar el CSV');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
