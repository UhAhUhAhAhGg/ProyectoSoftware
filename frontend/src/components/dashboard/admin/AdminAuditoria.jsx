'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminAuditService } from '../../../services/adminAuditService';
import './AdminAuditoria.css';

function AdminAuditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionType, setActionType] = useState('');
  const [adminId, setAdminId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  const [actionTypes, setActionTypes] = useState([]);
  const [admins, setAdmins] = useState([]);

  const ordering = useMemo(() => {
    return (sortConfig.direction === 'desc' ? '-' : '') + (sortConfig.key || 'timestamp');
  }, [sortConfig]);

  useEffect(() => {
    cargarFiltros();
  }, []);

  useEffect(() => {
    cargarLogs();
  }, [page, pageSize, dateFrom, dateTo, actionType, adminId, searchTerm, ordering]);

  const cargarFiltros = async () => {
    try {
      const [types, adminsList] = await Promise.all([
        adminAuditService.getActionTypes(),
        adminAuditService.getAdminsList()
      ]);

      setActionTypes(types || []);
      setAdmins(adminsList || []);
    } catch (err) {
      // fallback silencioso
    }
  };

  const cargarLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await adminAuditService.getAuditLogs({
        page,
        page_size: pageSize,
        start_date: dateFrom || undefined,
        end_date: dateTo || undefined,
        action_type: actionType || undefined,
        admin_id: adminId || undefined,
        search: searchTerm || undefined,
        ordering
      });

      // Backend devuelve { status, total, page, page_size, total_pages, results }
      setLogs(resp.results || resp || []);
      setTotal(resp.total ?? resp.count ?? (resp.results ? resp.results.length : 0));
    } catch (err) {
      console.error('Error cargando logs de auditoría', err);
      setError('No se pudieron cargar los registros. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-audit-container">
      <div className="audit-header">
        <div>
          <h2>Historial de Auditoría</h2>
          <p className="muted">Registro automático de cambios realizados sobre eventos</p>
        </div>
        <button
          type="button"
          className="btn-export-csv"
          onClick={async () => {
            try {
              await adminAuditService.exportToCsv();
            } catch (err) {
              alert('No se pudo exportar el CSV: ' + (err.message || ''));
            }
          }}
        >
          📥 Exportar CSV
        </button>
      </div>

      <div className="audit-filters">
        <div className="filter-row">
          <label>Desde</label>
          <input type="date" value={dateFrom} onChange={e => { setPage(1); setDateFrom(e.target.value); }} />
        </div>
        <div className="filter-row">
          <label>Hasta</label>
          <input type="date" value={dateTo} onChange={e => { setPage(1); setDateTo(e.target.value); }} />
        </div>
        <div className="filter-row">
          <label>Tipo de acción</label>
          <select value={actionType} onChange={e => { setPage(1); setActionType(e.target.value); }}>
            <option value="">Todos</option>
            {actionTypes.map((t) => {
              // soporta tanto strings como {value, label}
              const value = typeof t === 'string' ? t : t.value;
              const label = typeof t === 'string' ? t : t.label;
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
        </div>

        <div className="filter-row">
          <label>Administrador</label>
          <select value={adminId} onChange={e => { setPage(1); setAdminId(e.target.value); }}>
            <option value="">Todos</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.name || a.email || a.username}</option>
            ))}
          </select>
        </div>

        <div className="filter-row search-row">
          <label>Buscar</label>
          <input placeholder="Evento, detalles..." value={searchTerm} onChange={e => { setPage(1); setSearchTerm(e.target.value); }} />
        </div>

        <div className="filter-row page-size-row">
          <label>Filas</label>
          <select value={pageSize} onChange={e => { setPage(1); setPageSize(parseInt(e.target.value)); }}>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="audit-table-wrap">
        {loading ? (
          <div className="loader">Cargando...</div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('timestamp')} className="sortable">Fecha {sortConfig.key === 'timestamp' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('admin')} className="sortable">Administrador {sortConfig.key === 'admin' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('action_type')} className="sortable">Acción {sortConfig.key === 'action_type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Evento</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={5} className="no-results">No se encontraron registros</td></tr>
              )}
              {logs.map((log) => {
                // Backend devuelve: id, event_id, event_name, admin_id, admin_email,
                // action, reason, changed_fields, old_status, new_status, created_at
                const actionLabels = {
                  edit: 'Edición',
                  deactivate: 'Baja',
                  reactivate: 'Reactivación',
                };
                const cambiosTexto = log.changed_fields
                  ? Object.entries(log.changed_fields)
                      .map(([campo, vals]) => `${campo}: "${vals.antes ?? '-'}" → "${vals.despues ?? '-'}"`)
                      .join(' | ')
                  : log.reason || '-';
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.admin_email || 'Sistema'}</td>
                    <td>
                      <span className={`action-pill action-${log.action}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td>{log.event_name || '-'}</td>
                    <td><div className="details-cell">{cambiosTexto}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="audit-pagination">
        <div className="pagination-info">Mostrando {Math.min((page - 1) * pageSize + 1, total)} - {Math.min(page * pageSize, total)} de {total}</div>
        <div className="pagination-controls">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
          <span className="page-indicator">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}

export default AdminAuditoria;
