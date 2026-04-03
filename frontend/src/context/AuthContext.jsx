'use client';

import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/authService';
import { apiFetch } from '../services/apiHelper';

const AuthContext = createContext();

// Valor por defecto: 15 minutos (en ms)
const DEFAULT_INACTIVITY_TIMEOUT = 15 * 60 * 1000;

const isBrowser = typeof window !== 'undefined';

const getInactivityTimeout = () => {
  if (!isBrowser) return DEFAULT_INACTIVITY_TIMEOUT;
  const stored = localStorage.getItem('inactivity_timeout_minutes');
  if (stored) return parseInt(stored, 10) * 60 * 1000;
  return DEFAULT_INACTIVITY_TIMEOUT;
};

const getStoredSession = () => {
  if (!isBrowser) {
    return {
      user: null,
      token: null,
      inactivityMinutes: 15,
    };
  }

  const storedUser = localStorage.getItem('user');
  const storedToken = localStorage.getItem('token');
  const storedTimeout = localStorage.getItem('inactivity_timeout_minutes');

  return {
    user: storedUser && storedToken ? JSON.parse(storedUser) : null,
    token: storedToken,
    inactivityMinutes: storedTimeout ? parseInt(storedTimeout, 10) : 15,
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const storedSession = getStoredSession();
  const [user, setUser] = useState(storedSession.user);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(storedSession.token);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [inactivityMinutes, setInactivityMinutes] = useState(storedSession.inactivityMinutes);
  const inactivityTimer = useRef(null);
  const timeoutRef = useRef(getInactivityTimeout());

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, []);

  // --- Cierre automático por inactividad ---
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (localStorage.getItem('token')) {
        setSessionExpired(true);
        logout();
      }
    }, timeoutRef.current);
  }, [logout]);

  // Permitir al admin cambiar el timeout desde Configuración Global
  const updateInactivityTimeout = useCallback((minutes) => {
    const mins = Math.max(1, Math.min(60, minutes)); // entre 1 y 60 min
    localStorage.setItem('inactivity_timeout_minutes', String(mins));
    timeoutRef.current = mins * 60 * 1000;
    setInactivityMinutes(mins);
    // Reiniciar el timer con el nuevo valor
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (localStorage.getItem('token')) {
        setSessionExpired(true);
        logout();
      }
    }, timeoutRef.current);
  }, [logout]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handleActivity));
    resetInactivityTimer(); // iniciar el timer al montar

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  const login = (userData, authToken, refreshToken) => {
    setSessionExpired(false);
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    if (refreshToken) {
      localStorage.setItem('refresh', refreshToken);
    }
  };

  const updateUserProfile = async (updatedData) => {
    if (!token) throw new Error('No hay sesión activa.');

    const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';
    const response = await apiFetch(`${AUTH_URL}/api/v1/users/me/`, {
      method: 'PATCH',
      body: JSON.stringify({
        first_name: updatedData.first_name || '',
        last_name: updatedData.last_name || '',
        phone: updatedData.phone || '',
        profile_photo_url: updatedData.profile_photo_url || null,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al actualizar el perfil.');
    }

    const updatedUser = {
      ...user,
      nombre: `${updatedData.first_name} ${updatedData.last_name}`.trim(),
      first_name: updatedData.first_name,
      last_name: updatedData.last_name,
      phone: updatedData.phone,
      telefono: updatedData.phone,
      profile_photo_url: updatedData.profile_photo_url,
      avatar: updatedData.profile_photo_url,
    };
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

  const clearSessionExpired = () => setSessionExpired(false);

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
    sessionExpired,
    clearSessionExpired,
    inactivityMinutes,
    updateInactivityTimeout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};