import { apiFetch } from './apiHelper';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const adminAuditService = {
  /**
   * TIC-421: Obtiene registros de auditoría con paginación y filtros.
   * Backend: GET /api/v1/admin/audit-log/?event_id&admin_id&action&date_from&date_to&page&page_size
   */
  getAuditLogs: async (params = {}) => {
    // Combina dos fuentes:
    //   1. EventAuditLog (service-events) - acciones sobre eventos
    //   2. AdminAuditLog (service-auth) - acciones sobre usuarios (suspend/ban/etc)
    const qsCommon = new URLSearchParams();
    if (params.page) qsCommon.append('page', params.page);
    if (params.page_size) qsCommon.append('page_size', params.page_size);
    if (params.start_date || params.date_from) qsCommon.append('date_from', params.start_date || params.date_from);
    if (params.end_date || params.date_to) qsCommon.append('date_to', params.end_date || params.date_to);
    if (params.action_type || params.action) qsCommon.append('action', params.action_type || params.action);
    if (params.admin_id) qsCommon.append('admin_id', params.admin_id);

    const eventsUrl = `${EVENTS_URL}/api/v1/admin/audit-log/` + (qsCommon.toString() ? `?${qsCommon.toString()}` : '');
    const authUrl = `${AUTH_URL}/api/v1/users/admin-audit-log/` + (qsCommon.toString() ? `?${qsCommon.toString()}` : '');

    const [evtsRes, usrsRes] = await Promise.all([
      apiFetch(eventsUrl).catch(() => null),
      apiFetch(authUrl).catch(() => null),
    ]);

    const evtsData = evtsRes && evtsRes.ok ? await evtsRes.json().catch(() => ({})) : {};
    const usrsData = usrsRes && usrsRes.ok ? await usrsRes.json().catch(() => ({})) : {};

    // Normalizar al mismo shape para que el componente los renderice igual
    const evts = (evtsData.results || []).map((e) => ({
      id: e.id,
      kind: 'event',
      kind_label: '📅 Evento',
      created_at: e.created_at,
      admin_email: e.admin_email,
      action: e.action,
      action_label: ({ edit: 'Edición', deactivate: 'Baja', reactivate: 'Reactivación' }[e.action] || e.action),
      target: e.event_name,
      reason: e.reason,
      changed_fields: e.changed_fields,
      old_status: e.old_status,
      new_status: e.new_status,
    }));
    const usrs = (usrsData.results || []).map((u) => ({
      id: u.id,
      kind: 'user',
      kind_label: '👤 Usuario',
      created_at: u.created_at,
      admin_email: u.admin_email,
      action: u.action,
      action_label: u.action_label || u.action,
      target: u.target_user_email,
      reason: u.reason,
      previous_status: u.previous_status,
      new_status: u.new_status,
    }));

    // Merge y ordenar por fecha descendente
    const merged = [...evts, ...usrs].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return {
      status: 'success',
      total: (evtsData.total || 0) + (usrsData.total || 0),
      results: merged,
    };
  },

  /**
   * Lista de tipos de acción soportados por ambas auditorías
   * (EventAuditLog en service-events y AdminAuditLog en service-auth).
   */
  getActionTypes: async () => {
    return [
      // Eventos
      { value: 'edit', label: '📅 Edición de evento' },
      { value: 'deactivate', label: '📅 Baja de evento' },
      { value: 'reactivate', label: '📅 Reactivación de evento' },
      // Usuarios (AdminAuditLog)
      { value: 'suspend', label: '👤 Suspender usuario' },
      { value: 'ban', label: '👤 Baja de usuario' },
      { value: 'reactivate_user', label: '👤 Reactivar usuario' },
      { value: 'create_admin', label: '👤 Crear administrador' },
      { value: 'create_user', label: '👤 Crear usuario' },
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
