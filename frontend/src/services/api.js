import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

// Instancia base de Axios con configuración compartida
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición: adjunta el token JWT automáticamente
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: captura errores 403 y muestra aviso al usuario
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Disparar un evento global que los componentes pueden escuchar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden', {
            detail: {
              message:
                'Permisos insuficientes para esta acción. Esta ruta es exclusiva para otro rol.',
            },
          })
        );
      }
    }

    if (error.response?.status === 401) {
      // Token expirado: limpiar sesión y redirigir al login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refresh');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
