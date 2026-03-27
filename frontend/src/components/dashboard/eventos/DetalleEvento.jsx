import { Link, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import './DetalleEvento.css';

function DetalleEvento() {
  const { id } = useParams();
  const evento = eventosService.getEventoById(id);

  if (!evento || evento.estado !== 'activo') {
    return (
      <section className="detalle-evento estado-vacio">
        <h2>Evento no disponible</h2>
        <p>El evento que intentas ver no existe o ya no está disponible.</p>
        <Link className="btn-volver" to="/dashboard/eventos">
          Volver a eventos disponibles
        </Link>
      </section>
    );
  }

  const porcentaje = Math.round((evento.boletosVendidos / evento.capacidad) * 100);

  return (
    <section className="detalle-evento">
      <Link className="volver-link" to="/dashboard/eventos">← Volver a eventos</Link>

      <div className="detalle-card">
        <img src={evento.imagen} alt={evento.nombre} />

        <div className="detalle-contenido">
          <h2>{evento.nombre}</h2>
          <p className="descripcion">{evento.descripcion}</p>

          <div className="info-grid">
            <p><strong>Fecha:</strong> {new Date(evento.fecha).toLocaleDateString('es-ES')}</p>
            <p><strong>Hora:</strong> {evento.hora}</p>
            <p><strong>Lugar:</strong> {evento.ubicacion}</p>
            <p><strong>Ciudad:</strong> {evento.ciudad}</p>
            <p><strong>Dirección:</strong> {evento.direccion}</p>
            <p><strong>Precio base:</strong> ${evento.precio}</p>
          </div>

          <div className="disponibilidad">
            <div className="fila">
              <span>Disponibilidad</span>
              <span>{evento.boletosVendidos}/{evento.capacidad}</span>
            </div>
            <div className="barra">
              <div className="fill" style={{ width: `${porcentaje}%` }}></div>
            </div>
          </div>

          <button type="button" className="btn-seleccionar">
            Seleccionar este evento
          </button>
        </div>
      </div>
    </section>
  );
}

export default DetalleEvento;
