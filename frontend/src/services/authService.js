const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export const authService = {
  // Login general para Compradores y Promotores
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/v1/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.detail || data.message || 'Correo o contraseña incorrectos.';
      throw new Error(msg);
    }

    // El backend devuelve: { id, access, refresh, email, role }
    // Obtener datos del perfil para mostrar el nombre en el dashboard
    let profileData = {};
    try {
      const profileRes = await fetch(`${API_URL}/api/v1/users/me/`, {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      if (profileRes.ok) profileData = await profileRes.json();
    } catch {}

    const nombre = [profileData.first_name, profileData.last_name].filter(Boolean).join(' ');

    return {
      success: true,
      data: {
        user: {
          id: data.id,
          email: data.email,
          role: data.role,
          nombre: nombre || '',
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          profile_photo_url: profileData.profile_photo_url || null,
          avatar: profileData.profile_photo_url || null,
        },
        token: data.access,
        refresh: data.refresh,
      },
    };
  },

  // Login exclusivo para Administradores — rechaza otros roles con 401
  adminLogin: async (email, password) => {
    const response = await fetch(`${API_URL}/api/v1/users/admin_login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.detail || data.message || 'Credenciales inválidas o permisos insuficientes.';
      throw new Error(msg);
    }

    // El backend devuelve: { status, data: { id, email, role, ... }, access, refresh }
    const userData = data.data || {};

    return {
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          role: userData.role,
        },
        token: data.access,
        refresh: data.refresh,
      },
    };
  },

  // Registro de nuevo usuario (Comprador / Promotor)
  register: async (email, password, roleName) => {
    const response = await fetch(`${API_URL}/api/v1/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: roleName }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.message || data.detail || 'Error al registrarse.';
      throw new Error(msg);
    }

    return { success: true, data };
  },

  // Registro de Administrador mediante token de invitación
  applyAdmin: async ({ email, password, employee_code, department, token }) => {
    const response = await fetch(`${API_URL}/api/v1/users/apply_admin/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, employee_code, department, token }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.detail || data.message || 'Error al enviar la solicitud.';
      throw new Error(msg);
    }

    return { success: true, data };
  },

  // Solicitar enlace de recuperación de contraseña
  requestPasswordReset: async (email) => {
    const response = await fetch(`${API_URL}/api/v1/users/password_reset_request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.message || data.detail || 'No se pudo solicitar la recuperación de contraseña.';
      throw new Error(msg);
    }

    return { success: true, data };
  },

  // Confirmar cambio de contraseña con token
  confirmPasswordReset: async (token, newPassword) => {
    const response = await fetch(`${API_URL}/api/v1/users/password_reset_confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.message || data.detail || 'No se pudo restablecer la contraseña.';
      throw new Error(msg);
    }

    return { success: true, data };
  },

  // Logout — solo limpia localStorage (sin endpoint en el backend aún)
  logout: async () => {
    return { success: true };
  },

  // Eliminar cuenta del usuario autenticado
  deleteAccount: async (token, password) => {
    const response = await fetch(`${API_URL}/api/v1/users/me/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.message || data.detail || 'No se pudo eliminar la cuenta.';
      throw new Error(msg);
    }

    return { success: true, data };
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