'use client';

import { useState, useEffect } from 'react';
import { adminEventsService } from '../../../services/adminEventsService';
import './AdminEventsTable.css';

function AdminEventsTable() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionMessage, setActionMessage] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    borradores: 0,
    cancelados: 0,
    suspendidos: 0
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [takedownReason, setTakedownReason] = useState('');
  const [takedownError, setTakedownError] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'event_date', direction: 'desc' });

  useEffect(() => {
    cargarEventos();
    cargarEstadisticas();
  }, []);

  const cargarEventos = async () => {
    try {
      setLoading(true);
      const allEvents = await adminEventsService.getAllEvents();
      setEvents(Array.isArray(allEvents) ? allEvents : []);
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('❌ Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const stats = await adminEventsService.getEventStats();
      setStats(stats);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const mostrarMensaje = (mensaje) => {
    setActionMessage(mensaje);
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleTakedown = async () => {
    try {
      if (!takedownReason.trim()) {
        // Mostrar mensaje en el propio modal (mas visible que el banner de fondo)
        setTakedownError('Debes seleccionar una razón antes de confirmar la baja.');
        return;
      }
      setTakedownError('');

      await adminEventsService.takedownEvent(selectedEvent.id, takedownReason);
      mostrarMensaje('✅ Evento dado de baja correctamente');
      setModalOpen(false);
      setTakedownReason('');
      setAdditionalDetails('');
      await cargarEventos();
      await cargarEstadisticas();
    } catch (error) {
      setTakedownError(`❌ ${error?.message || 'Error al dar de baja el evento'}`);
    }
  };

  const handleReactivate = async (eventId) => {
    try {
      await adminEventsService.reactivateEvent(eventId);
      mostrarMensaje('✅ Evento reactivado correctamente');
      await cargarEventos();
      await cargarEstadisticas();
    } catch (error) {
      mostrarMensaje('❌ Error al reactivar evento');
    }
  };

  // Filtrar eventos
  const filteredEvents = events
    .filter(event => {
      const matchesSearch =
        event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' || event.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { label: 'Activo', color: 'success' },
      draft: { label: 'Borrador', color: 'warning' },
      cancelled: { label: 'Cancelado', color: 'danger' },
      suspended: { label: 'Dado de Baja', color: 'error' },
      completed: { label: 'Finalizado', color: 'info' }
    };

    const config = statusConfig[status] || { label: status, color: 'secondary' };

    return (
      <span className={`status-badge status-${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    const icons = {
      published: '✓',
      draft: '📝',
      cancelled: '✕',
      suspended: '🚫',
      completed: '✓'
    };
    return icons[status] || '•';
  };

  const openTakedownModal = (event) => {
    setSelectedEvent(event);
    setModalAction('takedown');
    setModalOpen(true);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="admin-events-container loading">
        <div className="spinner"></div>
        <p>Cargando eventos...</p>
      </div>
    );
  }

  return (
    <div className="admin-events-container">
      {actionMessage && (
        <div className={`action-message ${actionMessage.includes('✅') ? 'success' : 'error'}`}>
          {actionMessage}
        </div>
      )}

      {/* Estadísticas */}
      <div className="events-stats">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h4>{stats.total || events.length}</h4>
            <p>Total de eventos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <h4>{stats.activos || events.filter(e => e.status === 'published').length}</h4>
            <p>Activos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <h4>{stats.borradores || events.filter(e => e.status === 'draft').length}</h4>
            <p>Borradores</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-info">
            <h4>{stats.suspendidos || events.filter(e => e.status === 'suspended').length}</h4>
            <p>Dados de baja</p>
          </div>
        </div>
      </div>

      {/* Controles de búsqueda y filtrado */}
      <div className="table-controls">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Buscar evento por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los estados</option>
            <option value="published">Activos</option>
            <option value="draft">Borradores</option>
            <option value="suspended">Dados de baja</option>
            <option value="completed">Finalizados</option>
          </select>
        </div>
        <div className="table-summary">
          Mostrando {filteredEvents.length} de {events.length} eventos
        </div>
      </div>

      {/* Tabla de eventos */}
      <div className="table-wrapper">
        <table className="events-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Nombre {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('event_date')} className="sortable">
                Fecha {sortConfig.key === 'event_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Promotor</th>
              <th>Ubicación</th>
              <th>Capacidad</th>
              <th onClick={() => handleSort('status')} className="sortable">
                Estado {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <tr key={event.id} className={`event-row status-${event.status}`}>
                  <td className="event-name">
                    <div className="name-content">
                      <span className="status-icon">{getStatusIcon(event.status)}</span>
                      <div>
                        <p className="name">{event.name}</p>
                        <p className="description">{event.description?.substring(0, 50)}...</p>
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(event.event_date)}</td>
                  <td>
                    <span className="promoter">{event.promoter_id || 'N/A'}</span>
                  </td>
                  <td>{event.location}</td>
                  <td>
                    <span className="capacity">{event.capacity}</span>
                  </td>
                  <td>{getStatusBadge(event.status)}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-action btn-edit"
                      title="Editar evento"
                      onClick={() => window.location.href = `/admin/evento/${event.id}/editar`}
                    >
                      ✏️
                    </button>
                    {event.status === 'published' && (
                      <button
                        className="btn-action btn-takedown"
                        title="Dar de baja"
                        onClick={() => openTakedownModal(event)}
                      >
                        🚫
                      </button>
                    )}
                    {event.status === 'suspended' && (
                      <button
                        className="btn-action btn-reactivate"
                        title="Reactivar"
                        onClick={() => handleReactivate(event.id)}
                      >
                        ✓
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  No se encontraron eventos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para dar de baja evento */}
      {modalOpen && modalAction === 'takedown' && selectedEvent && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚫 Dar de Baja Evento</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p className="event-title">{selectedEvent.name}</p>
              <div className="form-group">
                <label>Razón de baja (obligatoria):</label>
                <select
                  value={takedownReason}
                  onChange={(e) => { setTakedownReason(e.target.value); setTakedownError(''); }}
                  className={`reason-select ${takedownError ? 'has-error' : ''}`}
                  style={takedownError ? { borderColor: '#ef4444' } : undefined}
                >
                  <option value="">-- Selecciona una razón --</option>
                  <option value="Violación de términos de uso">Violación de términos de uso</option>
                  <option value="Contenido inapropiado">Contenido inapropiado</option>
                  <option value="Requerimiento legal">Requerimiento legal</option>
                  <option value="Información fraudulenta">Información fraudulenta</option>
                  <option value="Violación de propiedad intelectual">Violación de propiedad intelectual</option>
                  <option value="Evento duplicado">Evento duplicado</option>
                  <option value="Otro incumplimiento">Otro incumplimiento</option>
                </select>
                {takedownError && (
                  <p style={{
                    color: '#fca5a5',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    margin: '8px 0 0 0',
                    fontSize: '0.88rem',
                  }}>
                    ⚠️ {takedownError}
                  </p>
                )}
                <textarea
                  placeholder="Detalles adicionales (opcional)..."
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  className="reason-textarea"
                  rows="4"
                />
              </div>
              <p className="warning-text">
                ⚠️ Esta acción dará de baja el evento. El promotor recibirá notificación.
              </p>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => { setModalOpen(false); setTakedownError(''); }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleTakedown}
                className="btn btn-danger"
              >
                Confirmar Baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEventsTable;
