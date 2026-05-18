import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [preferencias, setPreferencias] = useState({
    email_enabled: true,
    in_app_enabled: true,
    categorias: {
      futbol: true,
      cine: true,
      teatro: true,
      musica: true,
      deportes: true,
      conciertos: true,
      otros: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar preferencias al montar el componente
  useEffect(() => {
    const cargarPreferencias = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getPreferencias();
        if (data) {
          setPreferencias(data);
        }
      } catch (err) {
        console.error('Error cargando preferencias:', err);
        // Continuar con valores por defecto
      } finally {
        setLoading(false);
      }
    };

    cargarPreferencias();
  }, []);

  // Cargar notificaciones
  const cargarNotificaciones = useCallback(async () => {
    try {
      const data = await notificationService.getNotificaciones();
      setNotificaciones(data || []);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setError(err.message);
    }
  }, []);

  // Cargar notificaciones al montar
  useEffect(() => {
    cargarNotificaciones();
    // Poll cada 30 segundos para nuevas notificaciones
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  // Marcar notificación como leída
  const marcarComoLeida = useCallback(async (notificationId) => {
    try {
      await notificationService.marcarComoLeida(notificationId);
      setNotificaciones(prev =>
        prev.map(n => n.id === notificationId ? { ...n, leida: true } : n)
      );
    } catch (err) {
      console.error('Error marcando notificación como leída:', err);
      setError(err.message);
    }
  }, []);

  // Marcar todas como leídas
  const marcarTodasComoLeidas = useCallback(async () => {
    try {
      await notificationService.marcarTodasComoLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (err) {
      console.error('Error marcando todas como leídas:', err);
      setError(err.message);
    }
  }, []);

  // Actualizar preferencias
  const actualizarPreferencias = useCallback(async (nuevasPreferencias) => {
    try {
      setLoading(true);
      const data = await notificationService.actualizarPreferencias(nuevasPreferencias);
      setPreferencias(data || nuevasPreferencias);
      return { success: true };
    } catch (err) {
      console.error('Error actualizando preferencias:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Alternar notificaciones de una categoría
  const toggleCategoria = useCallback(async (categoria) => {
    const nuevasPreferencias = {
      ...preferencias,
      categorias: {
        ...preferencias.categorias,
        [categoria]: !preferencias.categorias[categoria],
      },
    };
    await actualizarPreferencias(nuevasPreferencias);
  }, [preferencias, actualizarPreferencias]);

  // Alternar email notifications
  const toggleEmailNotifications = useCallback(async () => {
    const nuevasPreferencias = {
      ...preferencias,
      email_enabled: !preferencias.email_enabled,
    };
    await actualizarPreferencias(nuevasPreferencias);
  }, [preferencias, actualizarPreferencias]);

  // Alternar in-app notifications
  const toggleInAppNotifications = useCallback(async () => {
    const nuevasPreferencias = {
      ...preferencias,
      in_app_enabled: !preferencias.in_app_enabled,
    };
    await actualizarPreferencias(nuevasPreferencias);
  }, [preferencias, actualizarPreferencias]);

  // Obtener conteo de no leídas
  const conteoNoLeidas = notificaciones.filter(n => !n.leida).length;

  const value = {
    notificaciones,
    preferencias,
    loading,
    error,
    cargarNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
    actualizarPreferencias,
    toggleCategoria,
    toggleEmailNotifications,
    toggleInAppNotifications,
    conteoNoLeidas,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
