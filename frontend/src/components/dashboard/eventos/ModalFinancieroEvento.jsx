import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import PromotorService from '../../../services/promotorService';
import ListaCompradoresModal from './ListaCompradoresModal';
import './ModalFinancieroEvento.css';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#818cf8'];

function ModalFinancieroEvento({ evento, financiero, onClose }) {
  const [showCompradores, setShowCompradores] = useState(false);
  const [exportando, setExportando] = useState(null);

  if (!evento) return null;

  const res = financiero?.resumen || {};
  const desglose = financiero?.desglose || [];
  const topCompradores = financiero?.topCompradores || [];

  const formatMoney = (n) => `Bs. ${Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const chartData = desglose.map(d => ({
    name: d.nombre?.length > 12 ? d.nombre.slice(0, 12) + '…' : d.nombre,
    brutos: d.ingresosBrutos,
    netos: d.ingresosNetos,
    vendidos: d.vendidos,
  }));

  const handleExport = async (type) => {
    setExportando(type);
    try {
      if (type === 'buyers') {
        await PromotorService.exportEventBuyersCSV(evento.id);
      } else {
        await PromotorService.exportEventFinancialCSV(evento.id);
      }
    } catch (err) {
      alert('Error al exportar: ' + (err?.message || 'Intenta de nuevo'));
    } finally {
      setExportando(null);
    }
  };

  if (showCompradores) {
    return (
      <ListaCompradoresModal
        eventId={evento.id}
        eventoNombre={evento.nombre}
        onClose={() => setShowCompradores(false)}
        onBack={() => setShowCompradores(false)}
      />
    );
  }

  return (
    <div className="mfe-overlay" onClick={onClose}>
      <div className="mfe-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="mfe-header">
          <div className="mfe-header-info">
            <h2>📊 Reporte Financiero</h2>
            <p className="mfe-evento-nombre">{evento.nombre}</p>
            <div className="mfe-header-meta">
              {evento.fecha && <span>📅 {new Date(evento.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
              {evento.ubicacion && <span>📍 {evento.ubicacion}</span>}
            </div>
          </div>
          <button className="mfe-close" onClick={onClose}>✕</button>
        </div>

        <div className="mfe-body">
          {/* ── SECCIÓN 1: KPIs ──────────────────────────────── */}
          <div className="mfe-kpis">
            <div className="mfe-kpi mfe-kpi-brutos">
              <div className="mfe-kpi-icon">💵</div>
              <div className="mfe-kpi-content">
                <span className="mfe-kpi-label">Ingresos Brutos</span>
                <span className="mfe-kpi-value">{formatMoney(res.ingresosBrutos)}</span>
              </div>
            </div>
            <div className="mfe-kpi mfe-kpi-comisiones">
              <div className="mfe-kpi-icon">🏦</div>
              <div className="mfe-kpi-content">
                <span className="mfe-kpi-label">Comisiones Plataforma</span>
                <span className="mfe-kpi-value">{formatMoney(res.comisiones)}</span>
              </div>
            </div>
            <div className="mfe-kpi mfe-kpi-netos">
              <div className="mfe-kpi-icon">✅</div>
              <div className="mfe-kpi-content">
                <span className="mfe-kpi-label">Ingresos Netos</span>
                <span className="mfe-kpi-value">{formatMoney(res.ingresosNetos)}</span>
              </div>
            </div>
            <div className="mfe-kpi mfe-kpi-ocupacion">
              <div className="mfe-kpi-icon">📈</div>
              <div className="mfe-kpi-content">
                <span className="mfe-kpi-label">Ocupación</span>
                <span className="mfe-kpi-value">{res.ocupacionPct || 0}%</span>
                <div className="mfe-kpi-bar">
                  <div className="mfe-kpi-bar-fill" style={{ width: `${Math.min(res.ocupacionPct || 0, 100)}%` }} />
                </div>
                <span className="mfe-kpi-subtext">{res.totalTicketsVendidos || 0} tickets · {res.totalCompradores || 0} compradores</span>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: Desglose por Tipo ─────────────────── */}
          {desglose.length > 0 && (
            <div className="mfe-section">
              <h3>🎟️ Desglose por Tipo de Entrada</h3>
              <div className="mfe-table-wrap">
                <table className="mfe-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Zona</th>
                      <th>Precio</th>
                      <th>Vendidos</th>
                      <th>Ocupación</th>
                      <th>Brutos</th>
                      <th>Comisión</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desglose.map((d, i) => (
                      <tr key={d.id || i}>
                        <td className="mfe-td-nombre">
                          {d.nombre} {d.esVip && <span className="mfe-vip-badge">VIP</span>}
                        </td>
                        <td>{d.zona}</td>
                        <td>{formatMoney(d.precio)}</td>
                        <td><strong>{d.vendidos}</strong>/{d.maxCapacity}</td>
                        <td>
                          <div className="mfe-mini-bar">
                            <div className="mfe-mini-bar-fill" style={{ width: `${d.ocupacionPct}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="mfe-mini-pct">{d.ocupacionPct}%</span>
                        </td>
                        <td className="mfe-td-money">{formatMoney(d.ingresosBrutos)}</td>
                        <td className="mfe-td-money mfe-td-comision">{formatMoney(d.comisiones)}</td>
                        <td className="mfe-td-money mfe-td-neto">{formatMoney(d.ingresosNetos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SECCIÓN 3: Gráfico de Barras ─────────────────── */}
          {chartData.length > 0 && (
            <div className="mfe-section">
              <h3>📊 Ingresos por Tipo de Entrada</h3>
              <div className="mfe-chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      formatter={(val) => formatMoney(val)}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="brutos" name="Brutos" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                    <Bar dataKey="netos" name="Netos" radius={[6, 6, 0, 0]} fill="#22c55e" opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── SECCIÓN 4: Top Compradores ────────────────────── */}
          {topCompradores.length > 0 && (
            <div className="mfe-section">
              <h3>🏆 Top 5 Compradores</h3>
              <div className="mfe-top-list">
                {topCompradores.map((c, i) => (
                  <div key={c.userId || i} className="mfe-top-item">
                    <span className="mfe-top-rank">#{i + 1}</span>
                    <div className="mfe-top-info">
                      <span className="mfe-top-user">👤 {c.userId?.slice(0, 8)}...</span>
                      <span className="mfe-top-tickets">{c.ticketsComprados} tickets</span>
                    </div>
                    <span className="mfe-top-gasto">{formatMoney(c.gastoTotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECCIÓN 5: Acciones ──────────────────────────── */}
          <div className="mfe-section mfe-acciones-section">
            <h3>⚡ Acciones</h3>
            <div className="mfe-acciones-grid">
              {/* TIC-36: Exportar */}
              <button className="mfe-action-btn mfe-action-export" onClick={() => handleExport('financial')} disabled={exportando === 'financial'}>
                📥 {exportando === 'financial' ? 'Exportando...' : 'Exportar Reporte CSV'}
              </button>
              <button className="mfe-action-btn mfe-action-export" onClick={() => handleExport('buyers')} disabled={exportando === 'buyers'}>
                📥 {exportando === 'buyers' ? 'Exportando...' : 'Exportar Compradores CSV'}
              </button>

              {/* TIC-33: Compradores */}
              <button className="mfe-action-btn mfe-action-compradores" onClick={() => setShowCompradores(true)}>
                👥 Ver Lista de Compradores
              </button>

              {/* Editar */}
              <Link to={`/dashboard/evento/${evento.id}/editar`} className="mfe-action-btn mfe-action-editar">
                ✏️ Editar Evento
              </Link>

              {/* TIC-35: Próximamente */}
              <button className="mfe-action-btn mfe-action-disabled" disabled title="Próximamente">
                🏷️ Crear Código de Descuento
                <span className="mfe-proximamente">Próximamente</span>
              </button>

              {/* TIC-570: Próximamente */}
              <button className="mfe-action-btn mfe-action-disabled" disabled title="Próximamente">
                ⭐ Destacar Evento
                <span className="mfe-proximamente">Próximamente</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalFinancieroEvento;
