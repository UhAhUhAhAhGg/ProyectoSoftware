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

  // --- Estado para tabla de usuarios ---
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Estado para modal de acciones ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    actionType: null, // 'suspend' | 'deactivate'
    usuario: null,
  });
  const [procesando, setProcesando] = useState(false);

  // --- Estadísticas ---
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    suspendidos: 0,
    baja: 0,
  });

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
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.status === 'active' || u.is_active).length;
    const suspendidos = usuarios.filter(u => u.status === 'suspended').length;
    const baja = usuarios.filter(u => u.status === 'deleted').length;

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
      } else if (modalConfig.actionType === 'deactivate') {
        await userManagementService.darDeBajaUsuario(modalConfig.usuario.id, motivo);
        showMessage('✅ Usuario dado de baja correctamente', 'success');
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
      cargarUsuarios();
    } catch (error) {
      showMessage('❌ Error al reactivar usuario', 'error');
    }
  };

  const showMessage = (mensaje, tipo) => {
    setActionMessage({ texto: mensaje, tipo });
    setTimeout(() => setActionMessage(''), 4000);
  };

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter(u => {
    const cumpleFiltroEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && (u.status === 'active' || u.is_active)) ||
      (filtroEstado === 'suspendidos' && u.status === 'suspended') ||
      (filtroEstado === 'baja' && u.status === 'deleted');

    const cumplebúsqueda =
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return cumpleFiltroEstado && cumplebúsqueda;
  });

  const obtenerEstado = (usuario) => {
    if (usuario.status === 'suspended') return 'suspendido';
    if (usuario.status === 'deleted') return 'baja';
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
                  {usuariosFiltrados.map((usuario) => (
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
            </div>
          )}
        </>
      )}

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
    </div>
  );
}

export default AdminUsuarios;
