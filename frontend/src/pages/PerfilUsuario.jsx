import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/apiHelper';
<<<<<<< HEAD
=======
import api from '../services/api';
import { getUserTickets } from '../services/profileService';
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
import './PerfilUsuario.css';

function PerfilUsuario() {
  const { user, isAuthenticated, updateUserProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialData = useMemo(() => {
    if (!profileData) return {
      nombre: user?.nombre || user?.first_name || '',
      telefono: user?.telefono || user?.phone || '',
      avatar: user?.avatar || user?.profile_photo_url || '',
      email: user?.email || '',
    };
    return {
      nombre: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
      telefono: profileData.phone || '',
      avatar: profileData.profile_photo_url || '',
      email: profileData.email || user?.email || '',
    };
  }, [profileData, user]);

  const [formData, setFormData] = useState(initialData);
  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
<<<<<<< HEAD
=======
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    // Cargar datos completos del perfil desde el backend
    const cargarPerfil = async () => {
      try {
        const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';
        const res = await apiFetch(`${AUTH_URL}/api/v1/users/me/`);
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
<<<<<<< HEAD
=======
    const cargarEntradas = async () => {
      setTicketsLoading(true);
      try {
        const datos = await getUserTickets();
        setTickets(datos || []);
      } catch (err) {
        console.error('Error cargando entradas:', err);
      } finally {
        setTicketsLoading(false);
      }
    };

    if (isAuthenticated && user) cargarEntradas();
  }, [isAuthenticated, user]);

  // Auto-download PDFs when backend provides pdf_url and purchase is marked paid
  const [downloadedSet, setDownloadedSet] = useState(() => new Set());
  useEffect(() => {
    if (!tickets || tickets.length === 0) return;
    tickets.forEach((t) => {
      const id = t.id || t.purchase_id || t.code || '';
      const status = (t.status || t.state || '').toString().toLowerCase();
      const pdfUrl = t.pdf_url || t.download_url || t.file_url || null;
      if (pdfUrl && (status === 'paid' || status === 'completed' || status === 'pagado') && !downloadedSet.has(id)) {
        fetch(pdfUrl, { headers: { Accept: 'application/pdf' } })
          .then(r => r.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(t.event?.name || t.event_name || 'entrada').replace(/\s+/g, '_')}_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setDownloadedSet(s => new Set([...s, id]));
          })
          .catch(() => setDownloadedSet(s => new Set([...s, id])));
      }
    });
  }, [tickets]);

  useEffect(() => {
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
    setFormData(initialData);
  }, [initialData]);

  if (!isAuthenticated || !user || loading) {
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

  const handleSubmit = async (e) => {
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

    try {
      const [firstName, ...lastNameParts] = formData.nombre.trim().split(' ');
      const lastName = lastNameParts.join(' ');

      const updatedUser = await updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        phone: formData.telefono.trim(),
        profile_photo_url: formData.avatar || null,
      });

      // Actualizar formData con los nuevos valores
      setFormData({
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        avatar: formData.avatar,
        email: formData.email,
      });

      setMensaje('Tus datos se actualizaron correctamente.');
      setEditando(false);
    } catch (err) {
      setError(err.message || 'No fue posible actualizar tus datos.');
    }
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

<<<<<<< HEAD
=======
  function generateAlphanumericCode(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
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

<<<<<<< HEAD
        <section className="danger-zone">
=======
            <section className="danger-zone">
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
          <h3>Zona de privacidad</h3>
          <p>
            Si eliminas tu cuenta, no podrás volver a acceder con este usuario y tus
            datos se retirarán de la plataforma.
          </p>
          <button type="button" className="btn-eliminar" onClick={() => setShowDeleteModal(true)}>
            Eliminar mi cuenta
          </button>
        </section>

<<<<<<< HEAD
=======
        <section className="mis-entradas">
          <h3>Mis entradas</h3>
          <p>Aquí puedes ver y descargar tus entradas para los eventos.</p>
          {ticketsLoading ? (
            <p>Cargando entradas...</p>
          ) : tickets.length === 0 ? (
            <p>No tienes entradas registradas.</p>
          ) : (
            <ul className="lista-entradas">
              {tickets.map((t) => {
                // Estructura común: t.id, t.event_name || t.event?.name, t.purchase_date
                const eventName = t.event?.name || t.event_name || t.event || 'Evento';
                const purchaseId = t.id || t.purchase_id || t.code || '';
                return (
                  <li key={purchaseId} className="entrada-item">
                    <div className="entrada-info">
                      <strong>{eventName}</strong>
                      <div className="entrada-meta">Compra: {purchaseId}</div>
                    </div>
                    <div className="entrada-acciones">
                      <button
                        type="button"
                        className="btn-secundario"
                        onClick={async () => {
                          // Intentar descargar PDF desde backend, si falla usar ventana para imprimir
                          try {
                            const resp = await api.get(`/profile/purchases/${purchaseId}/download`, {
                              responseType: 'blob',
                            });
                            const blob = new Blob([resp.data], { type: resp.data.type || 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${eventName.replace(/\s+/g, '_')}_${purchaseId}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            // Fallback: abrir nueva ventana con HTML de la entrada y pedir imprimir (guardar PDF)
                            const code = generateAlphanumericCode(12);
                            const html = `
                              <html>
                                <head>
                                  <title>Entrada - ${eventName}</title>
                                  <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px} .ticket{border:1px solid #222;padding:20px;border-radius:6px;max-width:600px} .title{font-size:20px;margin-bottom:8px} .code{font-size:18px;margin-top:12px;background:#f3f3f3;padding:8px;border-radius:4px;display:inline-block}
                                  </style>
                                </head>
                                <body>
                                  <div class="ticket">
                                    <div class="title">${eventName}</div>
                                    <div>Comprador: ${formData.nombre || user.email}</div>
                                    <div>ID compra: ${purchaseId}</div>
                                    <div class="code">Código: ${code}</div>
                                  </div>
                                </body>
                              </html>
                            `;
                            const w = window.open('', '_blank');
                            if (w) {
                              w.document.write(html);
                              w.document.close();
                              // Dar tiempo a renderizar
                              setTimeout(() => w.print(), 500);
                            } else {
                              alert('No se pudo abrir la ventana para generar PDF. Copia este código: ' + code);
                            }
                          }
                        }}
                      >
                        Descargar PDF
                      </button>

                      <button
                        type="button"
                        className="btn-principal"
                        onClick={() => {
                          const code = purchaseId || generateAlphanumericCode(12);
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(code)}&size=300x300`;
                          const w = window.open('', '_blank');
                          if (w) {
                            w.document.write(`<html><head><title>QR</title></head><body style="display:flex;align-items:center;justify-content:center"><img src="${qrUrl}" alt="QR"/></body></html>`);
                            w.document.close();
                          } else {
                            alert('Abre en otra pestaña para ver el QR: ' + qrUrl);
                          }
                        }}
                      >
                        Ver QR
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
            <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
              <h3>¿Seguro que quieres eliminar tu cuenta?</h3>
              <p>Esta acción es <strong>permanente e irreversible</strong>. Al confirmar:</p>
              <ul className="consecuencias-lista">
                <li>Perderás acceso a tu cuenta inmediatamente.</li>
                <li>Todos tus datos personales serán retirados de la plataforma.</li>
                <li>No podrás recuperar tu historial, boletos ni favoritos.</li>
                <li>Necesitarás registrarte nuevamente si deseas usar la plataforma.</li>
              </ul>
              <p>Ingresa tu contraseña para confirmar:</p>
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
