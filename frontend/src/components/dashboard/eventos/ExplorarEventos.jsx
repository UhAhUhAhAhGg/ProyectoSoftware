import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import './ExplorarEventos.css';

function ExplorarEventos() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const disponibles = await eventosService.getEventosDisponibles();
        setEventos(disponibles);
      } catch {
        setEventos([]);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const eventosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return eventos;

    return eventos.filter((evento) => {
      return (
        evento.nombre.toLowerCase().includes(termino) ||
        evento.ubicacion.toLowerCase().includes(termino) ||
        evento.ciudad.toLowerCase().includes(termino)
      );
    });
  }, [eventos, busqueda]);

  if (cargando) {
    return (
      <div className="explorar-eventos loading-state">
        <div className="spinner"></div>
        <p>Cargando eventos disponibles...</p>
      </div>
    );
  }

  return (
    <section className="explorar-eventos">
      <div className="explorar-header-nav">
        <Link to="/dashboard" className="btn-volver-dashboard">← Volver al dashboard</Link>
      </div>

      <header className="explorar-header">
        <h2>Eventos Disponibles</h2>
        <p>Selecciona un evento para ver su detalle y elegir el de tu interés.</p>
      </header>

      <div className="busqueda-wrapper">
        <input
          type="text"
          placeholder="Buscar por nombre, ciudad o ubicación"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {eventos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No hay eventos disponibles en este momento</h3>
          <p>
            Aún no hay eventos publicados. Te notificaremos cuando existan nuevas
            opciones.
          </p>
          <Link className="btn-volver" to="/dashboard">
            Volver al dashboard
          </Link>
        </div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h3>No encontramos eventos con esa búsqueda</h3>
          <p>Prueba con otro término para encontrar eventos disponibles.</p>
        </div>
      ) : (
        <div className="eventos-grid-comprador">
          {eventosFiltrados.map((evento) => (
            <article className="evento-card-comprador" key={evento.id}>
              <img src={evento.imagen} alt={evento.nombre} />
              <div className="card-body">
                <h3>{evento.nombre}</h3>
                <p className="meta">📅 {new Date(evento.fecha).toLocaleDateString('es-ES')} - {evento.hora}</p>
                <p className="meta">📍 {evento.ubicacion}, {evento.ciudad}</p>
                <p className="descripcion">{evento.descripcion}</p>
              </div>
              <footer className="card-footer">
                <span className="precio">Desde ${evento.precio}</span>
                <Link className="btn-detalle" to={`/dashboard/evento/${evento.id}`}>
                  Ver detalle
                </Link>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ExplorarEventos;
