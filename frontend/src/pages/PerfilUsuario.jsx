import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PerfilUsuario.css';

function PerfilUsuario() {
  const { user, isAuthenticated, updateUserProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const initialData = useMemo(() => {
    return {
      nombre: user?.nombre || '',
      telefono: user?.telefono || '',
      avatar: user?.avatar || '',
      email: user?.email || '',
    };
  }, [user]);

  const [formData, setFormData] = useState(initialData);
  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleCancelar = () => {
    setFormData(initialData);
    setEditando(false);
    setError('');
    setMensaje('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (formData.telefono && !/^\+?[0-9\s()-]{7,20}$/.test(formData.telefono)) {
      setError('El teléfono tiene un formato inválido.');
      return;
    }

    updateUserProfile({
      nombre: formData.nombre.trim(),
      telefono: formData.telefono.trim(),
      avatar: formData.avatar || null,
    });

    setMensaje('Tus datos se actualizaron correctamente.');
    setEditando(false);
  };

  const handleDeleteAccount = async () => {
    setError('');
    setMensaje('');

    if (!deletePassword.trim()) {
      setError('Debes ingresar tu contraseña para eliminar la cuenta.');
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
      navigate('/cuenta-eliminada');
    } catch (err) {
      setError(err.message || 'No fue posible eliminar tu cuenta.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <section className="perfil-page">
      <div className="perfil-card">
        <header className="perfil-header">
          <h2>Mi Perfil</h2>
          <p>Revisa y actualiza tu información personal.</p>
        </header>

        <div className="perfil-top">
          <div className="avatar-box">
            {formData.avatar ? (
              <img src={formData.avatar} alt={formData.nombre || 'Avatar'} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">{(formData.nombre || user.email || 'U').charAt(0).toUpperCase()}</div>
            )}

            {editando && (
              <button type="button" className="btn-avatar" onClick={() => fileInputRef.current?.click()}>
                Cambiar foto
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              hidden
            />
          </div>

          <div className="perfil-resumen">
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Rol:</strong> {user.role || 'Usuario'}</p>
          </div>
        </div>

        <form className="perfil-form" onSubmit={handleSubmit}>
          <label htmlFor="nombre">Nombre completo</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={formData.nombre}
            onChange={handleChange}
            disabled={!editando}
            placeholder="Tu nombre"
          />

          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            value={formData.telefono}
            onChange={handleChange}
            disabled={!editando}
            placeholder="+591 70000000"
          />

          {error && <p className="estado error">{error}</p>}
          {mensaje && <p className="estado success">{mensaje}</p>}

          <div className="acciones">
            {!editando ? (
              <button type="button" className="btn-principal" onClick={() => setEditando(true)}>
                Editar datos
              </button>
            ) : (
              <>
                <button type="button" className="btn-secundario" onClick={handleCancelar}>
                  Cancelar
                </button>
                <button type="submit" className="btn-principal">
                  Guardar cambios
                </button>
              </>
            )}

            <Link to="/dashboard" className="btn-link">
              Volver al dashboard
            </Link>
          </div>
        </form>

        <section className="danger-zone">
          <h3>Zona de privacidad</h3>
          <p>
            Si eliminas tu cuenta, no podrás volver a acceder con este usuario y tus
            datos se retirarán de la plataforma.
          </p>
          <button type="button" className="btn-eliminar" onClick={() => setShowDeleteModal(true)}>
            Eliminar mi cuenta
          </button>
        </section>

        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
            <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
              <h3>Confirmar eliminación de cuenta</h3>
              <p>
                Esta acción es permanente. Ingresa tu contraseña para confirmar.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Contraseña actual"
                disabled={deleteLoading}
              />
              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                  }}
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PerfilUsuario;
