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

  // Cargar preferencias + categorias al montar
  // IMPORTANTE: solo cargar si el usuario esta logueado (hay token).
  // Si no, los 401 del backend disparan clearSession → redirect → loop infinito.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return; // No logueado → no cargar nada

    const cargar = async () => {
      try {
        setLoading(true);
        const [prefsData, cats] = await Promise.all([
          notificationService.getPreferencias().catch(() => null),
          // Cargar categorias para tener TODOS los slug->uuid
          import('../services/eventosService').then(m => m.eventosService.getCategorias()).catch(() => []),
        ]);

        // Construir mapping completo slug -> uuid de todas las categorias
        const allIds = {};
        for (const c of (Array.isArray(cats) ? cats : [])) {
          const slug = (c.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          if (slug) allIds[slug] = c.id;
        }

        const merged = {
          email_enabled: prefsData?.email_enabled ?? true,
          in_app_enabled: prefsData?.in_app_enabled ?? true,
          categorias: prefsData?.categorias || {},
          // Merge: UUIDs del backend (si vinieron) + TODOS los UUIDs disponibles
          categoriasIds: { ...allIds, ...(prefsData?.categoriasIds || {}) },
        };
        setPreferencias(merged);
      } catch (err) {
        console.error('Error cargando preferencias:', err);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  // Cargar notificaciones (solo si hay sesion)
  const cargarNotificaciones = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) {
      setNotificaciones([]);
      return;
    }
    try {
      const data = await notificationService.getNotificaciones();
      const lista = Array.isArray(data) ? data : (data?.results || []);
      setNotificaciones(lista);
    } catch (err) {
      console.warn('Error cargando notificaciones (fallback a vacio):', err?.message);
      setNotificaciones([]);
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
  // Acepta slug (key local) y opcionalmente category_id (UUID real del backend)
  const toggleCategoria = useCallback(async (categoriaSlug, categoriaId) => {
    const nuevasPreferencias = {
      ...preferencias,
      categorias: {
        ...(preferencias.categorias || {}),
        [categoriaSlug]: !preferencias.categorias?.[categoriaSlug],
      },
    };
    // Tambien guardamos un map slug -> uuid para que el backend reciba IDs
    if (categoriaId) {
      nuevasPreferencias.categoriasIds = {
        ...(preferencias.categoriasIds || {}),
        [categoriaSlug]: categoriaId,
      };
    }
    // Persistir en localStorage para que ExplorarEventos/Recommendations
    // puedan leerlo sin esperar al backend
    try {
      localStorage.setItem('user_categorias_pref', JSON.stringify(nuevasPreferencias.categorias));
    } catch {}
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

  // Obtener conteo de no leídas (con guard por si llega no-array)
  const conteoNoLeidas = Array.isArray(notificaciones)
    ? notificaciones.filter(n => !n.leida).length
    : 0;

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
