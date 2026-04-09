import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserTickets, downloadPurchasePDF } from '../services/profileService';
import './MisCompras.css';

const STATUS_LABELS = {
  active: { label: 'Completada', className: 'badge-completada', icon: '✅' },
  used: { label: 'Utilizada', className: 'badge-utilizada', icon: '🎟️' },
  pending: { label: 'Pendiente', className: 'badge-pendiente', icon: '⏳' },
  cancelled: { label: 'Cancelada', className: 'badge-cancelada', icon: '❌' },
};

export default function MisCompras() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortType, setSortType] = useState('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);
  const [descargando, setDescargando] = useState(false);

  const cargar = async (p = 1, statusFilter = '', sort = sortBy, order = sortType) => {
    setLoading(true);
    try {
      const data = await getUserTickets({
        page: p,
        page_size: 10,
        status: statusFilter || undefined,
        sortBy: sort,
        sortType: order,
      });
      setPurchases(data.results || []);
      setTotalPages(data.total_pages || 1);
      setCount(data.count || 0);
      setPage(data.page || 1);
    } catch (err) {
      console.error('Error cargando compras:', err);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar(1, filtro, sortBy, sortType);
  }, [filtro, sortBy, sortType]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortType(prev => prev === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortBy(field);
      setSortType('DESC');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕';
    return sortType === 'DESC' ? '↓' : '↑';
  };

  const handleDescargar = async (purchase) => {
    setDescargando(true);
    try {
      await downloadPurchasePDF(purchase.id, purchase.event_name);
    } catch (err) {
      alert(err.message || 'Error al descargar la entrada.');
    } finally {
      setDescargando(false);
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return d; }
  };

  const formatDateTime = (d) => {
    try {
      return new Date(d).toLocaleString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return d; }
  };

const getBadge = (status) => {
  const info = STATUS_LABELS[status] || {
    label: status,
    className: 'badge-default',
    icon: '❓'
  };

  return (
    <span className={`compra-badge ${info.className}`}>
      {info.icon} {info.label}
    </span>
  );
};

  return (
    <section className="mis-compras-page">
      <header className="mis-compras-header">
        <div>
          <h2>Mis Compras</h2>
          <p>Consulta el historial de tus compras y revisa detalles de cada entrada.</p>
        </div>
        <Link to="/dashboard" className="btn-secundario small">Volver al Dashboard</Link>
      </header>

      <div className="mis-compras-filtros">
        <button className={`filtro-btn ${filtro === '' ? 'activo' : ''}`} onClick={() => setFiltro('')}>
          Todas ({count})
        </button>
        <button className={`filtro-btn ${filtro === 'active' ? 'activo' : ''}`} onClick={() => setFiltro('active')}>
          Completadas
        </button>
        <button className={`filtro-btn ${filtro === 'used' ? 'activo' : ''}`} onClick={() => setFiltro('used')}>
          Utilizadas
        </button>
        <button className={`filtro-btn ${filtro === 'pending' ? 'activo' : ''}`} onClick={() => setFiltro('pending')}>
          Pendientes
        </button>
        <button className={`filtro-btn ${filtro === 'cancelled' ? 'activo' : ''}`} onClick={() => setFiltro('cancelled')}>
          Canceladas
        </button>
      </div>

      <div className="mis-compras-filtros" style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: '#888', marginRight: 4 }}>Ordenar por:</span>
        <button className={`filtro-btn ${sortBy === 'created_at' ? 'activo' : ''}`} onClick={() => toggleSort('created_at')}>
          Fecha {getSortIcon('created_at')}
        </button>
        <button className={`filtro-btn ${sortBy === 'total_price' ? 'activo' : ''}`} onClick={() => toggleSort('total_price')}>
          Precio {getSortIcon('total_price')}
        </button>
        <button className={`filtro-btn ${sortBy === 'event_name' ? 'activo' : ''}`} onClick={() => toggleSort('event_name')}>
          Evento {getSortIcon('event_name')}
        </button>
        <button className={`filtro-btn ${sortBy === 'status' ? 'activo' : ''}`} onClick={() => toggleSort('status')}>
          Estado {getSortIcon('status')}
        </button>
      </div>

      <div className="mis-compras-grid">
        <div className="compras-list">
          {loading ? (
            <div className="compras-loading">
              <div className="spinner"></div>
              <p>Cargando historial...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="compras-empty">
              <span className="empty-icon">🎫</span>
              <h3>No tienes compras {filtro ? `con estado "${STATUS_LABELS[filtro]?.label || filtro}"` : 'registradas'}</h3>
              <p>Cuando adquieras entradas para un evento, aparecerán aquí.</p>
              <Link to="/dashboard" className="btn-principal small">Explorar eventos</Link>
            </div>
          ) : (
            <>
              {purchases.map(p => (
                <div
                  className={`compra-card ${selected?.id === p.id ? 'compra-card-selected' : ''}`}
                  key={p.id}
                  onClick={() => setSelected(p)}
                >
                  <div className="compra-main">
                    <div className="compra-title">{p.event_name}</div>
                    <div className="compra-meta">
                      {formatDate(p.event_date)} · {p.ticket_type} · {p.zone_type?.toUpperCase()}
                    </div>
                    <div className="compra-fecha-compra">Comprado: {formatDateTime(p.created_at)}</div>
                  </div>
                  <div className="compra-right">
                    {getBadge(p.status)}
                    <div className="compra-amount">Bs. {p.total_price}</div>
                  </div>
                </div>
              ))}
              {totalPages > 1 && (
                <div className="compras-pagination">
                  <button disabled={page <= 1} onClick={() => cargar(page - 1, filtro, sortBy, sortType)}>← Anterior</button>
                  <span>Página {page} de {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => cargar(page + 1, filtro, sortBy, sortType)}>Siguiente →</button>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="compra-detalle">
          {selected ? (
            <div className="detalle-content">
              <h3>Detalle de la compra</h3>
              {getBadge(selected.status)}

              <div className="detalle-section">
                <h4>Evento</h4>
                <p className="detalle-evento-nombre">{selected.event_name}</p>
                <p>📅 {formatDate(selected.event_date)} {selected.event_time ? `· 🕐 ${selected.event_time}` : ''}</p>
                <p>📍 {selected.event_location || 'Ubicación no disponible'}</p>
              </div>

              <div className="detalle-section">
                <h4>Entrada</h4>
                <p><strong>Tipo:</strong> {selected.ticket_type}</p>
                <p><strong>Zona:</strong> {selected.zone_type?.toUpperCase()}</p>
                <p><strong>Cantidad:</strong> {selected.quantity}</p>
                <p><strong>Total pagado:</strong> Bs. {selected.total_price}</p>
              </div>

              <div className="detalle-section">
                <h4>Código de acceso</h4>
                <div className="detalle-codigo">{selected.backup_code || 'N/A'}</div>
                {selected.qr_code && (
                  <div className="detalle-qr">
                    <img src={`data:image/png;base64,${selected.qr_code}`} alt="QR de entrada" />
                  </div>
                )}
              </div>

              <div className="detalle-section detalle-meta">
                <p><strong>Fecha de compra:</strong> {formatDateTime(selected.created_at)}</p>
                {selected.used_at && <p><strong>Utilizada:</strong> {formatDateTime(selected.used_at)}</p>}
                <p><strong>ID:</strong> <code>{selected.id}</code></p>
              </div>

              <div className="detalle-acciones">
                {selected.status !== 'cancelled' && (
                  <button
                    className="btn-principal"
                    onClick={() => handleDescargar(selected)}
                    disabled={descargando}
                  >
                    {descargando ? 'Descargando...' : '📄 Descargar entrada PDF'}
                  </button>
                )}
                <button className="btn-secundario" onClick={() => setSelected(null)}>Cerrar</button>
              </div>
            </div>
          ) : (
            <div className="detalle-placeholder">
              <span className="placeholder-icon">👈</span>
              <h3>Selecciona una compra</h3>
              <p>Haz clic en una tarjeta de la izquierda para ver los detalles completos, el código QR y descargar tu entrada.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
