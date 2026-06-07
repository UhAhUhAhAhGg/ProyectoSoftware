import api from './api';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

export const settingsService = {
  getCommissionSettings: async () => {
    try {
      const response = await api.get(`${EVENTS_URL}/api/v1/admin/platform/commission/current/`);
      return response.data;
    } catch (error) {
      console.warn('No se pudieron obtener las configuraciones de comisiones:', error?.message);
      return null;
    }
  },

  updateCommissionSettings: async (payload) => {
    try {
      const response = await api.post(`${EVENTS_URL}/api/v1/admin/platform/commission/`, payload);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar comisiones:', error?.response?.data || error?.message);
      throw error;
    }
  },
};
