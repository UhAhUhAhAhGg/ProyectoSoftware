import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PromotorService from '../../../services/promotorService';
import './EventoCardFinanciero.css';

function EventoCardFinanciero({ evento, onVerDetalle, onVerDetalleGeneral, onEditar, onEliminar, onRestaurar }) {
  const [financiero, setFinanciero] = useState(null);
  const [loadingFin, setLoadingFin] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await PromotorService.getEventReport(evento.id);
        if (!cancelled) setFinanciero(data);
      } catch (err) {
        console.warn('No se pudo cargar reporte financiero para', evento.id, err?.message);
      } finally {
        if (!cancelled) setLoadingFin(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [evento.id]);

  const ocupacion = evento.capacidad
    ? Math.round((evento.boletosVendidos / evento.capacidad) * 100)
    : 0;

  const formatMoney = (n) => `Bs. ${Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'activo': return 'estado-activo';
      case 'finalizado': return 'estado-finalizado';
      case 'cancelado': return 'estado-cancelado';
      default: return 'estado-borrador';
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'activo': return 'Activo';
      case 'finalizado': return 'Finalizado';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
  };

  const fechaFormateada = evento.fecha
    ? new Date(evento.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sin fecha';

  return (
    <div className={`evento-card-fin ${evento.estado}`}>
      {/* === LADO IZQUIERDO: Info General === */}
      <div className="ecf-left">
        <div className="ecf-image-wrap">
          <img
            src={typeof evento.imagen === 'string' && evento.imagen ? evento.imagen : 'https://via.placeholder.com/200x160?text=Sin+Imagen'}
            alt={evento.nombre}
            className="ecf-image"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/200x160?text=Sin+Imagen'; }}
          />
          <span className={`ecf-estado-badge ${getEstadoClass(evento.estado)}`}>
            {getEstadoLabel(evento.estado)}
          </span>
        </div>

        <div className="ecf-info">
          <h3 className="ecf-nombre">{evento.nombre}</h3>

          <div className="ecf-meta">
            {evento.categoriaNombre && (
              <span className="ecf-categoria">🏷️ {evento.categoriaNombre}</span>
            )}
            <span className="ecf-fecha">📅 {fechaFormateada}{evento.hora ? ` · ${evento.hora}` : ''}</span>
            <span className="ecf-ubicacion">📍 {evento.ubicacion || 'Sin ubicación'}</span>
          </div>

          <div className="ecf-ventas-row">
            <div className="ecf-ventas-info">
              <span className="ecf-ventas-label">🎟️ Ventas</span>
              <span className="ecf-ventas-num">{evento.boletosVendidos}/{evento.capacidad}</span>
            </div>
            <div className="ecf-progress-bar">
              <div
                className="ecf-progress-fill"
                style={{ width: `${Math.min(ocupacion, 100)}%` }}
              />
            </div>
            <span className="ecf-ocupacion-pct">{ocupacion}%</span>
          </div>

          {evento.descripcion && (
            <p className="ecf-descripcion">{evento.descripcion}</p>
          )}
        </div>
      </div>

      {/* === LADO DERECHO: Resumen Financiero === */}
      <div className="ecf-right">
        <div className="ecf-fin-header">
          <h4>💰 Resumen Financiero</h4>
        </div>

        {loadingFin ? (
          <div className="ecf-fin-loading">
            <div className="ecf-spinner" />
            <span>Cargando datos...</span>
          </div>
        ) : financiero ? (
          <div className="ecf-fin-data">
            <div className="ecf-fin-grid">
              <div className="ecf-fin-item ecf-brutos">
                <span className="ecf-fin-label">Ingresos Brutos</span>
                <span className="ecf-fin-value">{formatMoney(financiero.resumen.ingresosBrutos)}</span>
              </div>
              <div className="ecf-fin-item ecf-comisiones">
                <span className="ecf-fin-label">Comisiones</span>
                <span className="ecf-fin-value">{formatMoney(financiero.resumen.comisiones)}</span>
              </div>
              <div className="ecf-fin-item ecf-netos">
                <span className="ecf-fin-label">Neto Recibido</span>
                <span className="ecf-fin-value">{formatMoney(financiero.resumen.ingresosNetos)}</span>
              </div>
              <div className="ecf-fin-item ecf-compradores">
                <span className="ecf-fin-label">Compradores</span>
                <span className="ecf-fin-value">{financiero.resumen.totalCompradores}</span>
              </div>
            </div>

            {/* Mini barra de desglose */}
            {financiero.desglose.length > 0 && (
              <div className="ecf-desglose-mini">
                <span className="ecf-desglose-label">Desglose por tipo:</span>
                <div className="ecf-desglose-bars">
                  {financiero.desglose.map((d, i) => (
                    <div key={d.id || i} className="ecf-desglose-bar-item" title={`${d.nombre}: ${formatMoney(d.ingresosBrutos)}`}>
                      <div className="ecf-desglose-bar-bg">
                        <div
                          className="ecf-desglose-bar-fill"
                          style={{
                            width: `${d.ocupacionPct}%`,
                            background: d.esVip ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                          }}
                        />
                      </div>
                      <span className="ecf-desglose-bar-name">{d.nombre} {d.esVip ? '⭐' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="ecf-fin-empty">
            <span>📊</span>
            <p>Sin datos financieros</p>
          </div>
        )}

        {/* Acciones */}
        <div className="ecf-acciones">
          <button className="ecf-btn ecf-btn-general" onClick={() => onVerDetalleGeneral(evento)} title="Ver detalles generales del evento">
            👁️ Detalles
          </button>
          <button className="ecf-btn ecf-btn-detalle" onClick={() => onVerDetalle(evento, financiero)} title="Ver detalle financiero completo">
            📊 Finanzas
          </button>
          <button
            onClick={() => onEditar(evento.id)}
            className="ecf-btn ecf-btn-editar"
          >
            ✏️ Editar
          </button>
          {evento.estado === 'activo' && (
            <button className="ecf-btn ecf-btn-cancelar" onClick={() => onEliminar(evento)} title="Cancelar evento">
              🗑️
            </button>
          )}
          {evento.estado === 'cancelado' && (
            <button className="ecf-btn ecf-btn-restaurar" onClick={() => onRestaurar(evento.id)} title="Restaurar evento">
              🔄
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventoCardFinanciero;
