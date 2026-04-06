import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import { useAuth } from '../../../context/AuthContext';
import './ListaEventos.css';

function ListaEventos() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [eventoAEliminar, setEventoAEliminar] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [eventoDetalle, setEventoDetalle] = useState(null);

  useEffect(() => {
    cargarEventos();
  }, [user]);

  const cargarEventos = async () => {
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
      cargarEventos();
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
    cargarEventos();
  };

  // Filtrar eventos
  const eventosFiltrados = eventos.filter(evento => {
    // Filtro por estado
    if (filtro !== 'todos' && evento.estado !== filtro) return false;
    
    // Búsqueda por nombre o ubicación
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      return evento.nombre.toLowerCase().includes(termino) ||
             evento.ubicacion.toLowerCase().includes(termino) ||
             evento.ciudad.toLowerCase().includes(termino);
    }
    
    return true;
  });

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'activo':
        return <span className="badge activo">Activo</span>;
      case 'finalizado':
        return <span className="badge finalizado">Finalizado</span>;
      case 'cancelado':
        return <span className="badge cancelado">Cancelado</span>;
      default:
        return <span className="badge">{estado}</span>;
    }
  };

  const getProgresoVentas = (vendidos, capacidad) => {
    return Math.round((vendidos / capacidad) * 100);
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
          <button 
            className={`filtro-tab ${filtro === 'todos' ? 'activo' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Todos
          </button>
          <button 
            className={`filtro-tab ${filtro === 'activo' ? 'activo' : ''}`}
            onClick={() => setFiltro('activo')}
          >
            Activos
          </button>
          <button 
            className={`filtro-tab ${filtro === 'finalizado' ? 'activo' : ''}`}
            onClick={() => setFiltro('finalizado')}
          >
            Finalizados
          </button>
          <button 
            className={`filtro-tab ${filtro === 'cancelado' ? 'activo' : ''}`}
            onClick={() => setFiltro('cancelado')}
          >
            Cancelados
          </button>
        </div>
      </div>

      {/* Grid de eventos */}
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
        <div className="eventos-grid">
          {eventosFiltrados.map(evento => (
            <div key={evento.id} className={`evento-card ${evento.estado}`}>
              <div className="evento-imagen">
                <img 
                  src={typeof evento.imagen === 'string' ? evento.imagen : 'https://via.placeholder.com/300x200?text=Sin+Imagen'} 
                  alt={evento.nombre} 
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x200?text=Sin+Imagen" }}
                />
                <div className="evento-estado-badge">
                  {getEstadoBadge(evento.estado)}
                </div>
              </div>

              <div className="evento-info">
                <h3>{evento.nombre}</h3>
                {evento.categoriaNombre && (
                  <div style={{ display: 'inline-block', background: '#e0e0e0', color: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '10px' }}>
                    🏷️ {evento.categoriaNombre}
                  </div>
                )}
                
                <div className="evento-detalles">
                  <p className="evento-fecha">
                    <span className="detalle-icono">📅</span>
                    {new Date(evento.fecha).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} - {evento.hora}
                  </p>
                  <p className="evento-ubicacion">
                    <span className="detalle-icono">📍</span>
                    {evento.ubicacion}, {evento.ciudad}
                  </p>
                  <p className="evento-descripcion">{evento.descripcion}</p>
                </div>

                <div className="evento-stats">
                  <div className="stat-ventas">
                    <div className="stat-header">
                      <span>Ventas</span>
                      <span className="stat-numero">
                        {evento.boletosVendidos}/{evento.capacidad}
                      </span>
                    </div>
                    <div className="progreso-bar">
                      <div 
                        className="progreso-fill"
                        style={{ width: `${getProgresoVentas(evento.boletosVendidos, evento.capacidad)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="stat-precio">
                    <span className="precio-label">Entradas</span>
                    <span className="precio-valor">{getRangoPrecios(evento)}</span>
                  </div>
                </div>
              </div>

              <div className="evento-acciones">
                <button 
                  onClick={() => setEventoDetalle(evento)} 
                  className="btn-accion ver"
                  title="Ver detalles"
                >
                  👁️
                </button>
                <Link 
                  to={`/dashboard/evento/${evento.id}/editar`} 
                  className="btn-accion editar"
                  title="Editar"
                >
                  ✏️
                </Link>
                {evento.estado === 'activo' ? (
                  <button 
                    className="btn-accion eliminar"
                    onClick={() => handleEliminarClick(evento)}
                    title="Cancelar evento"
                  >
                    🗑️
                  </button>
                ) : evento.estado === 'cancelado' ? (
                  <button 
                    className="btn-accion restaurar"
                    onClick={() => handleRestaurar(evento.id)}
                    title="Restaurar evento"
                  >
                    🔄
                  </button>
                ) : null}
              </div>
            </div>
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
              ¿Estás seguro que deseas cancelar el evento <strong>&quot;{eventoAEliminar?.nombre}&quot;</strong>?
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

      {/* Modal Detalles del Evento (Miniventana) */}
      {eventoDetalle && (
        <DetalleEventoModal 
          evento={eventoDetalle} 
          onClose={() => setEventoDetalle(null)}
          getRangoPrecios={getRangoPrecios}
        />
      )}
    </div>
  );
}

function DetalleEventoModal({ evento, onClose, getRangoPrecios }) {
  const activos = evento.tiposEntrada?.filter(t => t.estado === 'activo') || [];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-confirmar" style={{ maxWidth: '600px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: 'var(--color-marron)' }}>{evento.nombre}</h2>
            {evento.categoriaNombre && (
              <span style={{ display: 'inline-block', background: '#e0e0e0', color: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                🏷️ {evento.categoriaNombre}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999', marginTop: '-5px' }}>&times;</button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
            <img 
              src={typeof evento.imagen === 'string' ? evento.imagen : 'https://via.placeholder.com/600x300?text=Sin+Imagen'} 
              alt={evento.nombre} 
              style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '8px' }}
              onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/600x300?text=Sin+Imagen" }}
            />
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', color: 'var(--color-verde-gris)' }}>
          <div>📅 {new Date(evento.fecha).toLocaleDateString('es-ES')} - {evento.hora}</div>
          <div>📍 {evento.ubicacion}, {evento.ciudad}</div>
        </div>
        
        <p style={{ lineHeight: '1.6', color: 'var(--color-negro)', marginBottom: '20px' }}>
          {evento.descripcion}
        </p>
        
        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>Tipos de Entrada</h4>
            <span style={{ fontWeight: 'bold', color: 'var(--color-marron)' }}>{getRangoPrecios(evento)}</span>
          </div>
          
          {activos.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activos.map(t => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '8px 0' }}>
                  <span>{t.nombre} <small style={{ color: '#888' }}>({t.cupoVendido || 0}/{t.cupoMaximo} vendidos)</small></span>
                  <span style={{ fontWeight: 'bold' }}>${t.precio}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: '10px 0 0', fontStyle: 'italic', color: '#888' }}>No hay entradas creadas.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListaEventos;