import { apiFetch } from './apiHelper';

const EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';

export async function hasPurchasedForEvent(eventId) {
  try {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/purchases/history/?status=active`);
    if (!res.ok) return false;
    const data = await res.json();
    const purchases = data.results ?? data;
    return Array.isArray(purchases) && purchases.some(p => p.event_id === eventId);
  } catch (err) {
    console.error('hasPurchasedForEvent error', err);
    return false;
  }
}

export async function getUserTickets(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.page) params.set('page', options.page);
    if (options.page_size) params.set('page_size', options.page_size);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortType) params.set('sortType', options.sortType);
    if (options.minPrice) params.set('minPrice', options.minPrice);
    if (options.maxPrice) params.set('maxPrice', options.maxPrice);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch(`${EVENTS_URL}/api/v1/purchases/history/${query}`);
    if (!res.ok) return { results: [], count: 0, page: 1, total_pages: 1 };
    return await res.json();
  } catch (err) {
    console.error('getUserTickets error', err);
    return { results: [], count: 0, page: 1, total_pages: 1 };
  }
}

export async function getPurchaseDetail(purchaseId) {
  try {
    const res = await apiFetch(`${EVENTS_URL}/api/v1/purchases/${purchaseId}/`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('getPurchaseDetail error', err);
    return null;
  }
}

export async function downloadPurchasePDF(purchaseId, eventName) {
  const res = await apiFetch(`${EVENTS_URL}/api/v1/purchases/${purchaseId}/download-pdf/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo descargar el PDF.');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `entrada_${(eventName || 'evento').replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}