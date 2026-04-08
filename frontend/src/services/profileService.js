<<<<<<< HEAD
import api from './api';

export async function hasPurchasedForEvent(eventId) {
  try {
    const resp = await api.get('/profile/purchases', { params: { eventId } });
    return Array.isArray(resp.data) && resp.data.length > 0;
  } catch (err) {
    console.error('hasPurchasedForEvent error', err);
    return false;
  }
=======
function getUserIdFromStorage() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

export function hasPurchasedForEvent(eventId) {
  try {
    const userId = getUserIdFromStorage();
    if (!userId) return false;
    const key = `purchased_events_${userId}`;
    const purchased = JSON.parse(localStorage.getItem(key) || '[]');
    return purchased.includes(String(eventId));
  } catch {
    return false;
  }
}

export function markEventAsPurchased(eventId) {
  try {
    const userId = getUserIdFromStorage();
    if (!userId) return;
    const key = `purchased_events_${userId}`;
    const purchased = JSON.parse(localStorage.getItem(key) || '[]');
    if (!purchased.includes(String(eventId))) {
      purchased.push(String(eventId));
      localStorage.setItem(key, JSON.stringify(purchased));
    }
  } catch { /* ignore */ }
}

export function getUserTickets() {
  try {
    const userId = getUserIdFromStorage();
    if (!userId) return [];
    const key = `purchased_events_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
}