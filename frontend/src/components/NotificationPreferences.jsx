import { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPreferences.css';

function NotificationPreferences() {
  const {
    preferencias,
    loading,
    error,
    actualizarPreferencias,
    toggleCategoria,
    toggleEmailNotifications,
    toggleInAppNotifications,
  } = useNotifications();

  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState(''); // 'success' o 'error'
  const [isSaving, setIsSaving] = useState(false);

  const categoriasDisponibles = [
    { id: 'futbol', label: '⚽ Fútbol' },
    { id: 'cine', label: '🎬 Cine' },
    { id: 'teatro', label: '🎭 Teatro' },
    { id: 'musica', label: '🎵 Música' },
    { id: 'deportes', label: '🏆 Deportes' },
    { id: 'conciertos', label: '🎤 Conciertos' },
    { id: 'otros', label: '📢 Otros' },
  ];

  const handleToggleCategoria = async (categoria) => {
    setIsSaving(true);
    setMensaje('');
    try {
      await toggleCategoria(categoria);
      setTipoMensaje('success');
      setMensaje('Preferencias actualizadas correctamente');
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setTipoMensaje('error');
      setMensaje('Error al actualizar preferencias');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEmail = async () => {
    setIsSaving(true);
    setMensaje('');
    try {
      await toggleEmailNotifications();
      setTipoMensaje('success');
      setMensaje('Preferencias de email actualizadas');
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setTipoMensaje('error');
      setMensaje('Error al actualizar preferencias');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleInApp = async () => {
    setIsSaving(true);
    setMensaje('');
    try {
      await toggleInAppNotifications();
      setTipoMensaje('success');
      setMensaje('Preferencias de notificaciones en la app actualizadas');
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setTipoMensaje('error');
      setMensaje('Error al actualizar preferencias');
      console.error(err);
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
              checked={preferencias.email_enabled}
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
              checked={preferencias.in_app_enabled}
              onChange={handleToggleInApp}
              disabled={isSaving}
            />
            <span className="toggle-slider"></span>
          </div>
        </div>
      </div>

      {/* SECCIÓN: Categorías de Eventos */}
      <div className="preferences-section">
        <h4>Recibir Notificaciones de Categorías</h4>
        <p className="section-description">
          Selecciona qué tipos de eventos deseas que se notifiquen cuando haya un match con tu perfil
        </p>

        <div className="categorias-grid">
          {categoriasDisponibles.map((categoria) => (
            <div
              key={categoria.id}
              className={`categoria-card ${
                preferencias.categorias?.[categoria.id] ? 'activa' : 'inactiva'
              }`}
            >
              <input
                type="checkbox"
                id={`cat-${categoria.id}`}
                checked={preferencias.categorias?.[categoria.id] || false}
                onChange={() => handleToggleCategoria(categoria.id)}
                disabled={isSaving}
              />
              <label htmlFor={`cat-${categoria.id}`}>
                {categoria.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN: Información */}
      <div className="preferences-info-box">
        <h4>ℹ️ Cómo Funcionan los Matches</h4>
        <ul>
          <li>
            <strong>Match Automático:</strong> Sistema detecta automáticamente cuando un nuevo evento coincide con tus preferencias (categoría + ubicación)
          </li>
          <li>
            <strong>Notificación Inmediata:</strong> Recibirás una notificación en los canales que hayas habilitado
          </li>
          <li>
            <strong>Sin Spam:</strong> Solo una notificación por evento y perfil para evitar saturación
          </li>
          <li>
            <strong>Personalizable:</strong> Puedes cambiar tus preferencias en cualquier momento
          </li>
        </ul>
      </div>

      {isSaving && <div className="saving-overlay">Guardando cambios...</div>}
    </section>
  );
}

export default NotificationPreferences;
