import { useState, useEffect, useCallback } from 'react';
import PromotorService from '../../../services/promotorService';
import { authService } from '../../../services/authService';
import './ListaCompradoresModal.css';

function ListaCompradoresModal({ eventId, eventoNombre, onClose, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('all');
  const [ordering, setOrdering] = useState('-created_at');
  const [buyerNames, setBuyerNames] = useState({});
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await PromotorService.getEventBuyers(eventId, { page, search, status: statusFiltro, ordering });
      setData(result);
    } catch (err) {
      console.error('Error cargando compradores:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, page, search, statusFiltro, ordering]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const fetchNames = async () => {
      const resultados = data?.resultados || [];
      const userIds = [...new Set(resultados.map(r => r.userId).filter(Boolean))];
      if (userIds.length === 0) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      const newNames = { ...buyerNames };
      let updated = false;

      const fetchPromises = userIds.map(async (id) => {
        if (newNames[id]) return;
        try {
          const userData = await authService.getUserById(id, token);
          const profile = userData.profile || {};
          const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
          newNames[id] = {
            nombre: fullName || 'Sin nombre',
            email: userData.email,
          };
          updated = true;
        } catch (e) {
          console.error(`Error fetching user ${id}:`, e);
          newNames[id] = { nombre: 'Desconocido', email: 'Desconocido' };
          updated = true;
        }
      });

      await Promise.all(fetchPromises);
      if (updated) setBuyerNames(newNames);
    };

    fetchNames();
  }, [data]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatMoney = (n) => `Bs. ${Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

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
              <span className="lcm-res-label">Ingreso Total (Bruto)</span>
              <span className="lcm-res-value">{formatMoney(data.resumen.total_ingreso)}</span>
            </div>
          </div>
        )}

        {/* Filtros y Búsqueda */}
        <div className="lcm-filters-row">
          <form className="lcm-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="lcm-search-input"
            />
            <button type="submit" className="lcm-search-btn">🔍</button>
          </form>

          <div className="lcm-filters-group">
            <select
              className="lcm-select"
              value={statusFiltro}
              onChange={(e) => { setStatusFiltro(e.target.value); setPage(1); }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="used">Usadas</option>
              <option value="cancelled">Canceladas</option>
            </select>

            <select
              className="lcm-select"
              value={ordering}
              onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
            >
              <option value="-created_at">Más recientes</option>
              <option value="created_at">Más antiguos</option>
              <option value="-total_price">Mayor pago</option>
              <option value="-quantity">Mayor cantidad</option>
            </select>
          </div>
        </div>

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
                  <th>Correo</th>
                  <th>Tipo Entrada</th>
                  <th>Cant.</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.resultados.map((c, i) => {
                  const st = statusLabel(c.estado);
                  const bName = buyerNames[c.userId];
                  return (
                    <tr key={c.id || i} className="lcm-row-clickable" onClick={() => setSelectedPurchase(c)}>
                      <td className="lcm-td-num">{(page - 1) * 10 + i + 1}</td>
                      <td className="lcm-td-user">👤 {bName ? bName.nombre : `${c.userId.slice(0,8)}...`}</td>
                      <td className="lcm-td-email">{bName ? bName.email : '—'}</td>
                      <td>{c.tipoEntrada}</td>
                      <td className="lcm-td-center">{c.cantidad}</td>
                      <td className="lcm-td-money">{formatMoney(c.precioTotal)}</td>
                      <td><span className={`lcm-status ${st.cls}`}>{st.label}</span></td>
                      <td className="lcm-td-fecha">{formatDate(c.fecha)}</td>
                      <td>
                        <button className="lcm-btn-info" onClick={(e) => { e.stopPropagation(); setSelectedPurchase(c); }}>
                          📄 Detalles
                        </button>
                      </td>
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

      {/* Modal de Detalles de Compra */}
      {selectedPurchase && (
        <div className="lcm-overlay" style={{ zIndex: 1100 }} onClick={() => setSelectedPurchase(null)}>
          <div className="lcm-modal lcm-modal-details" onClick={e => e.stopPropagation()}>
            <div className="lcm-header">
              <h2>📄 Detalle de Venta</h2>
              <button className="lcm-close" onClick={() => setSelectedPurchase(null)}>✕</button>
            </div>
            <div className="lcm-details-body">
              <div className="lcm-detail-group">
                <h3>Datos del Comprador</h3>
                <p><strong>Nombre:</strong> {buyerNames[selectedPurchase.userId]?.nombre || 'Desconocido'}</p>
                <p><strong>Correo:</strong> {buyerNames[selectedPurchase.userId]?.email || 'Desconocido'}</p>
                <p><strong>ID Usuario:</strong> {selectedPurchase.userId}</p>
              </div>

              <div className="lcm-detail-group">
                <h3>Detalles de la Entrada</h3>
                <p><strong>Tipo:</strong> {selectedPurchase.tipoEntrada}</p>
                <p><strong>Zona:</strong> {selectedPurchase.zona}</p>
                <p><strong>Cantidad Comprada:</strong> {selectedPurchase.cantidad} tickets</p>
                <p><strong>ID Compra:</strong> {selectedPurchase.id}</p>
              </div>

              <div className="lcm-detail-group">
                <h3>Información Financiera</h3>
                <p><strong>Descuento Aplicado:</strong> {selectedPurchase.descuentoAplicado > 0 ? formatMoney(selectedPurchase.descuentoAplicado) : 'Ninguno'}</p>
                <p><strong>Total Pagado:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{formatMoney(selectedPurchase.precioTotal)}</span></p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>(Este monto es el Bruto que pagó el cliente)</p>
              </div>

              <div className="lcm-detail-group">
                <h3>Estado y Acceso</h3>
                <p><strong>Estado:</strong> <span className={`lcm-status ${statusLabel(selectedPurchase.estado).cls}`}>{statusLabel(selectedPurchase.estado).label}</span></p>
                <p><strong>Fecha de Compra:</strong> {formatDate(selectedPurchase.fecha)}</p>
                <p><strong>Código de Acceso (Backup):</strong> {selectedPurchase.codigoBackup || 'No generado'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListaCompradoresModal;
