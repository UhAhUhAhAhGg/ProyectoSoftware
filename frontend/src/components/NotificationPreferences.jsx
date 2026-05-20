import { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { eventosService } from '../services/eventosService';
import './NotificationPreferences.css';

// Iconos sugeridos por nombre de categoria (case-insensitive)
const CATEGORY_ICONS = {
  musica: '🎵',
  cine: '🎬',
  teatro: '🎭',
  arte: '🎨',
  tecnologia: '💻',
  tecnología: '💻',
  gastronomia: '🍽️',
  gastronomía: '🍽️',
  familia: '👨‍👩‍👧‍👦',
  educacion: '📚',
  educación: '📚',
  negocios: '💼',
  festivales: '🎊',
  conferencias: '🎤',
  deportes: '🏆',
  conciertos: '🎤',
};

function NotificationPreferences() {
  const {
    preferencias,
    loading,
    error,
    toggleCategoria,
    toggleEmailNotifications,
    toggleInAppNotifications,
  } = useNotifications();

  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Cargar categorias REALES del backend
  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      setLoadingCats(true);
      try {
        const data = await eventosService.getCategorias();
        if (cancelled) return;
        const lista = (Array.isArray(data) ? data : []).map((c) => {
          const key = (c.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          return {
            id: c.id, // UUID real
            slug: key, // para localStorage / preferencias actuales (compat)
            name: c.name,
            icon: CATEGORY_ICONS[key] || '🏷️',
          };
        });
        setCategorias(lista);
      } catch (err) {
        console.warn('No se pudieron cargar categorias:', err?.message);
        setCategorias([]);
      } finally {
        setLoadingCats(false);
      }
    };
    cargar();
    return () => {
      cancelled = true;
    };
  }, []);

  const showMessage = (texto, tipo = 'success') => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setTimeout(() => setMensaje(''), 3000);
  };

  const handleToggleCategoria = async (categoria) => {
    setIsSaving(true);
    try {
      // Pasamos el id UUID y el slug — el context guarda por slug, pero
      // tambien sincroniza con el backend usando los IDs reales si estan disponibles
      await toggleCategoria(categoria.slug, categoria.id);
      showMessage('Preferencias actualizadas correctamente');
    } catch (err) {
      showMessage('Error al actualizar preferencias', 'error');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEmail = async () => {
    setIsSaving(true);
    try {
      await toggleEmailNotifications();
      showMessage('Preferencias de email actualizadas');
    } catch (err) {
      showMessage('Error al actualizar preferencias', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleInApp = async () => {
    setIsSaving(true);
    try {
      await toggleInAppNotifications();
      showMessage('Preferencias de notificaciones en la app actualizadas');
    } catch (err) {
      showMessage('Error al actualizar preferencias', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && Object.keys(preferencias).length === 0) {
    return (
      <div className="notification-preferences-loading">
        <p>Cargando preferencias...</p>
      </div>
    );
  }

  return (
    <section className="notification-preferences">
      <div className="preferences-header">
        <h3>⚙️ Preferencias de Notificaciones</h3>
        <p>Personaliza cómo y cuándo recibir notificaciones sobre nuevos eventos</p>
      </div>

      {error && (
        <div className="preferences-alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {mensaje && (
        <div className={`preferences-alert alert-${tipoMensaje}`}>
          <span>{tipoMensaje === 'success' ? '✅' : '❌'} {mensaje}</span>
        </div>
      )}

      {/* SECCIÓN: Canales de Notificación */}
      <div className="preferences-section">
        <h4>Canales de Notificación</h4>

        <div className="preference-item">
          <div className="preference-info">
            <label htmlFor="email-toggle">📧 Notificaciones por Email</label>
            <p>Recibe un email cuando haya un match con tu perfil</p>
          </div>
          <div className="toggle-switch">
            <input
              id="email-toggle"
              type="checkbox"
              checked={!!preferencias.email_enabled}
              onChange={handleToggleEmail}
              disabled={isSaving}
            />
            <span className="toggle-slider"></span>
          </div>
        </div>

        <div className="preference-item">
          <div className="preference-info">
            <label htmlFor="inapp-toggle">🔔 Notificaciones en la App</label>
            <p>Ve las notificaciones directamente en la campanita de la app</p>
          </div>
          <div className="toggle-switch">
            <input
              id="inapp-toggle"
              type="checkbox"
              checked={!!preferencias.in_app_enabled}
              onChange={handleToggleInApp}
              disabled={isSaving}
            />
            <span className="toggle-slider"></span>
          </div>
        </div>
      </div>

      {/* SECCIÓN: Categorías reales del backend */}
      <div className="preferences-section">
        <h4>Categorías favoritas</h4>
        <p className="section-description">
          Marca las categorías que te interesan. Recibirás notificaciones cuando se publiquen eventos
          de estas categorías y aparecerán priorizados en tu sección de eventos.
        </p>

        {loadingCats ? (
          <p style={{ color: '#9aa3b2' }}>Cargando categorías...</p>
        ) : categorias.length === 0 ? (
          <p style={{ color: '#9aa3b2' }}>No hay categorías disponibles.</p>
        ) : (
          <div className="categorias-grid">
            {categorias.map((cat) => {
              const isActive = !!preferencias.categorias?.[cat.slug];
              return (
                <div
                  key={cat.id}
                  className={`categoria-card ${isActive ? 'activa' : 'inactiva'}`}
                >
                  <input
                    type="checkbox"
                    id={`cat-${cat.slug}`}
                    checked={isActive}
                    onChange={() => handleToggleCategoria(cat)}
                    disabled={isSaving}
                  />
                  <label htmlFor={`cat-${cat.slug}`}>
                    {cat.icon} {cat.name}
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN: Información */}
      <div className="preferences-info-box">
        <h4>ℹ️ Cómo Funcionan los Matches</h4>
        <ul>
          <li>
            <strong>Match Automático:</strong> El sistema detecta cuando un nuevo evento coincide con tus categorías favoritas
          </li>
          <li>
            <strong>Notificación Inmediata:</strong> Recibirás una notificación en los canales que tengas habilitados
          </li>
          <li>
            <strong>Prioridad en eventos:</strong> Los eventos de tus categorías favoritas aparecen primero en la sección "Eventos"
          </li>
          <li>
            <strong>Sin Spam:</strong> Solo una notificación por evento y perfil
          </li>
        </ul>
      </div>

      {isSaving && <div className="saving-overlay">Guardando cambios...</div>}
    </section>
  );
}

export default NotificationPreferences;
