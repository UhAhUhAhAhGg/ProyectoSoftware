import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import OpcionesComprador from '../components/dashboard/OpcionesComprador';
import OpcionesPromotor from '../components/dashboard/OpcionesPromotor';
import './Dashboard.css';

function Dashboard() {
  const { user, isAuthenticated, isComprador, isPromotor, isAdministrador, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([
    { id: 1, mensaje: '¡Bienvenido a tu panel!', leida: false },
    { id: 2, mensaje: 'Completa tu perfil para mejores recomendaciones', leida: false }
  ]);

  // Redirigir si no está autenticado o si es admin (debe ir a /admin/dashboard)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (isAdministrador) {
      // /admin/dashboard es una ruta de Next.js App Router, no de React Router
      window.location.href = '/admin/dashboard';
    }
  }, [isAuthenticated, isAdministrador, navigate]);



  // Marcar notificaciones como leídas
  const marcarComoLeidas = () => {
    setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
  };

  // Mostrar loading mientras se verifica autenticación
  if (!user) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando tu panel personalizado...</p>
      </div>
    );
  }

  const toggleSidebar = () => {
    setSidebarAbierto(!sidebarAbierto);
  };

  return (
    <div className="dashboard">
      {/* Header del Dashboard */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="menu-toggle-dashboard" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="header-titulo">
            <h1>Panel de {isComprador ? 'Comprador' : 'Promotor'}</h1>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
        
        <div className="header-right">
          <button onClick={toggleDarkMode} className="dashboard-theme-toggle" title="Cambiar tema">
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Notificaciones */}
          <div className="notificaciones-dropdown">
            <button className="btn-notificaciones" onClick={marcarComoLeidas}>
              🔔
              {notificaciones.filter(n => !n.leida).length > 0 && (
                <span className="notificaciones-badge">
                  {notificaciones.filter(n => !n.leida).length}
                </span>
              )}
            </button>
            <div className="notificaciones-menu">
              {notificaciones.length > 0 ? (
                notificaciones.map(n => (
                  <div key={n.id} className={`notificacion-item ${!n.leida ? 'no-leida' : ''}`}>
                    {n.mensaje}
                  </div>
                ))
              ) : (
                <div className="notificacion-item">No hay notificaciones</div>
              )}
            </div>
          </div>

          <Link to="/dashboard/perfil" className="btn-perfil" title="Mi Perfil">
            <span className="btn-icono">👤</span>
            <span className="btn-texto">Mi Perfil</span>
          </Link>

          <span className="user-badge">
            {isComprador ? '🛍️ Comprador' : '📢 Promotor'}
          </span>

          <button onClick={logout} className="btn-logout" title="Cerrar sesión">
            <span className="btn-icono">🚪</span>
            <span className="btn-texto">Salir</span>
          </button>
        </div>
      </header>

      {/* Sidebar de navegación rápida */}
      <aside className={`dashboard-sidebar ${sidebarAbierto ? 'abierto' : ''}`}>
        <button className="sidebar-close" onClick={toggleSidebar}>×</button>
        
        <div className="sidebar-user">
          <div className="user-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.nombre} />
            ) : (
              <div className="avatar-placeholder">
                {user.nombre?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <h3>{user.nombre || 'Usuario'}</h3>
          <p>{user.email}</p>
        </div>

        <nav className="sidebar-nav">
          <h4>Accesos rápidos</h4>
          <ul>
            <li><Link to="/dashboard/perfil">👤 Mi Perfil</Link></li>
            {isComprador ? (
              // Enlaces rápidos para comprador
              <>
                <li><Link to="/dashboard/eventos">🎫 Explorar Eventos</Link></li>
                <li><Link to="/dashboard/mis-compras">🎟️ Mis Entradas</Link></li>
              </>
            ) : (
              // Enlaces rápidos para promotor
              <>
                <li><Link to="/dashboard/crear-evento">➕ Crear Evento</Link></li>
                <li><Link to="/dashboard/mis-eventos">📋 Mis Eventos</Link></li>
              </>
            )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="sidebar-logout">
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Overlay para móvil cuando el sidebar está abierto */}
      {sidebarAbierto && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* Contenido dinámico según el rol */}
      <main className="dashboard-content">
        <div className="content-wrapper">
          {/* Mensaje de bienvenida personalizado */}
          <div className="welcome-message">
            <h2>
              ¡Hola de nuevo, {user.nombre || 'Usuario'}! 
              <span className="welcome-emoji">👋</span>
            </h2>
            <p>
              {isComprador 
                ? '¿Listo para encontrar los mejores eventos?' 
                : '¿Cómo van las ventas de tus eventos hoy?'}
            </p>
          </div>

          {/* Renderizado condicional según el rol */}
          {isComprador && <OpcionesComprador />}
          {isPromotor && <OpcionesPromotor />}
        </div>
      </main>

      {/* Footer del Dashboard */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>&copy; 2024 TicketGo - Panel de {isComprador ? 'Comprador' : 'Promotor'}</p>
          <div className="footer-links">
            <a href="/ayuda">Ayuda</a>
            <a href="/terminos">Términos</a>
            <a href="/privacidad">Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
