import api from './api';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

const PromotorService = {
  getDashboardSummary: async () => {
    // Obtener KPIs generales
    const summaryRes = await api.get(`${EVENTS_URL}/api/v1/promotor/dashboard/summary/`);
    const summary = summaryRes.data || summaryRes;

    // Obtener datos para la gráfica comparativa por evento
    let comparativaData = [];
    try {
      const compRes = await api.get(`${EVENTS_URL}/api/v1/promotor/dashboard/comparativa/`);
      comparativaData = compRes.data?.comparativa || [];
    } catch (e) {
      console.warn("No se pudo cargar la comparativa de eventos", e);
    }

    // Mapear la respuesta del backend a lo que espera DashboardPromotor.jsx
    return {
      total_net_income: summary.ingresos_netos,
      total_income: summary.ingresos_brutos,
      total_sales: summary.total_tickets_vendidos,
      total_events: summary.total_eventos,
      avg_occupancy: summary.tasa_ocupacion_pct,
      
      // Mapear arreglo de eventos para la gráfica
      events_comparison: comparativaData.map(e => ({
         name: e.evento_nombre,
         revenue: e.ingresos_brutos,
         net_revenue: e.ingresos_netos
      })),
      
      // Agrupar ingresos por mes directamente desde el backend
      monthly_income: summary.ingresos_mensuales ? summary.ingresos_mensuales.map(m => ({
        month: m.month,
        income: m.ingresos_brutos,
        net_income: m.ingresos_netos
      })) : []
    };
  },

  getEventReport: async (eventId) => {
    const res = await api.get(`${process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002'}/api/v1/promotor/events/${eventId}/financial/`);
    return res.data;
  },
};

export default PromotorService;
