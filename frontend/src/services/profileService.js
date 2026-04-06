import api from './api';

export async function hasPurchasedForEvent(eventId) {
  try {
    const resp = await api.get('/profile/purchases', { params: { eventId } });
    return Array.isArray(resp.data) && resp.data.length > 0;
  } catch (err) {
    console.error('hasPurchasedForEvent error', err);
    return false;
  }
}