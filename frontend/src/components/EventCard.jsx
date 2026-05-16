import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import './EventCard.css';

/**
 * Componente de tarjeta de evento reutilizable
 * @param {object} evento - Objeto del evento
 * @param {string} variant - Variante: 'comprador', 'recomendaciones', 'admin'
 * @param {function} onFavoriteChange - Callback cuando cambia favorito
 */
export default function EventCard({
  evento,
  variant = 'comprador',
  onFavoriteChange = null,
}) {
  if (!evento) {
    return null;
  }

  const handleFavoriteChange = () => {
    if (onFavoriteChange) {
      onFavoriteChange(evento.id);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <article className={`evento-card evento-card-${variant}`}>
      {/* Imagen */}
      <div className="card-image-wrapper">
        <img
          src={evento.imagen || '/placeholder-event.png'}
          alt={evento.nombre}
          className="card-image"
        />
        {/* Badge de favorito solo para ciertos variantes */}
        {(variant === 'comprador' || variant === 'recomendaciones') && (
          <div className="card-favorite-badge">
            <FavoriteButton eventId={evento.id} size="medium" />
          </div>
        )}
        {/* Badge de estado si existe */}
        {evento.estado && variant === 'admin' && (
          <div className={`card-badge estado-${evento.estado}`}>
            {evento.estado}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="card-body">
        <h3 className="card-title">{evento.nombre}</h3>

        {/* Metadatos */}
        <div className="card-meta">
          {evento.fecha && (
            <p className="meta-item">
              <span className="icon">📅</span>
              <span>{formatDate(evento.fecha)}</span>
              {evento.hora && <span className="time"> - {evento.hora}</span>}
            </p>
          )}

          {evento.ubicacion && (
            <p className="meta-item">
              <span className="icon">📍</span>
              <span>{evento.ubicacion}</span>
              {evento.ciudad && evento.ciudad !== evento.ubicacion && (
                <span className="city">, {evento.ciudad}</span>
              )}
            </p>
          )}
        </div>

        {/* Descripción (truncada) */}
        {evento.descripcion && (
          <p className="card-descripcion">{evento.descripcion}</p>
        )}

        {/* Stats para admin */}
        {variant === 'admin' && evento.tiposEntrada && (
          <div className="card-stats">
            <span className="stat">
              📊 Vendidos: {evento.boletosVendidos}/{evento.capacidad}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="card-footer">
        <div className="footer-content">
          {evento.precio > 0 && (
            <span className="precio">
              Desde Bs. <strong>{evento.precio}</strong>
            </span>
          )}
          {evento.precio === 0 && <span className="precio-gratis">Gratis</span>}
        </div>

        <Link
          className="btn-detalle"
          to={`/dashboard/evento/${evento.id}`}
          title="Ver detalles del evento"
        >
          {variant === 'admin' ? 'Editar' : 'Ver detalle'}
        </Link>
      </footer>
    </article>
  );
}
