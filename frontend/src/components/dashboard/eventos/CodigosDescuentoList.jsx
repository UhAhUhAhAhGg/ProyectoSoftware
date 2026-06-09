import React, { useState, useEffect } from 'react';
import { eventosService } from '../../../services/eventosService';
import './ListasGenerales.css'; // Compartido con PromocionesList

export default function CodigosDescuentoList() {
  const [codigos, setCodigos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCodigos = async () => {
      try {
        setCargando(true);
        const data = await eventosService.getMisCodigosDescuento();
        setCodigos(data);
      } catch (err) {
        setError(err.message || 'Error al cargar códigos de descuento');
      } finally {
        setCargando(false);
      }
    };
    fetchCodigos();
  }, []);

  if (cargando) {
    return (
      <div className="lista-general-loading">
        <div className="spinner"></div>
        <p>Cargando códigos de descuento...</p>
      </div>
    );
  }

  if (error) {
    return <div className="lista-general-error">❌ {error}</div>;
  }

  if (codigos.length === 0) {
    return (
      <div className="lista-general-vacia">
        <span className="icono-vacio">🏷️</span>
        <h3>No tienes códigos de descuento</h3>
        <p>Crea códigos para ofrecer descuentos especiales a tus compradores.</p>
      </div>
    );
  }

  return (
    <div className="lista-general-container">
      <div className="lista-general-header">
        <h3>Historial de Códigos de Descuento</h3>
        <span className="lista-badge">{codigos.length} códigos</span>
      </div>

      <div className="table-responsive">
        <table className="lista-general-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Código</th>
              <th>Descuento</th>
              <th>Expiración</th>
              <th>Usos</th>
              <th>Total Descontado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {codigos.map((codigo) => (
              <tr key={codigo.id}>
                <td>
                  <strong>{codigo.event_name || 'Global (Todos)'}</strong>
                </td>
                <td>
                  <span className="codigo-badge">{codigo.code}</span>
                </td>
                <td>
                  {codigo.discount_type === 'porcentaje' 
                    ? `${codigo.discount_value}%` 
                    : `Bs. ${codigo.discount_value}`}
                </td>
                <td>
                  {codigo.valid_until 
                    ? new Date(codigo.valid_until).toLocaleDateString('es-ES') 
                    : 'Sin expiración'}
                </td>
                <td>
                  {codigo.times_used} / {codigo.max_uses || '∞'}
                </td>
                <td>Bs. {codigo.total_descontado}</td>
                <td>
                  <span className={`status-badge status-${codigo.is_currently_valid ? 'active' : 'expired'}`}>
                    {codigo.is_currently_valid ? 'Válido' : 'Inválido/Expirado'}
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
