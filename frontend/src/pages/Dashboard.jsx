import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import OpcionesComprador from '../components/dashboard/OpcionesComprador';
import OpcionesPromotor from '../components/dashboard/OpcionesPromotor';
import './Dashboard.css';

function Dashboard() {
  const { user, isAuthenticated, isComprador, isPromotor, isAdministrador, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { notificaciones, marcarTodasComoLeidas, conteoNoLeidas } = useNotifications();
  const navigate = useNavigate();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Redirigir si no está autenticado o si es admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (isAdministrador) {
      window.location.href = '/admin/dashboard';
    }
  }, [isAuthenticated, isAdministrador, navigate]);

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
          <button
            onClick={toggleDarkMode}
            className="dashboard-theme-toggle"
            title="Cambiar tema"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Notificaciones */}
          <div className="notificaciones-dropdown">
            <button
              className="btn-notificaciones"
              onClick={marcarTodasComoLeidas}
            >
              🔔

              {conteoNoLeidas > 0 && (
                <span className="notificaciones-badge">
                  {conteoNoLeidas}
                </span>
              )}
            </button>

            <div className="notificaciones-menu">
              {notificaciones && notificaciones.length > 0 ? (
                notificaciones.map((n) => (
                  <div
                    key={n.id}
                    className={`notificacion-item ${
                      !n.leida ? 'no-leida' : ''
                    }`}
                  >
                    <div>
                      <strong>
                        {n.nombreEvento || n.mensaje || n.title}
                      </strong>

                      {n.fecha && (
                        <p style={{ margin: '4px 0' }}>
                          📅{' '}
                          {new Date(n.fecha).toLocaleDateString()}
                        </p>
                      )}

                      {n.enlace && (
                        <Link
                          to={n.enlace}
                          className="btn-ver-evento-match"
                        >
                          Ver evento
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="notificacion-item">
                  No hay notificaciones
                </div>
              )}
            </div>
          </div>

          <Link
            to="/dashboard/perfil"
            className="btn-perfil"
            title="Mi Perfil"
          >
            <span className="btn-icono">👤</span>
            <span className="btn-texto">Mi Perfil</span>
          </Link>

          <span className="user-badge">
            {isComprador ? '🛍️ Comprador' : '📢 Promotor'}
          </span>

          <button
            onClick={logout}
            className="btn-logout"
            title="Cerrar sesión"
          >
            <span className="btn-icono">🚪</span>
            <span className="btn-texto">Salir</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar ${
          sidebarAbierto ? 'abierto' : ''
        }`}
      >
        <button
          className="sidebar-close"
          onClick={toggleSidebar}
        >
          ×
        </button>

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
            <li>
              <Link to="/dashboard/perfil">
                👤 Mi Perfil
              </Link>
            </li>

            {isComprador ? (
              <>
                <li>
                  <Link to="/dashboard/eventos">
                    🎫 Explorar Eventos
                  </Link>
                </li>

                <li>
                  <Link to="/dashboard/mis-compras">
                    🎟️ Mis Entradas
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/dashboard/crear-evento">
                    ➕ Crear Evento
                  </Link>
                </li>

                <li>
                  <Link to="/dashboard/mis-eventos">
                    📋 Mis Eventos
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={logout}
            className="sidebar-logout"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarAbierto && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Contenido */}
      <main className="dashboard-content">
        <div className="content-wrapper">
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

          {isComprador && <OpcionesComprador />}
          {isPromotor && <OpcionesPromotor />}
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>
            &copy; 2024 TicketGo - Panel de{' '}
            {isComprador ? 'Comprador' : 'Promotor'}
          </p>

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