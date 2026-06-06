import api from './api';

const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

// Retorna KPIs globales: ingresos comisiones, promociones, total
export const getKPIsGlobales = async (filtros) => {
  try {
    const { data } = await api.get(`${API_URL}/api/v1/admin/finanzas/kpis`, {
      params: filtros, // { desde, hasta, vista }
    });
    return data;
  } catch (error) {
    console.error('Error fetching KPIs globales:', error);
    throw error;
  }
};

// Retorna datos para PieChart: fuentes de ingreso
export const getFuentesIngreso = async (filtros) => {
  try {
    const { data } = await api.get(`${API_URL}/api/v1/admin/finanzas/fuentes`, {
      params: filtros,
    });
    return data;
  } catch (error) {
    console.error('Error fetching fuentes de ingreso:', error);
    throw error;
  }
};

// Retorna top 5 promotores por ingresos
export const getTopPromotores = async (filtros) => {
  try {
    const { data } = await api.get(`${API_URL}/api/v1/admin/finanzas/top-promotores`, {
      params: filtros,
    });
    return data;
  } catch (error) {
    console.error('Error fetching top promotores:', error);
    throw error;
  }
};

// Retorna evolución mensual de ingresos para LineChart
export const getEvolucionIngresos = async (filtros) => {
  try {
    const { data } = await api.get(`${API_URL}/api/v1/admin/finanzas/evolucion`, {
      params: filtros,
    });
    return data;
  } catch (error) {
    console.error('Error fetching evolución de ingresos:', error);
    throw error;
  }
};
