'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { userManagementService } from '../services/userManagementService';
import { eventosService } from '../services/eventosService';
import './AdminDashboard.css';

// Módulos de administración
import AdminUsuarios from '../components/dashboard/admin/AdminUsuarios';
import AdminEventos from '../components/dashboard/admin/AdminEventos';
import AdminConfiguracion from '../components/dashboard/admin/AdminConfiguracion';
import AdminAuditoria from '../components/dashboard/admin/AdminAuditoria';

// TIC-398/445: cada seccion del panel requiere una capability del admin.
// SuperAdmin tiene bypass total en hasPermission().
const SECTION_PERMISSION = {
  home: null, // todos los admins ven Inicio
  promotores: 'manage_users',
  compradores: 'manage_users',
  eventos: 'manage_events',
  configuracion: 'system_config',
  auditoria: 'view_reports',
};

function AdminDashboard() {
  const { user, isAuthenticated, isAdministrador, logout, hasPermission } = useAuth();
  const router = useRouter();

  // Hydration-safe: arrancamos cerrado y luego ajustamos al cliente
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [usuariosMenuOpen, setUsuariosMenuOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false); // Sidebar colapsado (solo iconos) en desktop
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth > 768);
      // Recordar preferencia del usuario entre sesiones
      const saved = localStorage.getItem('adminSidebarCollapsed');
      if (saved === 'true') setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminSidebarCollapsed', String(next));
      }
      return next;
    });
  };

  // Protección de ruta
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin/login');
    } else if (!isAdministrador) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAdministrador, router]);

  if (!user) {
    return (
      <div className="admin-loading" suppressHydrationWarning>
        <div className="spinner"></div>
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  // Submenú de Gestionar Usuarios
  // NOTA: "Administradores" se gestiona desde el panel SuperAdmin (TIC-401),
  // no aparece aqui para un Admin estandar.
  const usuariosSubmenu = [
    { key: 'promotores', icon: '📢', label: 'Promotores' },
    { key: 'compradores', icon: '🛍️', label: 'Compradores' },
  ];

  // TIC-398/445: helper para chequear si una seccion es accesible.
  // Si SECTION_PERMISSION[key] es null, todos los admins entran.
  const canAccessSection = (key) => {
    const cap = SECTION_PERMISSION[key];
    if (!cap) return true;
    return hasPermission(cap);
  };

  const handleSelectSection = (key) => {
    // Defensa contra deep-link: si la seccion requiere permiso ausente, ir a Inicio
    if (!canAccessSection(key)) {
      setActiveSection('home');
      return;
    }
    setActiveSection(key);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // Sub-items de Usuarios visibles segun manage_users
  const usuariosSubmenuVisible = usuariosSubmenu.filter((item) => canAccessSection(item.key));
  const showUsuariosMenu = usuariosSubmenuVisible.length > 0;
  const showEventosMenu = canAccessSection('eventos');
  const showConfigMenu = canAccessSection('configuracion');
  const showAuditoriaMenu = canAccessSection('auditoria');

  const sectionTitles = {
    home: 'Panel Principal',
    promotores: 'Gestión de Promotores',
    compradores: 'Gestión de Compradores',
    eventos: 'Gestión de Eventos',
    configuracion: 'Configuración Global',
    auditoria: 'Log de Auditoría',
  };

  return (
    <div className={`admin-dashboard ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && mounted && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}
        suppressHydrationWarning
      >
        <div className="sidebar-header">
          {/* Logo clickeable → home */}
          <button
            type="button"
            className="admin-logo-btn"
            onClick={() => handleSelectSection('home')}
            title="Ir al panel principal"
          >
            <span className="logo-icon">🎫</span>
            {!collapsed && <h2>TicketGo</h2>}
            {!collapsed && <span className="admin-badge">Admin</span>}
          </button>
          <div className="sidebar-header-actions">
            {/* Boton colapsar (solo desktop) */}
            <button
              className="sidebar-collapse-btn"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {collapsed ? '»' : '«'}
            </button>
            {/* Boton cerrar (solo mobile) */}
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </div>
        </div>

        <div className="admin-profile">
          <div className="profile-avatar">{user.nombre?.charAt(0) || 'A'}</div>
          <div className="profile-info">
            <p className="profile-name">{user.nombre}</p>
            <p className="profile-role">
              {user.is_superadmin ? 'SuperAdministrador' : 'Administrador'}
            </p>
          </div>
        </div>

        {/* Acceso al panel SuperAdmin (solo si is_superadmin) */}
        {user.is_superadmin && (
          <div className="superadmin-access">
            <button
              type="button"
              className="superadmin-access-btn"
              onClick={() => router.push('/superadmin/dashboard')}
              title="Ir al panel SuperAdmin"
            >
              👑 Panel SuperAdmin
            </button>
          </div>
        )}

        <nav className="sidebar-nav">
          {/* Inicio */}
          <div className="nav-section">
            <ul>
              <li className={activeSection === 'home' ? 'active' : ''}>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => handleSelectSection('home')}
                >
                  <span className="nav-icon">🏠</span>
                  <span className="nav-label">Inicio</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Gestión de Usuarios (colapsable) — visible solo con manage_users */}
          {showUsuariosMenu && (
            <div className="nav-section">
              <button
                type="button"
                className={`nav-collapse ${usuariosMenuOpen ? 'open' : ''}`}
                onClick={() => setUsuariosMenuOpen((v) => !v)}
              >
                <span className="nav-icon">👥</span>
                <span className="nav-label">Gestionar Usuarios</span>
                <span className="chevron">{usuariosMenuOpen ? '▾' : '▸'}</span>
              </button>
              {usuariosMenuOpen && (
                <ul className="nav-submenu">
                  {usuariosSubmenuVisible.map((item) => (
                    <li
                      key={item.key}
                      className={activeSection === item.key ? 'active' : ''}
                    >
                      <button
                        type="button"
                        className="nav-link sub"
                        onClick={() => handleSelectSection(item.key)}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Gestión de Eventos — visible solo con manage_events */}
          {showEventosMenu && (
            <div className="nav-section">
              <h3>Gestión de Eventos</h3>
              <ul>
                <li className={activeSection === 'eventos' ? 'active' : ''}>
                  <button
                    type="button"
                    className="nav-link"
                    onClick={() => handleSelectSection('eventos')}
                  >
                    <span className="nav-icon">📅</span>
                    <span className="nav-label">Gestión de Eventos</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Configuración Global — visible solo con system_config */}
          {showConfigMenu && (
            <div className="nav-section">
              <h3>Configuración Global</h3>
              <ul>
                <li className={activeSection === 'configuracion' ? 'active' : ''}>
                  <button
                    type="button"
                    className="nav-link"
                    onClick={() => handleSelectSection('configuracion')}
                  >
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">Configuración Global</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Auditoría — visible solo con view_reports */}
          {showAuditoriaMenu && (
            <div className="nav-section">
              <h3>Log de Auditoría</h3>
              <ul>
                <li className={activeSection === 'auditoria' ? 'active' : ''}>
                  <button
                    type="button"
                    className="nav-link"
                    onClick={() => handleSelectSection('auditoria')}
                  >
                    <span className="nav-icon">📋</span>
                    <span className="nav-label">Log de Auditoría</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="logout-btn" onClick={logout}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Abrir/cerrar menú"
          >
            ☰
          </button>

          <div className="header-title">
            <h1>{sectionTitles[activeSection] || 'Dashboard'}</h1>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="admin-back-link"
              onClick={() => handleSelectSection('home')}
            >
              ← Inicio
            </button>
            <div className="date-display" suppressHydrationWarning>
              <span className="date-icon">📅</span>
              <span className="date-text">
                {mounted &&
                  new Date().toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
              </span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {activeSection === 'home' && <AdminDashboardHome onNavigate={handleSelectSection} />}
          {activeSection === 'promotores' && (
            canAccessSection('promotores') ? <AdminUsuarios module="promotores" /> : <SinPermisos cap="manage_users" />
          )}
          {activeSection === 'compradores' && (
            canAccessSection('compradores') ? <AdminUsuarios module="compradores" /> : <SinPermisos cap="manage_users" />
          )}
          {activeSection === 'eventos' && (
            canAccessSection('eventos') ? <AdminEventos /> : <SinPermisos cap="manage_events" />
          )}
          {activeSection === 'configuracion' && (
            canAccessSection('configuracion') ? <AdminConfiguracion /> : <SinPermisos cap="system_config" />
          )}
          {activeSection === 'auditoria' && (
            canAccessSection('auditoria') ? <AdminAuditoria /> : <SinPermisos cap="view_reports" />
          )}
        </div>
      </main>
    </div>
  );
}

// Componente Home con datos REALES (sin gestion de Admins — eso es del SuperAdmin)
function AdminDashboardHome({ onNavigate }) {
  const [stats, setStats] = useState({
    promotores: 0,
    compradores: 0,
    eventos: { total: 0, publicados: 0, dados_de_baja: 0 },
    loading: true,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cargarStats = async () => {
      try {
        const [promotores, compradores, eventos] = await Promise.all([
          userManagementService.getPromotores().catch(() => []),
          userManagementService.getCompradores().catch(() => []),
          eventosService.getEventosDisponibles().catch(() => []),
        ]);

        if (cancelled) return;

        const eventosArr = Array.isArray(eventos) ? eventos : [];
        const publicados = eventosArr.filter((e) => e.estado === 'publicado').length;
        const dadosDeBaja = eventosArr.filter(
          (e) => e.adminStatus === 'deactivated' || e.estado === 'cancelado'
        ).length;

        setStats({
          promotores: Array.isArray(promotores) ? promotores.length : 0,
          compradores: Array.isArray(compradores) ? compradores.length : 0,
          eventos: { total: eventosArr.length, publicados, dados_de_baja: dadosDeBaja },
          loading: false,
        });
      } catch (err) {
        console.warn('Error cargando estadisticas:', err?.message);
        if (!cancelled) {
          setError('No se pudieron cargar todas las estadísticas');
          setStats((s) => ({ ...s, loading: false }));
        }
      }
    };

    cargarStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsuarios = stats.promotores + stats.compradores;

  return (
    <div className="admin-home">
      <div className="welcome-card">
        <div className="welcome-text">
          <h2>¡Bienvenido al Panel de Administración!</h2>
          <p>Gestiona usuarios, eventos y configuración global de la plataforma</p>
        </div>
      </div>

      {error && <div className="alert alert-warn">{error}</div>}

      <div className="stats-grid">
        <button
          type="button"
          className="stat-card stat-clickable"
          onClick={() => onNavigate?.('promotores')}
          title="Ver promotores"
        >
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.loading ? '…' : totalUsuarios}</h3>
            <p>Usuarios Totales</p>
          </div>
        </button>

        <button
          type="button"
          className="stat-card stat-clickable"
          onClick={() => onNavigate?.('promotores')}
        >
          <div className="stat-icon">📢</div>
          <div className="stat-info">
            <h3>{stats.loading ? '…' : stats.promotores}</h3>
            <p>Promotores</p>
          </div>
        </button>

        <button
          type="button"
          className="stat-card stat-clickable"
          onClick={() => onNavigate?.('compradores')}
        >
          <div className="stat-icon">🛍️</div>
          <div className="stat-info">
            <h3>{stats.loading ? '…' : stats.compradores}</h3>
            <p>Compradores</p>
          </div>
        </button>

        <button
          type="button"
          className="stat-card stat-clickable"
          onClick={() => onNavigate?.('eventos')}
        >
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{stats.loading ? '…' : stats.eventos.publicados}</h3>
            <p>Eventos Publicados</p>
          </div>
          {stats.eventos.dados_de_baja > 0 && (
            <span className="stat-badge pending">
              {stats.eventos.dados_de_baja} dados de baja
            </span>
          )}
        </button>

        <button
          type="button"
          className="stat-card stat-clickable"
          onClick={() => onNavigate?.('auditoria')}
        >
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>Ver historial</h3>
            <p>Auditoría</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// TIC-398/445: pantalla mostrada cuando un Admin intenta acceder
// (por deep-link o navegacion forzada) a una seccion que requiere una
// capability que no tiene. El sidebar normalmente la oculta, asi que esto
// es defensa en profundidad para casos como ?section=usuarios en la URL.
const CAP_LABEL = {
  manage_users: 'Gestionar Usuarios',
  manage_events: 'Gestionar Eventos',
  view_reports: 'Ver Reportes / Auditoría',
  manage_queue: 'Gestionar Cola',
  system_config: 'Configuración del Sistema',
};

function SinPermisos({ cap }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '400px', padding: '40px',
      textAlign: 'center', color: '#9aa3b2',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
      <h2 style={{ color: '#e6e8ed', margin: '0 0 8px 0' }}>Sin permisos suficientes</h2>
      <p style={{ maxWidth: 460 }}>
        No tienes el permiso <b>{CAP_LABEL[cap] || cap}</b> para acceder a esta sección.
        Solicítaselo al SuperAdmin si necesitas usarla.
      </p>
    </div>
  );
}

export default AdminDashboard;
