import { useState, useEffect, useCallback } from 'react';
import PromotorService from '../../../services/promotorService';
import './ListaCompradoresModal.css';

function ListaCompradoresModal({ eventId, eventoNombre, onClose, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await PromotorService.getEventBuyers(eventId, { page, search });
      setData(result);
    } catch (err) {
      console.error('Error cargando compradores:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, page, search]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatMoney = (n) => `Bs. ${Number(n || 0).toLocaleString('es-BO')}`;

  const statusLabel = (s) => {
    switch (s) {
      case 'active': return { label: 'Activa', cls: 'lcm-status-active' };
      case 'used': return { label: 'Usada', cls: 'lcm-status-used' };
      case 'cancelled': return { label: 'Cancelada', cls: 'lcm-status-cancelled' };
      case 'refunded': return { label: 'Reembolsada', cls: 'lcm-status-refunded' };
      default: return { label: s, cls: '' };
    }
  };

  const pag = data?.paginacion || {};
  const totalPages = pag.total_pages || 1;

  return (
    <div className="lcm-overlay" onClick={onClose}>
      <div className="lcm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="lcm-header">
          <div className="lcm-header-left">
            {onBack && (
              <button className="lcm-back" onClick={onBack}>← Volver</button>
            )}
            <div>
              <h2>👥 Lista de Compradores</h2>
              <p className="lcm-evento-nombre">{eventoNombre}</p>
            </div>
          </div>
          <button className="lcm-close" onClick={onClose}>✕</button>
        </div>

        {/* Resumen */}
        {data?.resumen && (
          <div className="lcm-resumen">
            <div className="lcm-resumen-item">
              <span className="lcm-res-label">Total Compradores</span>
              <span className="lcm-res-value">{data.resumen.total_compradores || pag.count || 0}</span>
            </div>
            <div className="lcm-resumen-item">
              <span className="lcm-res-label">Tickets Vendidos</span>
              <span className="lcm-res-value">{data.resumen.total_tickets || 0}</span>
            </div>
            <div className="lcm-resumen-item">
              <span className="lcm-res-label">Ingreso Total</span>
              <span className="lcm-res-value">{formatMoney(data.resumen.total_ingreso)}</span>
            </div>
          </div>
        )}

        {/* Búsqueda */}
        <form className="lcm-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Buscar por ID de usuario..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="lcm-search-input"
          />
          <button type="submit" className="lcm-search-btn">🔍</button>
        </form>

        {/* Tabla */}
        <div className="lcm-table-wrap">
          {loading ? (
            <div className="lcm-loading">
              <div className="lcm-spinner" />
              <span>Cargando compradores...</span>
            </div>
          ) : !data?.resultados?.length ? (
            <div className="lcm-empty">
              <span>📭</span>
              <p>No se encontraron compradores</p>
            </div>
          ) : (
            <table className="lcm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Usuario</th>
                  <th>Tipo Entrada</th>
                  <th>Zona</th>
                  <th>Cant.</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Código</th>
                </tr>
              </thead>
              <tbody>
                {data.resultados.map((c, i) => {
                  const st = statusLabel(c.estado);
                  return (
                    <tr key={c.id || i}>
                      <td className="lcm-td-num">{(page - 1) * 10 + i + 1}</td>
                      <td className="lcm-td-user">👤 {c.userId?.slice(0, 8)}...</td>
                      <td>{c.tipoEntrada}</td>
                      <td>{c.zona}</td>
                      <td className="lcm-td-center">{c.cantidad}</td>
                      <td className="lcm-td-money">{formatMoney(c.precioTotal)}</td>
                      <td><span className={`lcm-status ${st.cls}`}>{st.label}</span></td>
                      <td className="lcm-td-fecha">{formatDate(c.fecha)}</td>
                      <td className="lcm-td-code">{c.codigoBackup || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="lcm-pagination">
            <button
              className="lcm-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Anterior
            </button>
            <span className="lcm-page-info">
              Página {page} de {totalPages}
            </span>
            <button
              className="lcm-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaCompradoresModal;
