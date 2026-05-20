import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import { recommendationsService } from '../../../services/recommendationsService';
import EventCard from '../../EventCard';
import EventSkeleton from '../../EventSkeleton';
import './ExplorarEventos.css';

// Lee las preferencias de categorías del usuario desde localStorage
function leerPreferenciasCategorias() {
  try {
    const raw = localStorage.getItem('user_categorias_pref');
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

// Normaliza un nombre de categoría a slug (lowercase, sin acentos)
function slugify(name) {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function ExplorarEventos() {
  const [eventos, setEventos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Leer query param ?categoria=<id> al cargar la pagina (deep link desde dashboard)
  const initialCategoria = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('categoria') || '';
  }, []);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(initialCategoria);
  const [orden, setOrden] = useState('fecha_asc'); // fecha_asc | fecha_desc | precio_asc | precio_desc
  const [mostrarSoloFav, setMostrarSoloFav] = useState(false);

  // Preferencias del usuario (slug → bool)
  const [prefs, setPrefs] = useState(leerPreferenciasCategorias);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      setCargando(true);
      try {
        const [evts, cats] = await Promise.all([
          eventosService.getEventosDisponibles().catch(() => []),
          eventosService.getCategorias().catch(() => []),
        ]);
        if (cancelled) return;
        setEventos(Array.isArray(evts) ? evts : []);
        setCategorias(Array.isArray(cats) ? cats : []);
      } finally {
        if (!cancelled) setCargando(false);
      }
    };
    cargar();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-leer preferencias cuando se monta (por si usuario las cambió en perfil)
  useEffect(() => {
    const onStorageChange = () => setPrefs(leerPreferenciasCategorias());
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  const handleEventoView = (eventoId) => {
    recommendationsService.trackEventView?.(eventoId).catch(() => {});
  };

  // Slugs de categorías favoritas del usuario (las que están en true)
  const favSlugs = useMemo(() => {
    return Object.entries(prefs)
      .filter(([_, v]) => v)
      .map(([k]) => k);
  }, [prefs]);

  // Filtrado + ordenamiento + priorización por preferencias
  const eventosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    let lista = eventos.filter((e) => {
      const matchBusqueda = !termino
        ? true
        : e.nombre?.toLowerCase().includes(termino)
          || e.ubicacion?.toLowerCase().includes(termino)
          || e.ciudad?.toLowerCase().includes(termino)
          || e.categoriaNombre?.toLowerCase().includes(termino);
      const matchCat = !categoriaFiltro ? true : String(e.categoria) === String(categoriaFiltro);
      const slug = slugify(e.categoriaNombre);
      const esFav = favSlugs.includes(slug);
      const matchFav = !mostrarSoloFav ? true : esFav;
      return matchBusqueda && matchCat && matchFav;
    });

    // Ordenamiento
    lista = [...lista].sort((a, b) => {
      switch (orden) {
        case 'fecha_desc':
          return new Date(b.fecha) - new Date(a.fecha);
        case 'precio_asc':
          return (a.precio || 0) - (b.precio || 0);
        case 'precio_desc':
          return (b.precio || 0) - (a.precio || 0);
        case 'fecha_asc':
        default:
          return new Date(a.fecha) - new Date(b.fecha);
      }
    });

    // Si el usuario tiene preferencias activas → priorizar (favoritos primero)
    if (favSlugs.length > 0) {
      const score = (e) => favSlugs.includes(slugify(e.categoriaNombre)) ? 1 : 0;
      lista.sort((a, b) => score(b) - score(a));
    }

    return lista;
  }, [eventos, busqueda, categoriaFiltro, orden, mostrarSoloFav, favSlugs]);

  // Contadores
  const totalEventos = eventos.length;
  const totalFiltrados = eventosFiltrados.length;
  const tieneFavoritos = favSlugs.length > 0;

  return (
    <section className="explorar-eventos">
      <div className="explorar-header-nav">
        <Link to="/dashboard" className="btn-volver-dashboard">← Volver al dashboard</Link>
      </div>

      <header className="explorar-header">
        <div>
          <h2>🎫 Explorar Eventos</h2>
          <p>Descubre eventos y encuentra el que más te interese.</p>
        </div>
        {tieneFavoritos && (
          <div className="explorar-prefs-badge" title="Categorías priorizadas según tus preferencias">
            ✨ Personalizado
          </div>
        )}
      </header>

      {/* Banner de preferencias si no las tiene configuradas */}
      {!tieneFavoritos && !cargando && (
        <div className="explorar-info-box">
          <span>💡</span>
          <p>
            Configurá tus <Link to="/dashboard/perfil"><strong>categorías favoritas</strong></Link> en tu perfil
            para que los eventos que te interesan aparezcan primero.
          </p>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="explorar-filtros">
        <div className="filtro-grupo filtro-busqueda">
          <label>🔎 Buscar</label>
          <input
            type="text"
            placeholder="Nombre, ubicación o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filtro-grupo">
          <label>🏷️ Categoría</label>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>↕️ Ordenar</label>
          <select value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option value="fecha_asc">Más próximos primero</option>
            <option value="fecha_desc">Más lejanos primero</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
        </div>

        {tieneFavoritos && (
          <div className="filtro-grupo filtro-fav">
            <label>&nbsp;</label>
            <button
              type="button"
              className={`btn-toggle-fav ${mostrarSoloFav ? 'active' : ''}`}
              onClick={() => setMostrarSoloFav((v) => !v)}
            >
              {mostrarSoloFav ? '★ Solo mis categorías' : '☆ Solo mis categorías'}
            </button>
          </div>
        )}
      </div>

      {/* Contador de resultados */}
      {!cargando && (
        <div className="explorar-resultados">
          Mostrando <strong>{totalFiltrados}</strong> de <strong>{totalEventos}</strong> eventos
          {tieneFavoritos && totalFiltrados > 0 && (
            <span className="explorar-prio-hint">
              · Los eventos de tus categorías favoritas aparecen primero
            </span>
          )}
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="eventos-grid-comprador">
          <EventSkeleton count={6} />
        </div>
      ) : totalEventos === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No hay eventos disponibles en este momento</h3>
          <p>Aún no hay eventos publicados. Te notificaremos cuando existan nuevas opciones.</p>
          <Link className="btn-volver" to="/dashboard">Volver al dashboard</Link>
        </div>
      ) : totalFiltrados === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h3>No encontramos eventos con esos filtros</h3>
          <p>Prueba con otra búsqueda, categoría o quitá los filtros.</p>
          <button
            type="button"
            className="btn-volver"
            onClick={() => {
              setBusqueda('');
              setCategoriaFiltro('');
              setMostrarSoloFav(false);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="eventos-grid-comprador">
          {eventosFiltrados.map((evento) => {
            const esFav = favSlugs.includes(slugify(evento.categoriaNombre));
            return (
              <div
                key={evento.id}
                className={`evento-card-wrapper ${esFav ? 'evento-prioritario' : ''}`}
                onClick={() => handleEventoView(evento.id)}
              >
                <EventCard evento={evento} variant="comprador" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ExplorarEventos;
