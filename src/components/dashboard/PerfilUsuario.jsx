import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './PerfilUsuario.css';

function PerfilUsuario() {
  const { user, updateUserProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [editando, setEditando] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  
  // Estados para el modal de eliminación de cuenta
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [mostrarConfirmacionEliminacion, setMostrarConfirmacionEliminacion] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    ubicacion: user?.ubicacion || '',
    empresa: user?.empresa || '',
    intereses: user?.intereses?.join(', ') || '',
    avatar: user?.avatar || null
  });

  const [previewAvatar, setPreviewAvatar] = useState(user?.avatar || null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result);
        setFormData({
          ...formData,
          avatar: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const validarFormulario = () => {
    const errores = {};

    if (!formData.nombre.trim()) {
      errores.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 3) {
      errores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      errores.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errores.email = 'Email inválido';
    }

    if (formData.telefono && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(formData.telefono)) {
      errores.telefono = 'Teléfono inválido';
    }

    return errores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errores = validarFormulario();
    if (Object.keys(errores).length > 0) {
      mostrarNotificacion('Por favor, corrige los errores en el formulario', 'error');
      return;
    }

    const updatedData = {
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono,
      ubicacion: formData.ubicacion,
      avatar: formData.avatar
    };

    if (user?.tipoUsuario === 'promotor') {
      updatedData.empresa = formData.empresa;
    }

    if (formData.intereses) {
      updatedData.intereses = formData.intereses.split(',').map(i => i.trim());
    }

    try {
      updateUserProfile(updatedData);
      setEditando(false);
      mostrarNotificacion('Perfil actualizado exitosamente', 'success');
    } catch (error) {
      mostrarNotificacion('Error al actualizar el perfil', 'error');
    }
  };

  const handleCancelar = () => {
    setFormData({
      nombre: user?.nombre || '',
      email: user?.email || '',
      telefono: user?.telefono || '',
      ubicacion: user?.ubicacion || '',
      empresa: user?.empresa || '',
      intereses: user?.intereses?.join(', ') || '',
      avatar: user?.avatar || null
    });
    setPreviewAvatar(user?.avatar || null);
    setEditando(false);
  };

  const mostrarNotificacion = (mensaje, tipo) => {
    setToastMessage(mensaje);
    setToastType(tipo);
    setMostrarToast(true);
    setTimeout(() => setMostrarToast(false), 3000);
  };

  // Manejador para eliminar cuenta
  const handleAbrirModalEliminar = () => {
    setMostrarModalEliminar(true);
    setConfirmacionTexto('');
  };

  const handleConfirmarEliminacion = async () => {
    if (confirmacionTexto !== 'ELIMINAR MI CUENTA') {
      mostrarNotificacion('Por favor, escribe "ELIMINAR MI CUENTA" para confirmar', 'error');
      return;
    }

    setEliminando(true);
    
    try {
      await deleteAccount();
      setMostrarModalEliminar(false);
      setMostrarConfirmacionEliminacion(true);
      
      // Redirigir al home después de 3 segundos
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      mostrarNotificacion('Error al eliminar la cuenta', 'error');
      setEliminando(false);
    }
  };

  const handleCerrarConfirmacion = () => {
    setMostrarConfirmacionEliminacion(false);
    navigate('/');
  };

  const getInitials = () => {
    return user?.nombre?.charAt(0) || 'U';
  };

  const getFechaRegistro = () => {
    if (user?.fechaRegistro) {
      return new Date(user.fechaRegistro).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return 'No disponible';
  };

  return (
    <div className="perfil-usuario">
      {/* Toast de notificación */}
      {mostrarToast && (
        <div className={`toast-notification ${toastType}`}>
          <span className="toast-icon">
            {toastType === 'success' ? '✅' : '⚠️'}
          </span>
          <p>{toastMessage}</p>
        </div>
      )}

      {/* Modal de confirmación de eliminación de cuenta */}
      {mostrarModalEliminar && (
        <div className="modal-overlay" onClick={() => !eliminando && setMostrarModalEliminar(false)}>
          <div className="modal-eliminar-cuenta" onClick={e => e.stopPropagation()}>
            <div className="modal-icono-danger">⚠️</div>
            <h2>¿Eliminar tu cuenta?</h2>
            <p>
              Esta acción es <strong>permanente e irreversible</strong>. 
              Al eliminar tu cuenta:
            </p>
            <ul>
              <li>Perderás acceso a todos tus datos</li>
              <li>Tus eventos y compras serán eliminados</li>
              <li>No podrás recuperar tu información</li>
              <li>Tu historial será borrado permanentemente</li>
            </ul>
            
            <div className="confirmacion-input">
              <label>
                Para confirmar, escribe <strong>"ELIMINAR MI CUENTA"</strong> en el campo inferior:
              </label>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => setConfirmacionTexto(e.target.value)}
                placeholder="ELIMINAR MI CUENTA"
                disabled={eliminando}
                className={confirmacionTexto === 'ELIMINAR MI CUENTA' ? 'valid' : ''}
              />
            </div>

            <div className="modal-acciones">
              <button 
                className="btn-cancelar-eliminar"
                onClick={() => setMostrarModalEliminar(false)}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button 
                className={`btn-confirmar-eliminar ${confirmacionTexto === 'ELIMINAR MI CUENTA' ? 'active' : ''}`}
                onClick={handleConfirmarEliminacion}
                disabled={eliminando || confirmacionTexto !== 'ELIMINAR MI CUENTA'}
              >
                {eliminando ? (
                  <>
                    <span className="spinner-small"></span>
                    Eliminando cuenta...
                  </>
                ) : (
                  'Sí, eliminar mi cuenta'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pantalla de confirmación de eliminación exitosa */}
      {mostrarConfirmacionEliminacion && (
        <div className="modal-overlay">
          <div className="modal-confirmacion-eliminacion">
            <div className="modal-icono-success">✅</div>
            <h2>Cuenta eliminada exitosamente</h2>
            <p>
              Lamentamos verte partir. Tus datos han sido eliminados de nuestra plataforma 
              de acuerdo con tu solicitud.
            </p>
            <p className="mensaje-adicional">
              Serás redirigido a la página de inicio en unos segundos...
            </p>
            <button className="btn-volver-inicio" onClick={handleCerrarConfirmacion}>
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      <div className="perfil-header">
        <h2>Mi Perfil</h2>
        <p>Gestiona tu información personal</p>
      </div>

      <div className="perfil-content">
        {/* Avatar Section (sin cambios) */}
        <div className="avatar-section">
          <div className="avatar-container">
            {previewAvatar ? (
              <img src={previewAvatar} alt={user?.nombre} className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {getInitials()}
              </div>
            )}
            {editando && (
              <button 
                className="avatar-edit-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📷
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
          <div className="avatar-info">
            <h3>{user?.nombre}</h3>
            <p className="user-role">
              {user?.tipoUsuario === 'comprador' ? '🛍️ Comprador' : 
               user?.tipoUsuario === 'promotor' ? '📢 Promotor' : '⚙️ Administrador'}
            </p>
            <p className="user-since">Miembro desde {getFechaRegistro()}</p>
          </div>
        </div>

        {/* Formulario (sin cambios) */}
        <form onSubmit={handleSubmit} className="perfil-form">
          <div className="form-grid">
            <div className="form-group">
              <label>
                <span className="label-icon">👤</span>
                Nombre completo
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                disabled={!editando}
                className={!editando ? 'readonly' : ''}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">📧</span>
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!editando}
                className={!editando ? 'readonly' : ''}
                placeholder="correo@ejemplo.com"
              />
              <small className="field-hint">Este será tu correo para recibir notificaciones</small>
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">📞</span>
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                disabled={!editando}
                className={!editando ? 'readonly' : ''}
                placeholder="+54 11 1234-5678"
              />
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">📍</span>
                Ubicación
              </label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                disabled={!editando}
                className={!editando ? 'readonly' : ''}
                placeholder="Ciudad, País"
              />
            </div>

            {user?.tipoUsuario === 'promotor' && (
              <div className="form-group">
                <label>
                  <span className="label-icon">🏢</span>
                  Empresa / Organización
                </label>
                <input
                  type="text"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  disabled={!editando}
                  className={!editando ? 'readonly' : ''}
                  placeholder="Nombre de tu empresa"
                />
              </div>
            )}

            {user?.tipoUsuario === 'comprador' && (
              <div className="form-group">
                <label>
                  <span className="label-icon">❤️</span>
                  Intereses
                </label>
                <input
                  type="text"
                  name="intereses"
                  value={formData.intereses}
                  onChange={handleChange}
                  disabled={!editando}
                  className={!editando ? 'readonly' : ''}
                  placeholder="Música, Deportes, Teatro (separados por coma)"
                />
                <small className="field-hint">Te ayudará a recibir recomendaciones personalizadas</small>
              </div>
            )}
          </div>

          <div className="user-stats">
            <h3>Estadísticas</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">0</span>
                <span className="stat-label">Eventos asistidos</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">0</span>
                <span className="stat-label">Boletos comprados</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">0</span>
                <span className="stat-label">Favoritos</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            {!editando ? (
              <button 
                type="button" 
                className="btn-editar"
                onClick={() => setEditando(true)}
              >
                ✏️ Editar Perfil
              </button>
            ) : (
              <>
                <button 
                  type="button" 
                  className="btn-cancelar"
                  onClick={handleCancelar}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-guardar"
                >
                  💾 Guardar Cambios
                </button>
              </>
            )}
          </div>
        </form>

        {/* Sección de seguridad (sin cambios) */}
        <div className="security-section">
          <h3>Seguridad</h3>
          <div className="security-item">
            <div className="security-info">
              <span className="security-icon">🔒</span>
              <div>
                <p>Contraseña</p>
                <small>Última actualización: hace 30 días</small>
              </div>
            </div>
            <button className="btn-cambiar-password">
              Cambiar contraseña
            </button>
          </div>
          <div className="security-item">
            <div className="security-info">
              <span className="security-icon">📱</span>
              <div>
                <p>Autenticación en dos pasos</p>
                <small>Añade una capa extra de seguridad</small>
              </div>
            </div>
            <button className="btn-activar-2fa">
              Activar
            </button>
          </div>
        </div>

        {/* Sección de notificaciones (sin cambios) */}
        <div className="notifications-section">
          <h3>Preferencias de notificaciones</h3>
          <div className="notification-option">
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
            <div className="notification-info">
              <p>Notificaciones por email</p>
              <small>Recibe actualizaciones de tus eventos favoritos</small>
            </div>
          </div>
          <div className="notification-option">
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
            <div className="notification-info">
              <p>Recordatorios de eventos</p>
              <small>Te avisaremos antes de que comience tu evento</small>
            </div>
          </div>
          <div className="notification-option">
            <label className="toggle-switch">
              <input type="checkbox" />
              <span className="toggle-slider"></span>
            </label>
            <div className="notification-info">
              <p>Ofertas y promociones</p>
              <small>Recibe descuentos exclusivos</small>
            </div>
          </div>
        </div>

        {/* Sección de eliminación de cuenta */}
        <div className="delete-account-section">
          <h3>Zona de peligro</h3>
          <div className="delete-account-card">
            <div className="delete-icon">⚠️</div>
            <div className="delete-info">
              <p className="delete-title">Eliminar cuenta permanentemente</p>
              <p className="delete-description">
                Una vez que elimines tu cuenta, no podrás recuperar tus datos. 
                Esta acción es irreversible.
              </p>
            </div>
            <button 
              className="btn-delete-account"
              onClick={handleAbrirModalEliminar}
            >
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerfilUsuario;