import './EventSkeleton.css';

/**
 * Componente esqueleto de evento para mostrar mientras se carga
 * @param {number} count - Cantidad de esqueletos a mostrar
 */
export default function EventSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <article className="evento-card-skeleton" key={index}>
          <div className="skeleton skeleton-image"></div>
          <div className="card-body-skeleton">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text short"></div>
          </div>
          <footer className="card-footer-skeleton">
            <div className="skeleton skeleton-price"></div>
            <div className="skeleton skeleton-button"></div>
          </footer>
        </article>
      ))}
    </>
  );
}
