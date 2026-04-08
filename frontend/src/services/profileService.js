import api from './api';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

export async function hasPurchasedForEvent(eventId) {
  try {
    const resp = await api.get('/profile/purchases', { params: { eventId } });
    return Array.isArray(resp.data) && resp.data.length > 0;
  } catch (err) {
    console.error('hasPurchasedForEvent error', err);
    return false;
  }
}

export async function getUserTickets() {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${EVENTS_URL}/api/v1/purchases/history/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? data;
  } catch (err) {
    console.error('getUserTickets error', err);
    return [];
  }
}