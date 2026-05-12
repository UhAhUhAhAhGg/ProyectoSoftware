'use client';

import { useState, useEffect } from 'react';
import api from '../../../services/api';

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

  // Cargar administradores pendientes cuando estamos en ese módulo
  useEffect(() => {
    if (module === 'administradores') {
      fetchPendingAdmins();
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

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await api.post('/api/v1/users/invite_admin/', { email: inviteEmail });
      // En modo desarrollo, también devolvemos el enlace para copiarlo directo a la consola/pantalla
      setActionMessage(`✅ Invitación generada para ${inviteEmail}. Enlace temporal: ${res.data.mock_link}`);
      setInviteEmail('');
    } catch (error) {
      setActionMessage('❌ Error al enviar la invitación. Asegúrate de tener permisos de SuperAdmin.');
    } finally {
      setInviting(false);
    }
    // Dejar el mensaje flotando 15 segundos para que de tiempo a copiar el enlace "mock"
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

  return (
    <div className="admin-module" style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '8px' }}>{titles[module] || 'Gestión de Usuarios'}</h2>
      <p style={{ opacity: 0.7, marginBottom: '32px' }}>
        Administra los {module || 'usuarios'} registrados en la plataforma.
      </p>

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

          {actionMessage && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', marginBottom: '16px' }}>
              {actionMessage}
            </div>
          )}

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

      {/* Placeholder para la lista general de usuarios (se expandirá en sprints futuros) */}
      <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}>
        El listado completo de {module} se conectará al backend en el siguiente sprint.
      </div>
    </div>
  );
}

export default AdminUsuarios;
