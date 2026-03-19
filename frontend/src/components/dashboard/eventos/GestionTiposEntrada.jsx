import { useState, useEffect } from 'react';
import { eventosService } from '../../../services/eventosService';
import FormularioTipoEntrada from './FormularioTipoEntrada';
import './GestionTiposEntrada.css';

function GestionTiposEntrada({ eventoId, evento }) {
  const [tiposEntrada, setTiposEntrada] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [tipoEditando, setTipoEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('activos');
  const [error, setError] = useState('');
  const [capacidadDisponible, setCapacidadDisponible] = useState(0);

  useEffect(() => {
    cargarTiposEntrada();
  }, [eventoId]);

  useEffect(() => {
    if (evento && tiposEntrada) {
      const sumaCupos = tiposEntrada
        .filter(t => t.estado === 'activo')
        .reduce((sum, t) => sum + t.cupoMaximo, 0);
      setCapacidadDisponible(evento.capacidad - sumaCupos);
    }
  }, [evento, tiposEntrada]);

  const cargarTiposEntrada = () => {
    setCargando(true);
    setTimeout(() => {
      const tipos = eventosService.getTiposEntradaByEvento(eventoId);
      setTiposEntrada(tipos);
      setCargando(false);
    }, 500);
  };

  const handleCrear = () => {
    setTipoEditando(null);
    setMostrarFormulario(true);
  };

  const handleEditar = (tipo) => {
    setTipoEditando(tipo);
    setMostrarFormulario(true);
  };

  const handleEliminar = async (tipo) => {
    if (window.confirm(`¿Estás seguro de eliminar el tipo de entrada "${tipo.nombre}"?`)) {
      try {
        await eventosService.eliminarTipoEntrada(eventoId, tipo.id);
        cargarTiposEntrada();
        setError('');
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleRestaurar = (tipoId) => {
    eventosService.restaurarTipoEntrada(eventoId, tipoId);
    cargarTiposEntrada();
  };

  const handleGuardado = () => {
    setMostrarFormulario(false);
    setTipoEditando(null);
    cargarTiposEntrada();
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setTipoEditando(null);
  };

  // Filtrar tipos de entrada
  const tiposFiltrados = tiposEntrada.filter(tipo => {
    if (filtro === 'activos') return tipo.estado === 'activo';
    if (filtro === 'eliminados') return tipo.estado === 'eliminado';
    return true;
  });

  const totalVendidos = tiposEntrada
    .filter(t => t.estado === 'activo')
    .reduce((sum, t) => sum + (t.cupoVendido || 0), 0);

  const totalCupo = tiposEntrada
    .filter(t => t.estado === 'activo')
    .reduce((sum, t) => sum + t.cupoMaximo, 0);

  if (cargando) {
    return (
      <div className="tipos-loading">
        <div className="spinner"></div>
        <p>Cargando tipos de entrada...</p>
      </div>
    );
  }

  return (
    <div className="gestion-tipos-entrada">
      <div className="tipos-header">
        <div className="header-info">
          <h3>Tipos de Entrada</h3>
          <div className="capacidad-info">
            <span className="info-item">
              <strong>Capacidad total:</strong> {evento?.capacidad}
            </span>
            <span className="info-item">
              <strong>Cupo asignado:</strong> {totalCupo}
            </span>
            <span className="info-item">
              <strong>Disponible:</strong> 
              <span className={`capacidad-disponible ${capacidadDisponible < 0 ? 'negativo' : ''}`}>
                {capacidadDisponible}
              </span>
            </span>
            <span className="info-item">
              <strong>Vendidos:</strong> {totalVendidos}
            </span>
          </div>
        </div>

        <button className="btn-crear-tipo" onClick={handleCrear}>
          <span className="btn-icono">➕</span>
          Agregar Tipo de Entrada
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icono">⚠️</span>
          <p>{error}</p>
          <button className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="tipos-filtros">
        <button 
          className={`filtro-btn ${filtro === 'activos' ? 'activo' : ''}`}
          onClick={() => setFiltro('activos')}
        >
          Activos ({tiposEntrada.filter(t => t.estado === 'activo').length})
        </button>
        <button 
          className={`filtro-btn ${filtro === 'eliminados' ? 'activo' : ''}`}
          onClick={() => setFiltro('eliminados')}
        >
          Eliminados ({tiposEntrada.filter(t => t.estado === 'eliminado').length})
        </button>
        <button 
          className={`filtro-btn ${filtro === 'todos' ? 'activo' : ''}`}
          onClick={() => setFiltro('todos')}
        >
          Todos ({tiposEntrada.length})
        </button>
      </div>

      {tiposFiltrados.length === 0 ? (
        <div className="no-tipos">
          <div className="no-tipos-icono">🎟️</div>
          <h4>No hay tipos de entrada</h4>
          <p>Agrega diferentes tipos de entrada para este evento</p>
        </div>
      ) : (
        <div className="tipos-grid">
          {tiposFiltrados.map(tipo => (
            <div key={tipo.id} className={`tipo-card ${tipo.estado}`}>
              {tipo.estado === 'eliminado' && (
                <div className="tipo-badge eliminado">Eliminado</div>
              )}
              
              <div className="tipo-header">
                <h4>{tipo.nombre}</h4>
                <span className="tipo-precio">${tipo.precio}</span>
              </div>

              <p className="tipo-descripcion">{tipo.descripcion}</p>

              <div className="tipo-stats">
                <div className="stat">
                  <span className="stat-label">Cupo máximo:</span>
                  <span className="stat-valor">{tipo.cupoMaximo}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Vendidos:</span>
                  <span className="stat-valor">{tipo.cupoVendido || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Disponibles:</span>
                  <span className="stat-valor">
                    {tipo.cupoMaximo - (tipo.cupoVendido || 0)}
                  </span>
                </div>
              </div>

              <div className="progreso-ventas">
                <div className="progreso-header">
                  <span>Ocupación</span>
                  <span>
                    {Math.round(((tipo.cupoVendido || 0) / tipo.cupoMaximo) * 100)}%
                  </span>
                </div>
                <div className="progreso-bar">
                  <div 
                    className="progreso-fill"
                    style={{ width: `${((tipo.cupoVendido || 0) / tipo.cupoMaximo) * 100}%` }}
                  ></div>
                </div>
              </div>

              {tipo.estado === 'activo' ? (
                <div className="tipo-acciones">
                  <button 
                    className="btn-accion editar"
                    onClick={() => handleEditar(tipo)}
                    title="Editar tipo de entrada"
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn-accion eliminar"
                    onClick={() => handleEliminar(tipo)}
                    title="Eliminar tipo de entrada"
                    disabled={tipo.cupoVendido > 0}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              ) : (
                <div className="tipo-acciones">
                  <button 
                    className="btn-accion restaurar"
                    onClick={() => handleRestaurar(tipo.id)}
                    title="Restaurar tipo de entrada"
                  >
                    🔄 Restaurar
                  </button>
                </div>
              )}

              {tipo.cupoVendido > 0 && tipo.estado === 'activo' && (
                <div className="tipo-advertencia">
                  ⚠️ No se puede eliminar porque tiene ventas
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario modal */}
      {mostrarFormulario && (
        <FormularioTipoEntrada
          eventoId={eventoId}
          evento={evento}
          tipoEditando={tipoEditando}
          onGuardado={handleGuardado}
          onCancelar={handleCancelar}
        />
      )}
    </div>
  );
}

export default GestionTiposEntrada;