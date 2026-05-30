import api from './api';

const PromotorService = {
  getDashboardSummary: async () => {
    const res = await api.get('/promotor/dashboard/summary');
    return res.data;
  },
};

export default PromotorService;
