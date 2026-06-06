import api from './api';

const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const settingsService = {
  getCommissionSettings: async () => {
    try {
      const response = await api.get(`${API_URL}/api/v1/settings/commissions/`);
      return response.data;
    } catch (error) {
      console.warn('No se pudieron obtener las configuraciones de comisiones:', error?.message);
      return null;
    }
  },

  updateCommissionSettings: async (payload) => {
    try {
      const response = await api.post(`${API_URL}/api/v1/settings/commissions/`, payload);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar comisiones:', error?.response?.data || error?.message);
      throw error;
    }
  },
};
