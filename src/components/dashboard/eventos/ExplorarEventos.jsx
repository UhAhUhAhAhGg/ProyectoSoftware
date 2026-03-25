import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import { useAuth } from '../../../context/AuthContext';
import './ExplorarEventos.css';

function ExplorarEventos() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [eventosFiltrados, setEventosFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  // Categorías de eventos
  const categorias = [
    { id: 'todos', nombre: 'Todos', icono: '🎯' },
    { id: 'conciertos', nombre: 'Conciertos', icono: '🎵' },
    { id: 'deportes', nombre: 'Deportes', icono: '⚽' },
    { id: 'teatro', nombre: 'Teatro', icono: '🎭' },
    { id: 'cine', nombre: 'Cine', icono: '🎬' },
    { id: 'conferencias', nombre: 'Conferencias', icono: '🎤' },
    { id: 'festivales', nombre: 'Festivales', icono: '🎪' }
  ];

  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = () => {
    setCargando(true);
    setTimeout(() => {
      // Obtener todos los eventos activos de todos los promotores
      const todosEventos = eventosService.getEventosByPromotor(2); // ID del promotor demo
      const eventosActivos = todosEventos.filter(e => e.estado === 'activo');
      setEventos(eventosActivos);
      setEventosFiltrados(eventosActivos);
      setCargando(false);
    }, 500);
  };

  // Filtrar eventos
  useEffect(() => {
    let filtrados = [...eventos];

    // Filtro por categoría
    if (categoriaSeleccionada !== 'todos') {
      filtrados = filtrados.filter(evento => 
        evento.categoria === categoriaSeleccionada || 
        evento.nombre.toLowerCase().includes(categoriaSeleccionada.toLowerCase())
      );
    }

    // Filtro por estado
    if (filtro !== 'todos') {
      const hoy = new Date();
      if (filtro === 'proximos') {
        filtrados = filtrados.filter(evento => new Date(evento.fecha) >= hoy);
      } else if (filtro === 'destacados') {
        filtrados = filtrados.filter(evento => evento.destacado);
      }
    }

    // Búsqueda por nombre o ubicación
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      filtrados = filtrados.filter(evento => 
        evento.nombre.toLowerCase().includes(termino) ||
        evento.ubicacion.toLowerCase().includes(termino) ||
        evento.ciudad.toLowerCase().includes(termino) ||
        evento.descripcion.toLowerCase().includes(termino)
      );
    }

    setEventosFiltrados(filtrados);
  }, [categoriaSeleccionada, filtro, busqueda, eventos]);

  const handleVerDetalle = (evento) => {
    setEventoSeleccionado(evento);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEventoSeleccionado(null);
  };

  if (cargando) {
    return (
      <div className="explorar-loading">
        <div className="spinner"></div>
        <p>Cargando eventos disponibles...</p>
      </div>
    );
  }

  return (
    <div className="explorar-eventos">
      {/* Header */}
      <div className="explorar-header">
        <h2>Explorar Eventos</h2>
        <p>Descubre los mejores eventos cerca de ti</p>
      </div>

      {/* Barra de búsqueda */}
      <div className="search-section">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, ubicación o artista..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
          />
          {busqueda && (
            <button className="clear-search" onClick={() => setBusqueda('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Categorías */}
      <div className="categorias-section">
        <h3>Categorías</h3>
        <div className="categorias-grid">
          {categorias.map(cat => (
            <button
              key={cat.id}
              className={`categoria-btn ${categoriaSeleccionada === cat.id ? 'active' : ''}`}
              onClick={() => setCategoriaSeleccionada(cat.id)}
            >
              <span className="categoria-icono">{cat.icono}</span>
              <span className="categoria-nombre">{cat.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="filtros-rapidos">
        <button 
          className={`filtro-btn ${filtro === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltro('todos')}
        >
          Todos
        </button>
        <button 
          className={`filtro-btn ${filtro === 'proximos' ? 'active' : ''}`}
          onClick={() => setFiltro('proximos')}
        >
          Próximos
        </button>
        <button 
          className={`filtro-btn ${filtro === 'destacados' ? 'active' : ''}`}
          onClick={() => setFiltro('destacados')}
        >
          Destacados 🔥
        </button>
      </div>

      {/* Contador de resultados */}
      <div className="resultados-info">
        <p>{eventosFiltrados.length} eventos encontrados</p>
      </div>

      {/* Grid de eventos */}
      {eventosFiltrados.length === 0 ? (
        <div className="no-eventos">
          <div className="no-eventos-icono">🎫</div>
          <h3>No hay eventos disponibles</h3>
          <p>No encontramos eventos que coincidan con tu búsqueda.</p>
          <p>Prueba con otros filtros o revisa más tarde.</p>
          <button 
            className="btn-limpiar-filtros"
            onClick={() => {
              setBusqueda('');
              setCategoriaSeleccionada('todos');
              setFiltro('todos');
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="eventos-grid">
          {eventosFiltrados.map(evento => (
            <div key={evento.id} className="evento-card">
              <div className="evento-imagen">
                <img src={evento.imagen} alt={evento.nombre} />
                {evento.destacado && (
                  <span className="evento-destacado-badge">🔥 Destacado</span>
                )}
                <div className="evento-fecha-badge">
                  {new Date(evento.fecha).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short'
                  })}
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
                  <p className="evento-descripcion">
                    {evento.descripcion.substring(0, 100)}...
                  </p>
                </div>

                <div className="evento-footer">
                  <div className="evento-precio">
                    <span className="precio-label">Desde</span>
                    <span className="precio-valor">${evento.precio}</span>
                  </div>
                  <div className="evento-disponibilidad">
                    <span className={`disponibilidad ${evento.boletosVendidos >= evento.capacidad ? 'agotado' : 'disponible'}`}>
                      {evento.boletosVendidos >= evento.capacidad ? 'Agotado' : `${evento.capacidad - evento.boletosVendidos} disponibles`}
                    </span>
                  </div>
                </div>

                <button 
                  className="btn-ver-detalle"
                  onClick={() => handleVerDetalle(evento)}
                >
                  Ver detalles →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle del evento */}
      {mostrarModal && eventoSeleccionado && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-detalle-evento" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={cerrarModal}>×</button>
            
            <div className="modal-imagen">
              <img src={eventoSeleccionado.imagen} alt={eventoSeleccionado.nombre} />
              {eventoSeleccionado.destacado && (
                <span className="destacado-badge">🔥 Evento Destacado</span>
              )}
            </div>

            <div className="modal-content">
              <h2>{eventoSeleccionado.nombre}</h2>
              
              <div className="detalles-grid">
                <div className="detalle-item">
                  <span className="detalle-icono-grande">📅</span>
                  <div>
                    <strong>Fecha y Hora</strong>
                    <p>{new Date(eventoSeleccionado.fecha).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                    <p>{eventoSeleccionado.hora} hs</p>
                  </div>
                </div>

                <div className="detalle-item">
                  <span className="detalle-icono-grande">📍</span>
                  <div>
                    <strong>Ubicación</strong>
                    <p>{eventoSeleccionado.ubicacion}</p>
                    <p>{eventoSeleccionado.direccion}</p>
                    <p>{eventoSeleccionado.ciudad}</p>
                  </div>
                </div>

                <div className="detalle-item">
                  <span className="detalle-icono-grande">🎟️</span>
                  <div>
                    <strong>Disponibilidad</strong>
                    <p>Capacidad total: {eventoSeleccionado.capacidad} personas</p>
                    <p>Boletos vendidos: {eventoSeleccionado.boletosVendidos}</p>
                    <p className="disponibles">
                      Disponibles: {eventoSeleccionado.capacidad - eventoSeleccionado.boletosVendidos}
                    </p>
                  </div>
                </div>

                <div className="detalle-item">
                  <span className="detalle-icono-grande">💰</span>
                  <div>
                    <strong>Precio</strong>
                    <p className="precio-grande">${eventoSeleccionado.precio}</p>
                    <p>por entrada</p>
                  </div>
                </div>
              </div>

              <div className="descripcion-completa">
                <strong>Descripción del evento</strong>
                <p>{eventoSeleccionado.descripcion}</p>
              </div>

              {eventoSeleccionado.tiposEntrada && eventoSeleccionado.tiposEntrada.length > 0 && (
                <div className="tipos-entrada">
                  <strong>Tipos de entrada disponibles</strong>
                  <div className="tipos-grid">
                    {eventoSeleccionado.tiposEntrada.map(tipo => (
                      <div key={tipo.id} className="tipo-card-modal">
                        <h4>{tipo.nombre}</h4>
                        <p>{tipo.descripcion}</p>
                        <div className="tipo-precio-modal">${tipo.precio}</div>
                        <div className="tipo-disponibilidad">
                          {tipo.cupoMaximo - tipo.cupoVendido} disponibles
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-acciones">
                {eventoSeleccionado.boletosVendidos >= eventoSeleccionado.capacidad ? (
                  <button className="btn-agotado" disabled>
                    🎫 Evento Agotado
                  </button>
                ) : (
                  <Link to={`/comprar/${eventoSeleccionado.id}`} className="btn-comprar">
                    🎫 Comprar Boletos
                  </Link>
                )}
                <button className="btn-cerrar" onClick={cerrarModal}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplorarEventos;