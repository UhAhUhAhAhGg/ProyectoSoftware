/**
 * apiFetch: wrapper sobre fetch que auto-refresca el JWT cuando recibe 401.
 * Si el refresh también falla, limpia la sesión y redirige al login.
 */

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

const clearSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  window.location.href = '/login';
};

export const refreshAccessToken = async () => {
  const refresh = localStorage.getItem('refresh');
  if (!refresh) {
    clearSession();
    throw new Error('Sin sesión activa.');
  }

  const res = await fetch(`${AUTH_URL}/api/v1/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearSession();
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
  }

  const data = await res.json();
  localStorage.setItem('token', data.access);
  return data.access;
};

/**
 * apiFetch(url, options)
 * Igual que fetch(), pero:
 * - Inyecta el Bearer token automáticamente
 * - Si recibe 401, refresca el token y reintenta UNA vez
 */
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');

  const makeRequest = (accessToken) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    };

    // Si el body es FormData (subida de archivos), eliminamos el Content-Type
    // para que el navegador genere uno automáticamente con el 'boundary'
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  let res = await makeRequest(token);

  // Si el token expiró, intentar refrescar y reintentar
  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      res = await makeRequest(newToken);
    } catch {
      // clearSession ya fue llamado dentro de refreshAccessToken
      throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }
  }

  return res;
};
