const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const authService = {
  // Login real contra el backend
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/v1/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // El backend devuelve { detail: "..." } o { message: "..." } en errores
      const msg = data.detail || data.message || 'Correo o contraseña incorrectos.';
      throw new Error(msg);
    }

    // El backend devuelve: { access, refresh, email, role }
    return {
      success: true,
      data: {
        user: {
          email: data.email,
          role: data.role,
        },
        token: data.access,
        refresh: data.refresh,
      },
    };
  },

  // Logout — solo limpia localStorage (sin endpoint en el backend aún)
  logout: async () => {
    return { success: true };
  },

  // Obtener perfil del usuario autenticado
  getMe: async (token) => {
    const response = await fetch(`${API_URL}/api/v1/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('No autorizado');
    return response.json();
  },
};