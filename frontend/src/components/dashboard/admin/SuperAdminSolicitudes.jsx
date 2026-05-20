'use client';

import { useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService';
import './SuperAdminSolicitudes.css';

// Lista las cuentas de Administrador creadas pero aun no aprobadas (is_active=False).
// Sprint 4: por ahora la creacion directa por SuperAdmin no produce pendientes,
// pero dejamos la pantalla preparada por si se reactiva el flujo de invitacion.
function SuperAdminSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await adminService.getPendingAdminRequests();
      setSolicitudes(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setMessage('No se pudieron cargar las solicitudes pendientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleApprove = async (id) => {
    try {
      await adminService.approveAdminRequest(id);
      setMessage('✅ Solicitud aprobada.');
      await cargar();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Error al aprobar la solicitud.');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('¿Rechazar esta solicitud? Esta acción es definitiva.')) return;
    try {
      await adminService.rejectAdminRequest(id);
      setMessage('✅ Solicitud rechazada.');
      await cargar();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Error al rechazar la solicitud.');
    }
  };

  return (
    <div className="sa-solicitudes">
      {message && (
        <div className={`sa-sol-msg ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="sa-sol-loader">Cargando solicitudes...</div>
      ) : solicitudes.length === 0 ? (
        <div className="sa-sol-empty">
          <p>📭 No hay solicitudes pendientes de aprobación.</p>
          <p className="muted">Las nuevas cuentas creadas por el SuperAdmin se activan automáticamente.</p>
        </div>
      ) : (
        <table className="sa-sol-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>Solicitado el</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td>
                  {s.profile?.first_name || s.profile?.last_name
                    ? `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.trim()
                    : '-'}
                </td>
                <td>{s.created_at ? new Date(s.created_at).toLocaleString() : '-'}</td>
                <td className="sa-sol-actions">
                  <button className="sa-sol-btn approve" onClick={() => handleApprove(s.id)}>
                    ✅ Aprobar
                  </button>
                  <button className="sa-sol-btn reject" onClick={() => handleReject(s.id)}>
                    ✕ Rechazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SuperAdminSolicitudes;
