import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

// Credenciales de los tres roles
const USER_CREDENTIALS = {
  comprador: {
    email: 'comprador@ticketgo.com',
    password: 'Comprador123!',
    user: {
      id: 1,
      nombre: 'Carlos López',
      email: 'comprador@ticketgo.com',
      telefono: '+54 11 1234-5678',
      tipoUsuario: 'comprador',
      rol: 'comprador',
      fechaRegistro: '2024-01-15',
      avatar: null,
      ubicacion: 'Buenos Aires, Argentina',
      intereses: ['Música', 'Deportes', 'Teatro']
    }
  },
  promotor: {
    email: 'promotor@ticketgo.com',
    password: 'Promotor123!',
    user: {
      id: 2,
      nombre: 'María González',
      email: 'promotor@ticketgo.com',
      telefono: '+54 11 8765-4321',
      tipoUsuario: 'promotor',
      rol: 'promotor',
      fechaRegistro: '2024-02-10',
      avatar: null,
      ubicacion: 'Córdoba, Argentina',
      empresa: 'Eventos & Co.',
      intereses: ['Eventos Corporativos', 'Festivales']
    }
  },
  administrador: {
    email: 'admin@ticketgo.com',
    password: 'Admin2024!',
    user: {
      id: 999,
      nombre: 'Administrador',
      email: 'admin@ticketgo.com',
      telefono: '+54 11 0000-0000',
      tipoUsuario: 'administrador',
      rol: 'administrador',
      fechaRegistro: '2024-01-01',
      avatar: null,
      permisos: ['todos']
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Verificar si hay sesión guardada al cargar
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const loginWithRole = (role, email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const credentials = USER_CREDENTIALS[role];
        if (credentials && email === credentials.email && password === credentials.password) {
          const userData = credentials.user;
          const authToken = `token_${role}_${Date.now()}`;
          login(userData, authToken);
          resolve({ success: true, user: userData });
        } else {
          reject(new Error(`Credenciales de ${role} inválidas`));
        }
      }, 1000);
    });
  };

  // Actualizar perfil de usuario
  const updateUserProfile = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  // Eliminar cuenta del usuario
  const deleteAccount = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Eliminar datos del usuario
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // En un caso real, aquí se llamaría a una API para eliminar la cuenta
        // Por ahora simulamos la eliminación exitosa
        resolve({ success: true });
      }, 1500);
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Verificar tipo de usuario
  const isComprador = user?.tipoUsuario === 'comprador';
  const isPromotor = user?.tipoUsuario === 'promotor';
  const isAdmin = user?.tipoUsuario === 'administrador';

  const value = {
    user,
    token,
    loading,
    login,
    loginWithRole,
    updateUserProfile,
    deleteAccount,
    logout,
    isAuthenticated: !!user,
    isComprador,
    isPromotor,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};