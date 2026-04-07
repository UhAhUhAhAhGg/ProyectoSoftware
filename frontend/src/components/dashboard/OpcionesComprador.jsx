import { Link } from 'react-router-dom';
import './OpcionesComprador.css';

function OpcionesComprador() {
  // DEMO - historial vacío (luego vendrá del backend)
  const historialCompras = [];

  const opciones = [
    {
      id: 'explorar',
      icono: '🔍',
      titulo: 'Explorar Eventos',
      descripcion: 'Descubre los mejores eventos cerca de ti',
      link: '/dashboard/eventos',
      color: '#AD8149',
      destacado: true
    },
    {
      id: 'proximos',
      icono: '📅',
      titulo: 'Próximos Eventos',
      descripcion: 'Eventos a los que asistirás pronto',
      link: '/dashboard/proximos',
      color: '#EABF0B',
      contador: 3
    },
    {
      id: 'boletos',
      icono: '🎫',
      titulo: 'Mis Boletos',
      descripcion: 'Gestiona tus boletos comprados',
      link: '/dashboard/boletos',
      color: '#363A33',
      contador: 2
    },
    {
      id: 'favoritos',
      icono: '❤️',
      titulo: 'Favoritos',
      descripcion: 'Eventos que te han gustado',
      link: '/dashboard/favoritos',
      color: '#AD8149',
      contador: 5
    },
    {
      id: 'historial',
      icono: '📜',
      titulo: 'Historial',
      descripcion: 'Eventos a los que has asistido',
      link: '/dashboard/historial',
      color: '#363A33'
    },
    {
      id: 'recomendados',
      icono: '⭐',
      titulo: 'Recomendados',
      descripcion: 'Eventos que podrían gustarte',
      link: '/dashboard/recomendados',
      color: '#EABF0B',
      destacado: true
    },
    {
      id: 'perfil',
      icono: '👤',
      titulo: 'Mi Perfil',
      descripcion: 'Edita tus datos personales',
      link: '/dashboard/perfil',
      color: '#AD8149'
    }
  ];

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
        <Link to="/dashboard/proximos" className="accion-rapida secundaria">
          <span className="accion-icono">📅</span>
          <span className="accion-texto">Mis Próximos</span>
        </Link>
        <Link to="/dashboard/perfil" className="accion-rapida secundaria">
          <span className="accion-icono">👤</span>
          <span className="accion-texto">Mi Perfil</span>
        </Link>
      </div>

      <div className="grid-opciones">
        {opciones.map(opcion => (
          <Link to={opcion.link} key={opcion.id} className="opcion-card">
            <div className="opcion-header" style={{ backgroundColor: opcion.color + '20' }}>
              <span className="opcion-icono" style={{ color: opcion.color }}>{opcion.icono}</span>
              {opcion.contador && (
                <span className="opcion-contador" style={{ backgroundColor: opcion.color }}>
                  {opcion.contador}
                </span>
              )}
            </div>
            <div className="opcion-body">
              <h3>{opcion.titulo}</h3>
              <p>{opcion.descripcion}</p>
            </div>
            {opcion.destacado && (
              <span className="opcion-badge">🔥 Popular</span>
            )}
          </Link>
        ))}
      </div>

      {/* Categorías */}
      <div className="categorias-eventos">
        <h3>Explora por categoría</h3>
        <div className="categorias-grid">
          <Link to="/dashboard/eventos?categoria=conciertos" className="categoria-card">🎵 Conciertos</Link>
          <Link to="/dashboard/eventos?categoria=deportes" className="categoria-card">⚽ Deportes</Link>
          <Link to="/dashboard/eventos?categoria=teatro" className="categoria-card">🎭 Teatro</Link>
          <Link to="/dashboard/eventos?categoria=cine" className="categoria-card">🎬 Cine</Link>
          <Link to="/dashboard/eventos?categoria=conferencias" className="categoria-card">🎤 Conferencias</Link>
          <Link to="/dashboard/eventos?categoria=festivales" className="categoria-card">🎪 Festivales</Link>
        </div>
      </div>

      {/* Eventos destacados */}
      <div className="eventos-destacados">
        <div className="destacados-header">
          <h3>Eventos destacados para ti</h3>
          <Link to="/dashboard/eventos" className="ver-todos">Ver todos →</Link>
        </div>
        <div className="eventos-lista">
          {[1, 2, 3].map(item => (
            <div key={item} className="evento-mini-card">
              <div className="evento-mini-imagen">🎫</div>
              <div className="evento-mini-info">
                <h4>Evento destacado {item}</h4>
                <p>📍 Lugar del evento</p>
                <span className="evento-mini-precio">Desde $500</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ HISTORIAL (BIEN UBICADO) */}
      <div className="historial-compras">
        <h3>📜 Tu historial de compras</h3>

        {historialCompras.length === 0 ? (
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
          <p>Aquí se mostrará el historial (cuando conectemos backend)</p>
        )}
      </div>
    </div>
  );
}

export default OpcionesComprador;