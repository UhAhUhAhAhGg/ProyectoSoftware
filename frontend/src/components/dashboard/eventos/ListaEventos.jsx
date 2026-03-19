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

  useEffect(() => {
    cargarEventos();
  }, [user]);

  const cargarEventos = () => {
    setCargando(true);
    // Simular carga
    setTimeout(() => {
      const eventosData = eventosService.getEventosByPromotor(user?.id);
      setEventos(eventosData);
      setCargando(false);
    }, 500);
  };

  const handleEliminarClick = (evento) => {
    setEventoAEliminar(evento);
    setMostrarModal(true);
  };

  const confirmarEliminar = () => {
    if (eventoAEliminar) {
      eventosService.eliminarEvento(eventoAEliminar.id);
      cargarEventos();
      setMostrarModal(false);
      setEventoAEliminar(null);
    }
  };

  const cancelarEliminar = () => {
    setMostrarModal(false);
    setEventoAEliminar(null);
  };

  const handleRestaurar = (id) => {
    eventosService.restaurarEvento(id);
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
                <img src={evento.imagen} alt={evento.nombre} />
                <div className="evento-estado-badge">
                  {getEstadoBadge(evento.estado)}
                </div>
              </div>

              <div className="evento-info">
                <h3>{evento.nombre}</h3>
                
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
                    <span className="precio-label">Precio</span>
                    <span className="precio-valor">${evento.precio}</span>
                  </div>
                </div>
              </div>

              <div className="evento-acciones">
                <Link 
                  to={`/dashboard/evento/${evento.id}`} 
                  className="btn-accion ver"
                  title="Ver detalles"
                >
                  👁️
                </Link>
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
    </div>
  );
}

export default ListaEventos;