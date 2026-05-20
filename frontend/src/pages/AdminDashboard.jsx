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

function AdminDashboard() {
  const { user, isAuthenticated, isAdministrador, logout } = useAuth();
  const router = useRouter();

  // Hydration-safe: arrancamos cerrado y luego ajustamos al cliente
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [usuariosMenuOpen, setUsuariosMenuOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth > 768);
    }
  }, []);

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

  const handleSelectSection = (key) => {
    setActiveSection(key);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const sectionTitles = {
    home: 'Panel Principal',
    promotores: 'Gestión de Promotores',
    compradores: 'Gestión de Compradores',
    eventos: 'Gestión de Eventos',
    configuracion: 'Configuración Global',
    auditoria: 'Log de Auditoría',
  };

  return (
    <div className="admin-dashboard">
      {sidebarOpen && mounted && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {/* Logo clickeable → home */}
          <button
            type="button"
            className="admin-logo-btn"
            onClick={() => handleSelectSection('home')}
            title="Ir al panel principal"
          >
            <span className="logo-icon">🎫</span>
            <h2>TicketGo</h2>
            <span className="admin-badge">Admin</span>
          </button>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ×
          </button>
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

          {/* Gestión de Usuarios (colapsable) */}
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
                {usuariosSubmenu.map((item) => (
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

          {/* Gestión de Eventos */}
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

          {/* Configuración Global */}
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

          {/* Auditoría */}
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
          {activeSection === 'promotores' && <AdminUsuarios module="promotores" />}
          {activeSection === 'compradores' && <AdminUsuarios module="compradores" />}
          {activeSection === 'eventos' && <AdminEventos />}
          {activeSection === 'configuracion' && <AdminConfiguracion />}
          {activeSection === 'auditoria' && <AdminAuditoria />}
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

export default AdminDashboard;
