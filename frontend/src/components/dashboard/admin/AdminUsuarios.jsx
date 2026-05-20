'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { userManagementService } from '../../../services/userManagementService';
import AdminActionModal from './AdminActionModal';
import './AdminUsuarios.css';

const API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

function AdminUsuarios({ module }) {
  const titles = {
    usuarios: 'Gestión de Usuarios',
    promotores: 'Gestión de Promotores',
    compradores: 'Gestión de Compradores',
    administradores: 'Gestión de Administradores',
  };

  // --- Estado para la tabla de administradores pendientes ---
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // --- Estado para invitar nuevo admin ---
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const availablePermissions = [
  'Gestionar Usuarios',
  'Gestionar Eventos',
  'Ver Reportes',
  'Configuración del Sistema',
];

  // --- Estado para tabla de usuarios ---
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 10;
  
  // --- Estado para modal de acciones ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    actionType: null, // 'suspend' | 'deactivate'
    usuario: null,
  });
  const [procesando, setProcesando] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);

  // --- Estadísticas ---
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    suspendidos: 0,
    baja: 0,
  });

  // --- TIC-438: Modal para crear nuevo Promotor/Comprador ---
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    role_name: module === 'promotores' ? 'Promotor' : 'Comprador',
    // Campos extra para Promotor (service-profiles los requiere)
    company_name: '',
    comercial_nit: '',
    bank_account: '',
  });

  const resetCreateForm = () => {
    setCreateForm({
      email: '',
      password: '',
      password_confirm: '',
      first_name: '',
      last_name: '',
      phone: '',
      date_of_birth: '',
      role_name: module === 'promotores' ? 'Promotor' : 'Comprador',
      company_name: '',
      comercial_nit: '',
      bank_account: '',
    });
    setCreateError('');
    setShowCreatePassword(false);
    setShowCreateConfirm(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.email || !createForm.password || !createForm.first_name) {
      setCreateError('Email, contraseña y nombre son obligatorios.');
      return;
    }
    // Validar contraseña (8+ chars, 1 mayúscula, 1 número) antes de enviar
    if (createForm.password.length < 8) {
      setCreateError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(createForm.password)) {
      setCreateError('La contraseña debe contener al menos una mayúscula.');
      return;
    }
    if (!/\d/.test(createForm.password)) {
      setCreateError('La contraseña debe contener al menos un número.');
      return;
    }
    if (createForm.password !== createForm.password_confirm) {
      setCreateError('Las contraseñas no coinciden.');
      return;
    }
    setCreating(true);
    try {
      const payload = { ...createForm };
      // No enviar el campo de confirmacion
      delete payload.password_confirm;
      // Solo enviar campos de Promotor si aplica
      if (payload.role_name !== 'Promotor') {
        delete payload.company_name;
        delete payload.comercial_nit;
        delete payload.bank_account;
      }
      // Si fecha esta vacia, no la mandamos (el backend la hace opcional)
      if (!payload.date_of_birth) delete payload.date_of_birth;
      await userManagementService.crearUsuario(payload);
      showMessage(`✅ ${payload.role_name} ${payload.email} creado correctamente`, 'success');
      setActionHistory((prev) => [
        { action: 'Creación', user: payload.email, date: new Date().toLocaleString() },
        ...prev,
      ]);
      setCreateOpen(false);
      resetCreateForm();
      cargarUsuarios();
    } catch (err) {
      setCreateError(err.message || 'Error al crear usuario');
    } finally {
      setCreating(false);
    }
  };

  // Cargar datos cuando estamos en ese módulo
  useEffect(() => {
    if (module === 'administradores') {
      fetchPendingAdmins();
    } else if (module === 'usuarios' || module === 'promotores' || module === 'compradores') {
      cargarUsuarios();
    }
  }, [module]);

  const fetchPendingAdmins = async () => {
    setLoadingPending(true);
    try {
      const response = await api.get('/api/v1/users/pending_admins/');
      setPendingAdmins(response.data);
    } catch (error) {
      console.error('Error al cargar administradores pendientes:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const cargarUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      let data;
      if (module === 'promotores') {
        data = await userManagementService.getPromotores();
      } else if (module === 'compradores') {
        data = await userManagementService.getCompradores();
      } else {
        data = await userManagementService.getUsuarios();
      }
      
      setUsuarios(Array.isArray(data) ? data : []);
      calcularEstadisticas(Array.isArray(data) ? data : []);
      showMessage('✅ Usuarios cargados correctamente', 'success');
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      showMessage('❌ Error al cargar usuarios', 'error');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const calcularEstadisticas = (usuarios) => {
    // Backend usa account_status: 'active'|'suspended'|'banned'
    const total = usuarios.length;
    const activos = usuarios.filter((u) => {
      const st = u.account_status || u.status;
      return st === 'active' || (!st && u.is_active);
    }).length;
    const suspendidos = usuarios.filter((u) => (u.account_status || u.status) === 'suspended').length;
    const baja = usuarios.filter((u) => {
      const st = u.account_status || u.status;
      return st === 'banned' || st === 'deleted';
    }).length;

    setStats({ total, activos, suspendidos, baja });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await api.post('/api/v1/users/invite_admin/', { email: inviteEmail });
      setActionMessage(`✅ Invitación generada para ${inviteEmail}. Enlace temporal: ${res.data.mock_link}`);
      setInviteEmail('');
    } catch (error) {
      setActionMessage('❌ Error al enviar la invitación. Asegúrate de tener permisos de SuperAdmin.');
    } finally {
      setInviting(false);
    }
    setTimeout(() => setActionMessage(''), 15000);
  };
  const handlePermissionChange = (permission) => {
  setSelectedPermissions((prev) =>
    prev.includes(permission)
      ? prev.filter((p) => p !== permission)
      : [...prev, permission]
  );
};

  const handleApprove = async (id) => {
    try {
      await api.patch(`/api/v1/users/approve_admin/${id}/`);
      setActionMessage('✅ Administrador aprobado correctamente.');
      setPendingAdmins(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      setActionMessage('❌ Error al aprobar. Intenta de nuevo.');
    }
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleReject = async (id) => {
    if (!confirm('¿Seguro que deseas rechazar esta solicitud?')) return;
    try {
      await api.delete(`/api/v1/users/reject_admin/${id}/`);
      setActionMessage('🗑️ Solicitud rechazada.');
      setPendingAdmins(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      setActionMessage('❌ Error al rechazar. Intenta de nuevo.');
    }
    setTimeout(() => setActionMessage(''), 4000);
  };

  // Abrir modal de suspensión
  const abrirModalSuspender = (usuario) => {
    setModalConfig({
      actionType: 'suspend',
      usuario,
    });
    setModalOpen(true);
  };

  // Abrir modal de dar de baja
  const abrirModalBaja = (usuario) => {
    setModalConfig({
      actionType: 'deactivate',
      usuario,
    });
    setModalOpen(true);
  };

  // Confirmar acción del modal
  const confirmarAccion = async (motivo) => {
    setProcesando(true);
    try {
      if (modalConfig.actionType === 'suspend') {
        await userManagementService.suspenderUsuario(modalConfig.usuario.id, motivo);
        showMessage('✅ Usuario suspendido correctamente', 'success');
        setActionHistory((prev) => [
  {
    action: 'Suspensión',
    user: modalConfig.usuario.email,
    date: new Date().toLocaleString(),
  },
  ...prev,
]);
      } else if (modalConfig.actionType === 'deactivate') {
        await userManagementService.darDeBajaUsuario(modalConfig.usuario.id, motivo);
        showMessage('✅ Usuario dado de baja correctamente', 'success');
        setActionHistory((prev) => [
  {
    action: 'Baja',
    user: modalConfig.usuario.email,
    date: new Date().toLocaleString(),
  },
  ...prev,
]);
      }
      
      setModalOpen(false);
      cargarUsuarios();
    } catch (error) {
      showMessage('❌ Error al procesar la acción', 'error');
    } finally {
      setProcesando(false);
    }
  };

  // Reactivar usuario
  const reactivarUsuario = async (usuario) => {
    if (!window.confirm(`¿Reactivar a ${usuario.email}?`)) return;
    try {
      await userManagementService.reactivarUsuario(usuario.id);
      showMessage('✅ Usuario reactivado correctamente', 'success');
      setActionHistory((prev) => [
  {
    action: 'Reactivación',
    user: usuario.email,
    date: new Date().toLocaleString(),
  },
  ...prev,
]);
      cargarUsuarios();
    } catch (error) {
      showMessage('❌ Error al reactivar usuario', 'error');
    }
  };

  const showMessage = (mensaje, tipo) => {
    setActionMessage({ texto: mensaje, tipo });
    setTimeout(() => setActionMessage(''), 4000);
  };

  // Filtrar usuarios (backend usa account_status)
  const usuariosFiltrados = usuarios.filter((u) => {
    const st = u.account_status || u.status;
    const cumpleFiltroEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && (st === 'active' || (!st && u.is_active))) ||
      (filtroEstado === 'suspendidos' && st === 'suspended') ||
      (filtroEstado === 'baja' && (st === 'banned' || st === 'deleted'));

    const cumplebúsqueda =
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return cumpleFiltroEstado && cumplebúsqueda;
  });

  // Paginación
const indiceUltimoUsuario = paginaActual * usuariosPorPagina;
const indicePrimerUsuario = indiceUltimoUsuario - usuariosPorPagina;

const usuariosPaginados = usuariosFiltrados.slice(
  indicePrimerUsuario,
  indiceUltimoUsuario
);

const totalPaginas = Math.ceil(
  usuariosFiltrados.length / usuariosPorPagina
);

const cambiarPagina = (numeroPagina) => {
  setPaginaActual(numeroPagina);
};
  const obtenerEstado = (usuario) => {
    // Backend devuelve 'account_status': 'active' | 'suspended' | 'banned'
    const st = usuario.account_status || usuario.status;
    if (st === 'suspended') return 'suspendido';
    if (st === 'banned' || st === 'deleted') return 'baja';
    return usuario.is_active !== false ? 'activo' : 'inactivo';
  };

  return (
    <div className="admin-usuarios-container">
      {/* Header */}
      <div className="admin-section-header">
        <h2>{titles[module] || 'Gestión de Usuarios'}</h2>
        <p>Administra los {module || 'usuarios'} registrados en la plataforma.</p>
      </div>

      {/* Mensaje de notificación */}
      {actionMessage && (
        <div className={`admin-message ${actionMessage.tipo || 'info'}`}>
          {actionMessage.texto || actionMessage}
        </div>
      )}

      {/* Panel especial de aprobaciones — solo visible en módulo "administradores" */}
      {module === 'administradores' && (
        <div style={{ marginBottom: '40px' }}>
          {/* Formulario de Invitar Administrador */}
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✉️ Invitar Nuevo Administrador
            </h3>
            <p style={{ opacity: 0.7, marginBottom: '16px', fontSize: '14px' }}>
              Genera un enlace criptográfico único para que el colega complete su registro de seguridad.
            </p>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="email"
                placeholder="correo@ticketgo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={inviting}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white' }}
              />
              <button 
                type="submit" 
                disabled={inviting || !inviteEmail}
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#3498db', color: 'white', fontWeight: 600, cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.7 : 1 }}
              >
                {inviting ? 'Generando...' : 'Generar Enlace'}
              </button>
              <div style={{ marginTop: '20px' }}>
  <h4 style={{ marginBottom: '12px' }}>
    Permisos del Administrador
  </h4>

  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {availablePermissions.map((permission) => (
      <label
        key={permission}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <input
          type="checkbox"
          checked={selectedPermissions.includes(permission)}
          onChange={() => handlePermissionChange(permission)}
        />
        {permission}
      </label>
    ))}
  </div>
</div>
            </form>
          </div>

          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⏳ Solicitudes Pendientes de Aprobación
            {pendingAdmins.length > 0 && (
              <span style={{ background: '#e74c3c', color: 'white', borderRadius: '999px', padding: '2px 10px', fontSize: '13px' }}>
                {pendingAdmins.length}
              </span>
            )}
          </h3>

          {loadingPending ? (
            <p>Cargando solicitudes...</p>
          ) : pendingAdmins.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}>
              No hay solicitudes pendientes en este momento.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', opacity: 0.7 }}>Email</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', opacity: 0.7 }}>Código Empleado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', opacity: 0.7 }}>Departamento</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', opacity: 0.7 }}>Fecha Solicitud</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', opacity: 0.7 }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAdmins.map((admin) => (
                    <tr key={admin.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={{ padding: '12px 16px' }}>{admin.email}</td>
                      <td style={{ padding: '12px 16px' }}>{admin.employee_code || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{admin.department || '—'}</td>
                      <td style={{ padding: '12px 16px', opacity: 0.7, fontSize: '13px' }}>
                        {admin.date_joined ? new Date(admin.date_joined).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleApprove(admin.id)}
                          style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#27ae60', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✓ Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(admin.id)}
                          style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#e74c3c', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✕ Rechazar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sección de tabla de usuarios (visible en usuarios, promotores, compradores) */}
      {(module === 'usuarios' || module === 'promotores' || module === 'compradores') && (
        <>
          {/* Estadísticas */}
          <div className="admin-usuarios-stats">
            <div className="admin-stat-card">
              <div className="admin-stat-number">{stats.total}</div>
              <div className="admin-stat-label">Total</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-number">{stats.activos}</div>
              <div className="admin-stat-label">Activos</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-number">{stats.suspendidos}</div>
              <div className="admin-stat-label">Suspendidos</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-number">{stats.baja}</div>
              <div className="admin-stat-label">Dado de Baja</div>
            </div>
          </div>

          {/* Controles de filtro y búsqueda */}
          <div className="admin-usuarios-controls">
            <div className="admin-filter-group">
              <button
                className={`admin-filter-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('todos')}
              >
                Todos
              </button>
              <button
                className={`admin-filter-btn ${filtroEstado === 'activos' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('activos')}
              >
                🟢 Activos
              </button>
              <button
                className={`admin-filter-btn ${filtroEstado === 'suspendidos' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('suspendidos')}
              >
                🟡 Suspendidos
              </button>
              <button
                className={`admin-filter-btn ${filtroEstado === 'baja' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('baja')}
              >
                🔴 Dado de Baja
              </button>
            </div>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="admin-filter-btn"
              onClick={cargarUsuarios}
              disabled={loadingUsuarios}
            >
              {loadingUsuarios ? '⟳ Cargando...' : '🔄 Actualizar'}
            </button>
            {/* TIC-438: Crear nuevo Promotor/Comprador */}
            {(module === 'promotores' || module === 'compradores' || module === 'usuarios') && (
              <button
                className="admin-filter-btn admin-create-btn"
                onClick={() => { resetCreateForm(); setCreateOpen(true); }}
                style={{ background: '#d4a256', color: '#1a1a1a', fontWeight: 700, marginLeft: 8 }}
              >
                ➕ Crear {module === 'promotores' ? 'Promotor' : module === 'compradores' ? 'Comprador' : 'Usuario'}
              </button>
            )}
          </div>

          {/* Tabla de usuarios */}
          {loadingUsuarios ? (
            <div className="admin-usuarios-loading">⟳ Cargando usuarios...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="admin-usuarios-empty">
              📭 No hay usuarios que coincidan con tus filtros
            </div>
          ) : (
            <div className="admin-usuarios-table-wrapper">
              <table className="admin-usuarios-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Registrado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosPaginados.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>
                        <div className="usuario-info">
                          <div className="usuario-avatar">
                            {(usuario.nombre || usuario.first_name || usuario.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="usuario-details">
                            <div className="usuario-nombre">
                              {usuario.nombre || `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() || 'Sin nombre'}
                            </div>
                            <div className="usuario-email">{usuario.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{usuario.email}</td>
                      <td>{module === 'promotores' ? 'Promotor' : module === 'compradores' ? 'Comprador' : usuario.role || 'Usuario'}</td>
                      <td>
                        <span className={`estado-badge ${obtenerEstado(usuario)}`}>
                          {obtenerEstado(usuario) === 'activo' && '✓ Activo'}
                          {obtenerEstado(usuario) === 'suspendido' && '⏸ Suspendido'}
                          {obtenerEstado(usuario) === 'baja' && '✕ Dado de Baja'}
                          {obtenerEstado(usuario) === 'inactivo' && '○ Inactivo'}
                        </span>
                      </td>
                      <td>{usuario.date_joined ? new Date(usuario.date_joined).toLocaleDateString('es-ES') : '—'}</td>
                      <td>
                        <div className="admin-acciones">
                          {obtenerEstado(usuario) === 'activo' && (
                            <>
                              <button
                                className="admin-btn-action admin-btn-suspender"
                                onClick={() => abrirModalSuspender(usuario)}
                                title="Suspender usuario"
                              >
                                ⏸ Suspender
                              </button>
                              <button
                                className="admin-btn-action admin-btn-baja"
                                onClick={() => abrirModalBaja(usuario)}
                                title="Dar de baja usuario"
                              >
                                ✕ Baja
                              </button>
                            </>
                          )}
                          {obtenerEstado(usuario) === 'suspendido' && (
                            <>
                              <button
                                className="admin-btn-action admin-btn-reactivar"
                                onClick={() => reactivarUsuario(usuario)}
                                title="Reactivar usuario"
                              >
                                ✓ Reactivar
                              </button>
                              <button
                                className="admin-btn-action admin-btn-baja"
                                onClick={() => abrirModalBaja(usuario)}
                                title="Dar de baja usuario"
                              >
                                ✕ Baja
                              </button>
                            </>
                          )}
                          {obtenerEstado(usuario) === 'baja' && (
                            <span style={{ fontSize: '12px', color: '#95a5a6' }}>
                              Eliminado permanentemente
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPaginas > 1 && (
  <div className="admin-pagination">
    {Array.from({ length: totalPaginas }, (_, index) => (
      <button
        key={index + 1}
        className={`admin-page-btn ${
          paginaActual === index + 1 ? 'active' : ''
        }`}
        onClick={() => cambiarPagina(index + 1)}
      >
        {index + 1}
      </button>
    ))}
  </div>
)}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: '32px' }}>
  <h3 style={{ marginBottom: '16px' }}>
    📋 Historial de Acciones
  </h3>

  {actionHistory.length === 0 ? (
    <p style={{ opacity: 0.7 }}>
      No hay acciones registradas.
    </p>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {actionHistory.map((item, index) => (
        <div
          key={index}
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <strong>{item.action}</strong> — {item.user}
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            {item.date}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
      {/* Modal de confirmación de acción */}
      <AdminActionModal
        isOpen={modalOpen}
        title={
          modalConfig.actionType === 'suspend'
            ? '🔒 Suspender Usuario'
            : '⚠️ Dar de Baja Permanente'
        }
        mensaje={
          modalConfig.actionType === 'suspend'
            ? 'La cuenta del usuario será suspendida y no podrá acceder a la plataforma hasta que sea reactivada.'
            : 'El usuario será eliminado permanentemente de la plataforma. Esta acción NO se puede deshacer.'
        }
        actionType={modalConfig.actionType}
        usuario={modalConfig.usuario}
        onConfirm={confirmarAccion}
        onCancel={() => setModalOpen(false)}
        loading={procesando}
      />

      {/* TIC-438: Modal para crear nuevo Promotor/Comprador */}
      {createOpen && (
        <div className="create-user-overlay" onClick={() => setCreateOpen(false)}>
          <div className="create-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-user-header">
              <h3>
                <span className="create-user-icon">{createForm.role_name === 'Promotor' ? '📢' : '🛍️'}</span>
                Crear nueva cuenta ({createForm.role_name})
              </h3>
              <button className="create-user-close" onClick={() => setCreateOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="create-user-body">
                {createError && (
                  <div className="create-user-error">
                    <span>⚠️</span> {createError}
                  </div>
                )}

                <div className="create-user-section">
                  <h4>Datos de acceso</h4>
                  <div className="create-user-grid">
                    <div className="create-user-field">
                      <label>Rol</label>
                      <select
                        value={createForm.role_name}
                        onChange={(e) => setCreateForm({ ...createForm, role_name: e.target.value })}
                        disabled={module === 'promotores' || module === 'compradores'}
                      >
                        <option value="Comprador">Comprador</option>
                        <option value="Promotor">Promotor</option>
                      </select>
                    </div>
                    <div className="create-user-field create-user-field-full">
                      <label>Email <span className="req">*</span></label>
                      <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="create-user-field create-user-field-full">
                      <label>Contraseña <span className="req">*</span></label>
                      <div className="create-user-password-wrap">
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          className="create-user-eye"
                          onClick={() => setShowCreatePassword((v) => !v)}
                          aria-label={showCreatePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showCreatePassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                    <div className="create-user-field create-user-field-full">
                      <label>Confirmar contraseña <span className="req">*</span></label>
                      <div className="create-user-password-wrap">
                        <input
                          type={showCreateConfirm ? 'text' : 'password'}
                          placeholder="Repite la contraseña"
                          value={createForm.password_confirm}
                          onChange={(e) => setCreateForm({ ...createForm, password_confirm: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          className="create-user-eye"
                          onClick={() => setShowCreateConfirm((v) => !v)}
                          aria-label={showCreateConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showCreateConfirm ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {createForm.password_confirm && createForm.password !== createForm.password_confirm && (
                        <small style={{ color: '#fca5a5', fontSize: '0.78rem', marginTop: 2 }}>
                          Las contraseñas no coinciden
                        </small>
                      )}
                    </div>
                  </div>
                </div>

                <div className="create-user-section">
                  <h4>Datos personales</h4>
                  <div className="create-user-grid">
                    <div className="create-user-field">
                      <label>Nombre <span className="req">*</span></label>
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={createForm.first_name}
                        onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="create-user-field">
                      <label>Apellido</label>
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={createForm.last_name}
                        onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                      />
                    </div>
                    <div className="create-user-field">
                      <label>Teléfono</label>
                      <input
                        type="text"
                        placeholder="Ej. 76543210"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="create-user-field">
                      <label>Fecha de nacimiento</label>
                      <input
                        type="date"
                        value={createForm.date_of_birth}
                        onChange={(e) => setCreateForm({ ...createForm, date_of_birth: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {createForm.role_name === 'Promotor' && (
                  <div className="create-user-section">
                    <h4>Datos comerciales <span className="section-hint">(requeridos para Promotor)</span></h4>
                    <div className="create-user-grid">
                      <div className="create-user-field create-user-field-full">
                        <label>Razón social</label>
                        <input
                          type="text"
                          placeholder="Nombre de la empresa"
                          value={createForm.company_name}
                          onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
                        />
                      </div>
                      <div className="create-user-field">
                        <label>NIT comercial</label>
                        <input
                          type="text"
                          placeholder="NIT"
                          value={createForm.comercial_nit}
                          onChange={(e) => setCreateForm({ ...createForm, comercial_nit: e.target.value })}
                        />
                      </div>
                      <div className="create-user-field">
                        <label>Cuenta bancaria</label>
                        <input
                          type="text"
                          placeholder="Número de cuenta"
                          value={createForm.bank_account}
                          onChange={(e) => setCreateForm({ ...createForm, bank_account: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="create-user-footer">
                <button type="button" className="create-user-btn create-user-btn-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancelar
                </button>
                <button type="submit" className="create-user-btn create-user-btn-primary" disabled={creating}>
                  {creating ? '⏳ Creando...' : `➕ Crear ${createForm.role_name}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsuarios;
