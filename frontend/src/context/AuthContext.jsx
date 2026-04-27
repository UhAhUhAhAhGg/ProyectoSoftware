'use client';

import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const storedSession = getStoredSession();
  const [user, setUser] = useState(storedSession.user);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(storedSession.token);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [inactivityMinutes, setInactivityMinutes] = useState(storedSession.inactivityMinutes);
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const timeoutRef = useRef(getInactivityTimeout());

  const logout = useCallback(() => {
  setUser(null);
  setToken(null);
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  if (warningTimer.current) clearTimeout(warningTimer.current);
  setShowWarningModal(false);

  router.push('/login'); 
}, [router]);

  // --- Cierre automático por inactividad ---
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    
    // Si ya estamos mostrando el modal, no reiniciar al mover el mouse
    if (showWarningModal) return;

    const totalTime = timeoutRef.current;
    const warningTime = 2 * 60 * 1000; // 2 minutos antes
    const waitTime = totalTime > warningTime ? totalTime - warningTime : totalTime;

    inactivityTimer.current = setTimeout(() => {
      if (localStorage.getItem('token')) {
        setShowWarningModal(true);
        // Empezar cuenta regresiva final de 2 minutos
        warningTimer.current = setTimeout(() => {
           setSessionExpired(true);
           logout();
        }, warningTime);
      }
    }, waitTime);
  }, [logout, showWarningModal]);

  const continueSession = () => {
    setShowWarningModal(false);
    resetInactivityTimer();
  };

  // Permitir al admin cambiar el timeout desde Configuración Global
  const updateInactivityTimeout = useCallback((minutes) => {
    const mins = Math.max(1, Math.min(60, minutes)); // entre 1 y 60 min
    localStorage.setItem('inactivity_timeout_minutes', String(mins));
    timeoutRef.current = mins * 60 * 1000;
    setInactivityMinutes(mins);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

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
      {/* Modal de Advertencia de Sesión */}
      {showWarningModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#1E1E1E', padding: '2rem', borderRadius: '10px',
            textAlign: 'center', maxWidth: '400px', color: '#fff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#FFB800' }}>⚠️ Inactividad Detectada</h3>
            <p style={{ marginBottom: '2rem' }}>Tu sesión expirará en 2 minutos. ¿Deseas continuar navegando?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={logout}
                style={{
                  padding: '10px 20px', borderRadius: '5px', border: 'none',
                  backgroundColor: '#444', color: '#fff', cursor: 'pointer'
                }}>
                Cerrar Sesión
              </button>
              <button 
                onClick={continueSession}
                style={{
                  padding: '10px 20px', borderRadius: '5px', border: 'none',
                  backgroundColor: '#007BFF', color: '#fff', cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                Continuar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};