import React, { useState, useEffect } from 'react';
import { eventosService } from '../../../services/eventosService';
import './ListasGenerales.css'; // Compartido con CodigosDescuentoList

export default function PromocionesList() {
  const [promociones, setPromociones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPromociones = async () => {
      try {
        setCargando(true);
        const data = await eventosService.getMisPromociones();
        setPromociones(data);
      } catch (err) {
        setError(err.message || 'Error al cargar promociones');
      } finally {
        setCargando(false);
      }
    };
    fetchPromociones();
  }, []);

  if (cargando) {
    return (
      <div className="lista-general-loading">
        <div className="spinner"></div>
        <p>Cargando promociones...</p>
      </div>
    );
  }

  if (error) {
    return <div className="lista-general-error">❌ {error}</div>;
  }

  if (promociones.length === 0) {
    return (
      <div className="lista-general-vacia">
        <span className="icono-vacio">🚀</span>
        <h3>No tienes promociones activas</h3>
        <p>Promociona tus eventos para darles mayor visibilidad.</p>
      </div>
    );
  }

  return (
    <div className="lista-general-container">
      <div className="lista-general-header">
        <h3>Historial de Promociones</h3>
        <span className="lista-badge">{promociones.length} promociones</span>
      </div>

      <div className="table-responsive">
        <table className="lista-general-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Plan</th>
              <th>Costo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {promociones.map((promo) => (
              <tr key={promo.id}>
                <td>
                  <strong>{promo.event_name}</strong>
                </td>
                <td>
                  <span className={`plan-badge plan-${promo.plan_tier}`}>
                    {promo.plan_name}
                  </span>
                </td>
                <td>Bs. {promo.amount_paid}</td>
                <td>{new Date(promo.created_at).toLocaleDateString('es-ES')}</td>
                <td>{new Date(promo.expires_at).toLocaleDateString('es-ES')}</td>
                <td>
                  <span className={`status-badge status-${promo.status}`}>
                    {promo.status === 'active' ? 'Activa' : 
                     promo.status === 'expired' ? 'Expirada' : 
                     promo.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
