import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { eventosService } from '../../services/eventosService';
import { recommendationsService } from '../../services/recommendationsService';
import './OpcionesComprador.css';

// Iconos por categoria (lower-case sin acentos)
const CATEGORY_ICONS = {
  musica: '🎵',
  cine: '🎬',
  teatro: '🎭',
  arte: '🎨',
  tecnologia: '💻',
  gastronomia: '🍽️',
  familia: '👨‍👩‍👧‍👦',
  educacion: '📚',
  negocios: '💼',
  festivales: '🎊',
  conferencias: '🎤',
  deportes: '🏆',
};

function slugify(name) {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function leerPreferencias() {
  try {
    return JSON.parse(localStorage.getItem('user_categorias_pref') || '{}');
  } catch {
    return {};
  }
}

function OpcionesComprador() {
  const [categorias, setCategorias] = useState([]);
  const [eventosDestacados, setEventosDestacados] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingDestacados, setLoadingDestacados] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  // Preferencias del usuario (para destacar categorias)
  const prefs = useMemo(() => leerPreferencias(), []);
  const favSlugs = useMemo(
    () => Object.entries(prefs).filter(([_, v]) => v).map(([k]) => k),
    [prefs]
  );

  useEffect(() => {
    let cancelled = false;

    // 1) Categorias reales
    (async () => {
      try {
        const cats = await eventosService.getCategorias();
        if (!cancelled) setCategorias(Array.isArray(cats) ? cats : []);
      } catch {
        if (!cancelled) setCategorias([]);
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    })();

    // 2) Eventos destacados (TIC-362 + TIC-364 fallback)
    (async () => {
      try {
        const evts = await recommendationsService.getRecommendedEvents();
        if (!cancelled) setEventosDestacados(Array.isArray(evts) ? evts.slice(0, 3) : []);
      } catch {
        if (!cancelled) setEventosDestacados([]);
      } finally {
        if (!cancelled) setLoadingDestacados(false);
      }
    })();

    // 3) Historial de compras del usuario
    (async () => {
      try {
        const compras = await eventosService.getMisCompras?.();
        if (!cancelled) {
          setHistorial(Array.isArray(compras) ? compras.slice(0, 5) : []);
        }
      } catch {
        if (!cancelled) setHistorial([]);
      } finally {
        if (!cancelled) setLoadingHistorial(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Categorias ordenadas: favoritas primero
  const categoriasOrdenadas = useMemo(() => {
    if (!categorias.length) return [];
    if (!favSlugs.length) return categorias;
    return [...categorias].sort((a, b) => {
      const aFav = favSlugs.includes(slugify(a.name)) ? 1 : 0;
      const bFav = favSlugs.includes(slugify(b.name)) ? 1 : 0;
      return bFav - aFav;
    });
  }, [categorias, favSlugs]);

  return (
    <div className="opciones-comprador">
      <div className="bienvenida-comprador">
        <h2>¡Hola Comprador! 👋</h2>
        <p>Explora los mejores eventos y consigue tus boletos</p>
      </div>

      <div className="acciones-rapidas">
        <Link to="/dashboard/eventos" className="accion-rapida principal">
          <span className="accion-icono">🔍</span>
          <span className="accion-texto">Buscar Eventos</span>
        </Link>
        <Link to="/dashboard/mis-compras" className="accion-rapida secundaria">
          <span className="accion-icono">🎫</span>
          <span className="accion-texto">Mis Entradas</span>
        </Link>
        <Link to="/dashboard/perfil" className="accion-rapida secundaria">
          <span className="accion-icono">👤</span>
          <span className="accion-texto">Mi Perfil</span>
        </Link>
      </div>

      {/* Categorias reales del backend */}
      <div className="categorias-eventos">
        <div className="categorias-header">
          <h3>Explora por categoría</h3>
          {favSlugs.length > 0 && (
            <span className="categorias-prefs-hint">
              ⭐ Tus categorías favoritas aparecen primero
            </span>
          )}
        </div>
        {loadingCats ? (
          <div className="categorias-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="categoria-card categoria-skeleton" />
            ))}
          </div>
        ) : categoriasOrdenadas.length === 0 ? (
          <p className="categorias-empty">No hay categorías disponibles.</p>
        ) : (
          <div className="categorias-grid">
            {categoriasOrdenadas.map((cat) => {
              const slug = slugify(cat.name);
              const isFav = favSlugs.includes(slug);
              const icon = CATEGORY_ICONS[slug] || '🏷️';
              return (
                <Link
                  key={cat.id}
                  to={`/dashboard/eventos?categoria=${cat.id}`}
                  className={`categoria-card ${isFav ? 'categoria-fav' : ''}`}
                  title={isFav ? 'Categoría favorita' : ''}
                >
                  <span className="categoria-icon">{icon}</span>
                  <span className="categoria-nombre">{cat.name}</span>
                  {isFav && <span className="categoria-star">⭐</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Eventos destacados (TIC-21 - recomendaciones reales) */}
      <div className="eventos-destacados">
        <div className="destacados-header">
          <h3>
            {favSlugs.length > 0 ? '✨ Recomendados para ti' : '🔥 Eventos destacados'}
          </h3>
          <Link to="/dashboard/eventos" className="ver-todos">Ver todos →</Link>
        </div>

        {loadingDestacados ? (
          <div className="eventos-lista">
            {[1, 2, 3].map((i) => (
              <div key={i} className="evento-mini-card evento-mini-skeleton" />
            ))}
          </div>
        ) : eventosDestacados.length === 0 ? (
          <div className="evento-mini-empty">
            <p>🎭 Todavía no hay eventos publicados.</p>
            <Link to="/dashboard/eventos">Explorar eventos</Link>
          </div>
        ) : (
          <div className="eventos-lista">
            {eventosDestacados.map((evento) => (
              <Link
                to={`/dashboard/evento/${evento.id}`}
                key={evento.id}
                className="evento-mini-card"
              >
                {evento.imagen ? (
                  <img src={evento.imagen} alt={evento.nombre} className="evento-mini-imagen-img" />
                ) : (
                  <div className="evento-mini-imagen">🎫</div>
                )}
                <div className="evento-mini-info">
                  <h4>{evento.nombre}</h4>
                  <p>📍 {evento.ubicacion || 'Por confirmar'}</p>
                  {evento.categoriaNombre && (
                    <p className="evento-mini-cat">🏷️ {evento.categoriaNombre}</p>
                  )}
                  <span className="evento-mini-precio">
                    {evento.precio > 0 ? `Desde Bs. ${evento.precio}` : 'Gratis'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Historial de compras (data real) */}
      <div className="historial-compras">
        <h3>📜 Tu historial de compras</h3>

        {loadingHistorial ? (
          <div className="historial-vacio">
            <p>Cargando historial...</p>
          </div>
        ) : historial.length === 0 ? (
          <div className="historial-vacio">
            <div className="historial-icono">🎫</div>
            <h4>Aún no tienes compras</h4>
            <p>
              Cuando compres entradas, aparecerán aquí para que puedas consultarlas fácilmente.
            </p>
            <Link to="/dashboard/eventos" className="btn-explorar">
              Explorar eventos
            </Link>
          </div>
        ) : (
          <div className="historial-lista">
            {historial.map((compra) => (
              <Link
                to="/dashboard/mis-compras"
                key={compra.id}
                className="historial-item"
              >
                <div className="historial-item-info">
                  <h5>{compra.evento_nombre || compra.event?.name || 'Evento'}</h5>
                  <p>
                    📅 {compra.created_at
                      ? new Date(compra.created_at).toLocaleDateString('es-ES')
                      : 'Fecha no disponible'}
                  </p>
                  <span className={`historial-status historial-status-${compra.status || 'active'}`}>
                    {compra.status === 'pending' ? '⏳ Pendiente'
                      : compra.status === 'expired' ? '❌ Expirada'
                      : compra.status === 'cancelled' ? '🚫 Cancelada'
                      : '✓ Activa'}
                  </span>
                </div>
                <span className="historial-precio">Bs. {compra.total_price}</span>
              </Link>
            ))}
            <Link to="/dashboard/mis-compras" className="historial-ver-todo">
              Ver todas las compras →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default OpcionesComprador;
