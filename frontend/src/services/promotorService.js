import api from './api';
import { authService } from './authService';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

const PromotorService = {
  // ── Dashboard General del Promotor ──────────────────────────────────
  getDashboardSummary: async () => {
    const summaryRes = await api.get(`${EVENTS_URL}/api/v1/promotor/dashboard/summary/`);
    const summary = summaryRes.data || summaryRes;

    let comparativaData = [];
    try {
      const compRes = await api.get(`${EVENTS_URL}/api/v1/promotor/dashboard/comparativa/`);
      comparativaData = compRes.data?.comparativa || [];
    } catch (e) {
      console.warn("No se pudo cargar la comparativa de eventos", e);
    }

    return {
      total_net_income: summary.ingresos_netos,
      total_income: summary.ingresos_brutos,
      total_commissions: summary.comisiones_totales, // added
      total_sales: summary.total_tickets_vendidos,
      total_events: summary.total_eventos,
      avg_occupancy: summary.tasa_ocupacion_pct,
      events_comparison: comparativaData.map(e => ({
         name: e.evento_nombre,
         revenue: e.ingresos_brutos,
         net_revenue: e.ingresos_netos,
         ventas: e.tickets_vendidos
      })),
      monthly_income: summary.ingresos_mensuales ? summary.ingresos_mensuales.map(m => ({
        month: m.month,
        income: m.ingresos_brutos,
        net_income: m.ingresos_netos
      })) : []
    };
  },

  // ── TIC-30: Reporte Financiero por Evento ───────────────────────────
  getEventReport: async (eventId) => {
    const res = await api.get(`${EVENTS_URL}/api/v1/promotor/events/${eventId}/financial/`);
    const data = res.data || res;

    const evento = data.evento || {};
    const resumen = data.resumen_financiero || {};
    const desglose = data.desglose_por_tipo || [];
    const topCompradores = data.top_compradores || [];
    const ingresosMensuales = data.ingresos_mensuales || [];

    return {
      evento: {
        id: evento.id,
        nombre: evento.nombre,
        fecha: evento.fecha,
        hora: evento.hora,
        location: evento.location,
        estado: evento.estado,
        adminStatus: evento.admin_status,
        capacidad: evento.capacidad,
      },
      resumen: {
        totalTicketsVendidos: resumen.total_tickets_vendidos || 0,
        totalCompradores: resumen.total_compradores || 0,
        ocupacionPct: resumen.ocupacion_pct || 0,
        ingresosBrutos: parseFloat(resumen.ingresos_brutos || 0),
        comisiones: parseFloat(resumen.comisiones || 0),
        ingresosNetos: parseFloat(resumen.ingresos_netos || 0),
      },
      desglose: desglose.map(d => ({
        id: d.ticket_type_id,
        nombre: d.nombre,
        zona: d.zone_type,
        esVip: d.is_vip,
        precio: parseFloat(d.precio_unitario || 0),
        maxCapacity: d.max_capacity,
        vendidos: d.tickets_vendidos || 0,
        ocupacionPct: d.ocupacion_pct || 0,
        ingresosBrutos: parseFloat(d.ingresos_brutos || 0),
        comisiones: parseFloat(d.comisiones || 0),
        ingresosNetos: parseFloat(d.ingresos_netos || 0),
      })),
      topCompradores: topCompradores.map(c => ({
        userId: c.user_id,
        gastoTotal: parseFloat(c.gasto_total || 0),
        ticketsComprados: c.tickets_comprados || 0,
      })),
      ingresosMensuales: ingresosMensuales.map(m => ({
        mes: m.month,
        ingresosBrutos: parseFloat(m.ingresos_brutos || 0),
        ingresosNetos: parseFloat(m.ingresos_netos || 0),
      })),
    };
  },

  // ── TIC-33: Lista de Compradores por Evento ─────────────────────────
  getEventBuyers: async (eventId, { page = 1, pageSize = 10, search = '', status = 'all', ordering = '-created_at' } = {}) => {
    const params = new URLSearchParams({ page, page_size: pageSize, status, ordering });
    
    if (search) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const matchedUsers = await authService.searchUsers(search, token);
          if (matchedUsers.length > 0) {
            params.append('user_ids', matchedUsers.map(u => u.id).join(','));
          } else {
            // If zero matches by name, pass a dummy user_id to ensure it returns empty instead of all users
            params.append('user_ids', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          params.append('search', search);
        }
      } catch (e) {
        console.error("Error searching users:", e);
        params.append('search', search);
      }
    }
    
    const res = await api.get(`${EVENTS_URL}/api/v1/promotor/events/${eventId}/buyers/?${params}`);
    const data = res.data || res;
    return {
      evento: data.evento || {},
      resumen: {
        total_compradores: data.resumen?.total_compradores || 0,
        total_tickets: data.resumen?.total_tickets || 0,
        total_ingreso: data.resumen?.total_ingresos || 0, // Fix: the backend sends total_ingresos
      },
      paginacion: data.paginacion || { count: 0, total_pages: 1, page: 1, page_size: pageSize },
      resultados: (data.results || []).map(c => ({
        id: c.purchase_id || c.id,
        userId: c.user_id,
        tipoEntrada: c.ticket_type_nombre || c.ticket_type || 'Desconocido', // Fix: backend sends ticket_type_nombre
        zona: c.zone_type || 'general',
        cantidad: c.quantity || 0,
        precioTotal: parseFloat(c.total_price || 0),
        estado: c.status,
        fecha: c.created_at,
        codigoBackup: c.backup_code || '',
        descuentoAplicado: parseFloat(c.discount_amount || 0),
        codigoPromoId: c.promo_code || null,
      })),
    };
  },

  // ── TIC-36: Exportar Reportes ───────────────────────────────────────
  exportEventBuyersCSV: async (eventId, format = 'csv') => {
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    let user = {};
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined') {
        user = JSON.parse(userStr);
      }
    } catch(e) {}
    const isAdmin = user.role === 'SuperAdmin' || user.is_superadmin;
    const baseUrl = isAdmin
      ? `${EVENTS_URL}/api/v1/admin/events/${eventId}/buyers/export/?export_format=${format}`
      : `${EVENTS_URL}/api/v1/promotor/events/${eventId}/buyers/export/?export_format=${format}`;

    const res = await api.get(baseUrl, { responseType: 'blob' });
    return _downloadBlob(res, `compradores_${eventId}.${ext}`);
  },

  exportEventFinancialCSV: async (eventId, format = 'csv') => {
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    let user = {};
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined') {
        user = JSON.parse(userStr);
      }
    } catch(e) {}
    const isAdmin = user.role === 'SuperAdmin' || user.is_superadmin;
    const baseUrl = isAdmin
      ? `${EVENTS_URL}/api/v1/admin/events/${eventId}/financial/export/?export_format=${format}`
      : `${EVENTS_URL}/api/v1/promotor/events/${eventId}/financial/export/?export_format=${format}`;

    const res = await api.get(baseUrl, { responseType: 'blob' });
    return _downloadBlob(res, `financiero_${eventId}.${ext}`);
  },

  exportPromotorDashboard: async (format = 'csv') => {
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const res = await api.get(`${EVENTS_URL}/api/v1/promotor/dashboard/export/?export_format=${format}`, { responseType: 'blob' });
    return _downloadBlob(res, `reporte_promotor.${ext}`);
  },

  exportSuperAdminDashboard: async (format = 'csv') => {
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const res = await api.get(`${EVENTS_URL}/api/v1/admin/dashboard/export/?export_format=${format}`, { responseType: 'blob' });
    return _downloadBlob(res, `reporte_superadmin.${ext}`);
  },

  // ---------------------------------------------------------
  // TIC-514: Gestión de Códigos de Descuento
  // ---------------------------------------------------------
  async getPromoCodes(eventId) {
    const res = await api.get(`${EVENTS_URL}/api/v1/promotor/promo-codes/?event=${eventId}`);
    return res.data;
  },

  async createPromoCode(promoData) {
    const res = await api.post(`${EVENTS_URL}/api/v1/promotor/promo-codes/`, promoData);
    return res.data;
  },

  async updatePromoCode(id, updates) {
    const res = await api.patch(`${EVENTS_URL}/api/v1/promotor/promo-codes/${id}/`, updates);
    return res.data;
  },

  async deletePromoCode(id) {
    await api.delete(`${EVENTS_URL}/api/v1/promotor/promo-codes/${id}/`);
    return true;
  }
};

// Helper para descargar blobs
function _downloadBlob(response, filename) {
  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'text/csv',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default PromotorService;
