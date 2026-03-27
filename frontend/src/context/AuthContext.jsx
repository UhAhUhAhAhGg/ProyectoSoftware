'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Restaurar sesión guardada al cargar la app
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken, refreshToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    if (refreshToken) {
      localStorage.setItem('refresh', refreshToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
  };

  const updateUserProfile = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  const deleteAccount = async (password) => {
    if (!token) {
      throw new Error('No hay sesión activa para eliminar la cuenta.');
    }

    await authService.deleteAccount(token, password);

    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
  };

  // Helpers de rol — usan el campo 'role' que devuelve el backend
  const isComprador = user?.role === 'Comprador';
  const isPromotor = user?.role === 'Promotor';
  const isAdministrador = user?.role === 'Administrador';

  // Ruta de dashboard según el rol del usuario
  const getDashboardPath = () => {
    if (isAdministrador) return '/admin/dashboard';
    if (isPromotor) return '/dashboard/promotor';
    return '/dashboard/comprador';
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUserProfile,
    deleteAccount,
    isAuthenticated: !!user,
    isComprador,
    isPromotor,
    isAdministrador,
    getDashboardPath,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};