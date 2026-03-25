// Servicio simulado - Reemplazar con llamadas reales a API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  // Login simulado
  login: async (email, password) => {
    await delay(1500); // Simular latencia de red
    
    // Simular validación
    if (email === 'demo@ejemplo.com' && password === 'Demo123!') {
      return {
        success: true,
        data: {
          user: {
            id: 1,
            nombre: 'Usuario Demo',
            email: email,
            tipoUsuario: 'comprador',
            avatar: null
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJkZW1vQGVqZW1wbG8uY29tIiwidGlwb1VzdWFyaW8iOiJjb21wcmFkb3IifQ.example'
        }
      };
    } else if (email === 'promotor@ejemplo.com' && password === 'Promo123!') {
      return {
        success: true,
        data: {
          user: {
            id: 2,
            nombre: 'Promotor Demo',
            email: email,
            tipoUsuario: 'promotor',
            avatar: null
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidGlwb1VzdWFyaW8iOiJwcm9tb3RvciJ9.example'
        }
      };
    } else {
      throw new Error('Credenciales inválidas');
    }
  },

  // Logout
  logout: async () => {
    await delay(500);
    return { success: true };
  },

  // Verificar token (para rutas protegidas)
  verifyToken: async (token) => {
    await delay(500);
    // Aquí iría la verificación real del token
    return { success: true };
  }
};