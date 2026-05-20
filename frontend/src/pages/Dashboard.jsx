import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import OpcionesComprador from '../components/dashboard/OpcionesComprador';
import OpcionesPromotor from '../components/dashboard/OpcionesPromotor';
import './Dashboard.css';

function Dashboard() {
  const { user, isAuthenticated, isComprador, isPromotor, isAdministrador, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // US-22: notificaciones reales del backend (no mock)
  const {
    notificaciones,
    conteoNoLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    cargarNotificaciones,
  } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);

  // Redirigir si no está autenticado o si es admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (isAdministrador) {
      window.location.href = '/admin/dashboard';
    }
  }, [isAuthenticated, isAdministrador, navigate]);

  // TIC-435: polling para actualizar campanita en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      cargarNotificaciones?.();
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  // TIC-437: marcar como leída al abrir y al click
  const handleNotifClick = async (notif) => {
    if (!notif.leida) {
      await marcarComoLeida?.(notif.id);
    }
  };

  const handleAbrirNotifs = () => {
    setNotifOpen((v) => !v);
  };

  const handleMarcarTodas = async (e) => {
    e?.stopPropagation();
    await marcarTodasComoLeidas?.();
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
          <button
            onClick={toggleDarkMode}
            className="dashboard-theme-toggle"
            title="Cambiar tema"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* US-22: Notificaciones (TIC-378 campanita, TIC-379 dropdown, TIC-435 badge en tiempo real) */}
          <div className={`notificaciones-dropdown ${notifOpen ? 'open' : ''}`}>
            <button
              className="btn-notificaciones"
              onClick={handleAbrirNotifs}
              aria-label="Notificaciones"
            >
              🔔
              {conteoNoLeidas > 0 && (
                <span className="notificaciones-badge">{conteoNoLeidas}</span>
              )}
            </button>

            {notifOpen && (
              <div className="notificaciones-menu">
                <div className="notificaciones-menu-header">
                  <strong>Notificaciones</strong>
                  {conteoNoLeidas > 0 && (
                    <button
                      type="button"
                      className="btn-marcar-todas"
                      onClick={handleMarcarTodas}
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                {notificaciones && notificaciones.length > 0 ? (
                  <div className="notificaciones-lista">
                    {notificaciones.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={`notificacion-item ${!n.leida ? 'no-leida' : ''}`}
                        onClick={() => handleNotifClick(n)}
                      >
                        <div className="notif-content">
                          <strong>{n.titulo || n.mensaje || 'Nuevo evento'}</strong>
                          {n.mensaje && n.titulo && (
                            <p className="notif-mensaje">{n.mensaje}</p>
                          )}
                          <div className="notif-meta">
                            <span className="notif-fecha">
                              📅 {n.created_at
                                ? new Date(n.created_at).toLocaleDateString('es-ES')
                                : ''}
                            </span>
                            {n.event && (
                              <Link
                                to={`/dashboard/evento/${n.event}`}
                                className="btn-ver-evento-match"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver evento →
                              </Link>
                            )}
                          </div>
                        </div>
                        {!n.leida && <span className="notif-dot" title="No leída" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="notificacion-item-vacia">
                    <span>🔕</span>
                    <p>No tienes notificaciones</p>
                    <small>Te avisaremos cuando se publiquen eventos de tus categorías favoritas</small>
                  </div>
                )}
              </div>
            )}
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