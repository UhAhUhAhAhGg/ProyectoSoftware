import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import PromotorService from '../../../services/promotorService';
import { useAuth } from '../../../context/AuthContext';
import EventoCardFinanciero from './EventoCardFinanciero';
import ModalFinancieroEvento from './ModalFinancieroEvento';
import FormularioEvento from './FormularioEvento';
import ConfiguracionCola from './ConfiguracionCola';
import './ListaEventos.css';

function ListaEventos() {
  const { user } = useAuth();
  const location = useLocation();
  const [eventos, setEventos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [eventoAEliminar, setEventoAEliminar] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [eventoDetalle, setEventoDetalle] = useState(null);
  const [eventoAEditarId, setEventoAEditarId] = useState(null);

  // Modal financiero
  const [modalEvento, setModalEvento] = useState(null);
  const [modalFinanciero, setModalFinanciero] = useState(null);

  useEffect(() => {
    fetchEventos();
  }, [user]);

  const fetchEventos = async () => {
    setCargando(true);
    try {
      const eventosData = await eventosService.getEventosByPromotor(user?.id);
      setEventos(eventosData);
    } catch {
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const openId = location.state?.openEventId;
    if (openId && eventos.length > 0) {
      const ev = eventos.find(e => e.id === openId);
      if (ev) {
        PromotorService.getEventReport(openId)
          .then(data => {
            setModalEvento(ev);
            setModalFinanciero(data);
            // Limpiar state para que no se reabra si el user cierra el modal y recarga
            window.history.replaceState({}, document.title);
          })
          .catch(() => {
            setModalEvento(ev);
            setModalFinanciero(null);
            window.history.replaceState({}, document.title);
          });
      }
    }
  }, [location.state, eventos]);

  const cargarEventos = fetchEventos; // alias de compatibilidad

  const handleEliminarClick = (evento) => {
    setEventoAEliminar(evento);
    setMostrarModal(true);
  };

  const confirmarEliminar = async () => {
    if (eventoAEliminar) {
      try {
        await eventosService.eliminarEvento(eventoAEliminar.id);
      } catch (err) {
        alert(err.message || 'No se pudo cancelar el evento.');
      }
      fetchEventos();
      setMostrarModal(false);
      setEventoAEliminar(null);
    }
  };

  const cancelarEliminar = () => {
    setMostrarModal(false);
    setEventoAEliminar(null);
  };

  const handleRestaurar = async (id) => {
    try {
      await eventosService.actualizarEvento(id, { status: 'published' });
    } catch (err) {
      alert(err.message || 'No se pudo restaurar el evento.');
    }
    fetchEventos();
  };

  const getRangoPrecios = (evento) => {
    if (!evento.tiposEntrada || evento.tiposEntrada.length === 0) return 'Sin entradas';
    const activos = evento.tiposEntrada.filter(t => t.estado === 'activo');
    if (activos.length === 0) return 'Sin entradas activas';
    const precios = activos.map(t => t.precio);
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    return min === max ? `Desde $${min}` : `$${min} - $${max}`;
  };

  const handleVerDetalle = (evento, financiero) => {
    setModalEvento(evento);
    setModalFinanciero(financiero);
  };

  const handleCloseModal = () => {
    setModalEvento(null);
    setModalFinanciero(null);
  };

  // Filtrar eventos
  const eventosFiltrados = eventos.filter(evento => {
    if (filtro !== 'todos' && evento.estado !== filtro) return false;
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      return evento.nombre.toLowerCase().includes(termino) ||
             (evento.ubicacion || '').toLowerCase().includes(termino) ||
             (evento.ciudad || '').toLowerCase().includes(termino);
    }
    return true;
  });

  // Contadores por estado
  const contadores = {
    todos: eventos.length,
    activo: eventos.filter(e => e.estado === 'activo').length,
    finalizado: eventos.filter(e => e.estado === 'finalizado').length,
    cancelado: eventos.filter(e => e.estado === 'cancelado').length,
  };

  if (cargando) {
    return (
      <div className="lista-eventos-loading">
        <div className="spinner"></div>
        <p>Cargando tus eventos...</p>
      </div>
    );
  }

  return (
    <div className="lista-eventos">
      {/* Header con acciones */}
      <div className="eventos-header">
        <div className="header-left">
          <Link to="/dashboard" className="btn-volver-dashboard">← Volver al dashboard</Link>
          <h2>Mis Eventos</h2>
          <p className="eventos-count">{eventosFiltrados.length} eventos encontrados</p>
        </div>
        <div className="header-right">
          <Link to="/dashboard/crear-evento" className="btn-crear-evento">
            <span className="btn-icono">➕</span>
            Crear Nuevo Evento
          </Link>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="eventos-filtros">
        <div className="busqueda-container">
          <span className="busqueda-icono">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="busqueda-input"
          />
        </div>

        <div className="filtros-tabs">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'activo', label: 'Activos' },
            { key: 'finalizado', label: 'Finalizados' },
            { key: 'cancelado', label: 'Cancelados' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`filtro-tab ${filtro === tab.key ? 'activo' : ''}`}
              onClick={() => setFiltro(tab.key)}
            >
              {tab.label}
              <span className="filtro-count">{contadores[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de eventos — tarjetas horizontales */}
      {eventosFiltrados.length === 0 ? (
        <div className="no-eventos">
          <div className="no-eventos-icono">📅</div>
          <h3>No hay eventos para mostrar</h3>
          <p>Crea tu primer evento para comenzar a vender boletos</p>
          <Link to="/dashboard/crear-evento" className="btn-primario">
            Crear Evento
          </Link>
        </div>
      ) : (
        <div className="eventos-list-vertical">
          {eventosFiltrados.map(evento => (
            <EventoCardFinanciero
              key={evento.id}
              evento={evento}
              onVerDetalle={handleVerDetalle}
              onVerDetalleGeneral={(ev) => setEventoDetalle(ev)}
              onEditar={(id) => setEventoAEditarId(id)}
              onEliminar={handleEliminarClick}
              onRestaurar={handleRestaurar}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cancelarEliminar}>
          <div className="modal-confirmar" onClick={e => e.stopPropagation()}>
            <div className="modal-icono">⚠️</div>
            <h3>¿Cancelar evento?</h3>
            <p>
              ¿Estás seguro que deseas cancelar el evento <strong>"{eventoAEliminar?.nombre}"</strong>?
            </p>
            <p className="modal-advertencia">
              Esta acción no se puede deshacer y los compradores serán notificados.
            </p>
            <div className="modal-acciones">
              <button className="btn-cancelar" onClick={cancelarEliminar}>
                No, mantener
              </button>
              <button className="btn-confirmar" onClick={confirmarEliminar}>
                Sí, cancelar evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Financiero Detalle (TIC-30 + TIC-33 + TIC-36) */}
      {modalEvento && (
        <ModalFinancieroEvento
          evento={modalEvento}
          financiero={modalFinanciero}
          onClose={handleCloseModal}
        />
      )}

      {/* Modal Detalles del Evento (Miniventana) */}
      {eventoDetalle && (
        <DetalleEventoModal 
          evento={eventoDetalle} 
          onClose={() => setEventoDetalle(null)}
          getRangoPrecios={getRangoPrecios}
          user={user}
        />
      )}

      {/* Modal Editar Evento */}
      {eventoAEditarId && (
        <div
          className="modal-overlay modal-overlay-scroll"
          style={{ zIndex: 1000 }}
          onClick={() => setEventoAEditarId(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              maxWidth: '1050px',
              width: '95%',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setEventoAEditarId(null)}
              style={{
                position: 'absolute', top: '14px', right: '18px',
                background: 'none', border: 'none', fontSize: '2rem',
                cursor: 'pointer', zIndex: 1001, color: '#64748b', lineHeight: 1,
              }}
              title="Cerrar"
            >&times;</button>
            <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <FormularioEvento
                eventId={eventoAEditarId}
                onClose={() => {
                  setEventoAEditarId(null);
                  fetchEventos();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetalleEventoModal({ evento, onClose, getRangoPrecios, user }) {
  const activos = evento.tiposEntrada?.filter(t => t.estado === 'activo') || [];

  return (
    <div className="modal-overlay modal-overlay-scroll" onClick={onClose}>
      <div
        className="modal-confirmar modal-detalle-evento"
        onClick={e => e.stopPropagation()}
      >
        {/* Header fijo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', color: 'var(--color-marron)', fontSize: '1.2rem' }}>{evento.nombre}</h2>
            {evento.categoriaNombre && (
              <span style={{ display: 'inline-block', background: '#e0e0e0', color: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                🏷️ {evento.categoriaNombre}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#999', marginTop: '-4px', lineHeight: 1 }}>&times;</button>
        </div>

        {/* Imagen compacta */}
        <img
          src={typeof evento.imagen === 'string' ? evento.imagen : 'https://via.placeholder.com/600x180?text=Sin+Imagen'}
          alt={evento.nombre}
          style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
          onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/600x180?text=Sin+Imagen"; }}
        />

        {/* Fecha y ubicación en una sola línea */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '10px', color: 'var(--color-verde-gris)', fontSize: '0.85rem' }}>
          <span>📅 {new Date(evento.fecha).toLocaleDateString('es-ES')} · {evento.hora}</span>
          <span>📍 {evento.ubicacion}, {evento.ciudad}</span>
        </div>

        {/* Descripción limitada a 3 líneas */}
        <p style={{ lineHeight: '1.5', color: 'var(--color-negro)', marginBottom: '12px', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {evento.descripcion}
        </p>

        {/* Tipos de entrada */}
        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Tipos de Entrada</h4>
            <span style={{ fontWeight: 'bold', color: 'var(--color-marron)', fontSize: '0.9rem' }}>{getRangoPrecios(evento)}</span>
          </div>
          {activos.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activos.map(t => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '6px 0', fontSize: '0.88rem' }}>
                  <span>{t.nombre} <small style={{ color: '#888' }}>({t.cupoVendido || 0}/{t.cupoMaximo} vendidos)</small></span>
                  <span style={{ fontWeight: 'bold' }}>${t.precio}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: '6px 0 0', fontStyle: 'italic', color: '#888', fontSize: '0.85rem' }}>No hay entradas creadas.</p>
          )}
        </div>

        {/* Historial de cambios */}
        <div style={{
          background: '#f8f8f8',
          padding: '12px',
          borderRadius: '8px',
          marginTop: '14px',
          marginBottom: '14px'
        }}>
          <h4 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>
            🕘 Historial de Cambios
          </h4>

          <div style={{
            borderBottom: '1px solid #ddd',
            paddingBottom: '8px',
            marginBottom: '8px',
            fontSize: '0.85rem'
          }}>
            <strong>Campo:</strong> Nombre<br />
            <strong>Anterior:</strong> Festival Primavera<br />
            <strong>Nuevo:</strong> Festival Primavera 2026
          </div>

          <div style={{
            borderBottom: '1px solid #ddd',
            paddingBottom: '8px',
            marginBottom: '8px',
            fontSize: '0.85rem'
          }}>
            <strong>Campo:</strong> Capacidad<br />
            <strong>Anterior:</strong> 500<br />
            <strong>Nuevo:</strong> 650
          </div>

          <div style={{
            fontSize: '0.85rem'
          }}>
            <strong>Campo:</strong> Ubicación<br />
            <strong>Anterior:</strong> Teatro Municipal<br />
            <strong>Nuevo:</strong> Arena Central
          </div>
        </div>
        <ConfiguracionCola
          eventoId={evento.id}
          promotorId={evento.promotorId}
          usuarioId={user?.id}
          capacidadEvento={evento.capacidad}
        />
      </div>
    </div>
  );
}

export default ListaEventos;
