import sys

with open('frontend/src/pages/AdminDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Escribir el nuevo archivo directamente, es más fácil
new_content = """'use client';

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
import DashboardPromotorAdmin from '../components/dashboard/admin/DashboardPromotorAdmin';
import DashboardSistema from '../components/dashboard/admin/DashboardSistema';
import AdminTable from '../components/dashboard/admin/AdminTable';

// TIC-398/445: cada seccion del panel requiere una capability del admin.
// SuperAdmin tiene bypass total en hasPermission().
const SECTION_PERMISSION = {
  home: null, // todos los admins ven Inicio
  'dashboard-sistema': 'view_reports',
  auditoria: 'view_reports',
  administradores: 'superadmin', // Especial: solo superadmin
  promotores: 'manage_users',
  compradores: 'manage_users',
  eventos: 'manage_events',
  configuracion: 'system_config',
  'dashboard-promotor': 'view_reports',
};

const sectionTitles = {
  home: 'Panel Principal',
  'dashboard-sistema': 'Dashboard Financiero',
  administradores: 'Gestión de Administradores',
  promotores: 'Gestión de Promotores',
  compradores: 'Gestión de Compradores',
  eventos: 'Gestión de Eventos',
  configuracion: 'Configuración Global',
  auditoria: 'Log de Auditoría',
  'dashboard-promotor': 'Dashboard Financiero del Promotor',
};

function AdminDashboard() {
  const { user, isAuthenticated, isAdministrador, logout, hasPermission } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [usuariosMenuOpen, setUsuariosMenuOpen] = useState(true);
  const [reportesMenuOpen, setReportesMenuOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedPromotorId, setSelectedPromotorId] = useState(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth > 768);
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin/login');
    } else if (!isAdministrador) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAdministrador, router]);

  if (!mounted || !user) {
    return (
      <div className="admin-loading" suppressHydrationWarning>
        <div className="spinner"></div>
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  const canAccessSection = (key) => {
    if (key === 'administradores') return user.is_superadmin;
    const cap = SECTION_PERMISSION[key];
    if (!cap) return true;
    return hasPermission(cap);
  };

  const handleSelectSection = (key) => {
    setActiveSection(key);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const renderNavItem = (key, icon, label, indent = false) => {
    const hasAccess = canAccessSection(key);
    const isActive = activeSection === key;
    return (
      <li className={`${isActive ? 'active' : ''} ${!hasAccess ? 'locked' : ''}`}>
        <button
          type="button"
          className={`nav-link ${indent ? 'sub' : ''}`}
          onClick={() => handleSelectSection(key)}
          style={!hasAccess ? { opacity: 0.6 } : {}}
          title={!hasAccess ? 'No tienes permisos para esta sección' : label}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
          {!hasAccess && <span className="nav-lock">🔒</span>}
        </button>
      </li>
    );
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
          <button
            type="button"
            className="admin-logo-btn"
            onClick={() => handleSelectSection('home')}
            title="Ir al panel principal"
          >
            <span className="logo-icon">{user.is_superadmin ? '👑' : '🎫'}</span>
            {!collapsed && <h2>TicketGo</h2>}
            {!collapsed && <span className="admin-badge">{user.is_superadmin ? 'SuperAdmin' : 'Admin'}</span>}
          </button>
          <div className="sidebar-header-actions">
            <button
              className="sidebar-collapse-btn"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {collapsed ? '»' : '«'}
            </button>
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
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

        <nav className="sidebar-nav">
          <div className="nav-section">
            <ul>
              {renderNavItem('home', '🏠', 'Inicio')}
            </ul>
          </div>

          <div className="nav-section">
            <button
              type="button"
              className={`nav-collapse ${reportesMenuOpen ? 'open' : ''}`}
              onClick={() => setReportesMenuOpen((v) => !v)}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Finanzas y Reportes</span>
              <span className="chevron">{reportesMenuOpen ? '▾' : '▸'}</span>
            </button>
            {reportesMenuOpen && (
              <ul className="nav-submenu">
                {renderNavItem('dashboard-sistema', '💰', 'Dashboard Financiero', true)}
                {renderNavItem('auditoria', '📋', 'Log de Auditoría', true)}
              </ul>
            )}
          </div>

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
                {renderNavItem('administradores', '⚙️', 'Administradores', true)}
                {renderNavItem('promotores', '📢', 'Promotores', true)}
                {renderNavItem('compradores', '🛍️', 'Compradores', true)}
              </ul>
            )}
          </div>

          <div className="nav-section">
            <h3>Gestión de Eventos</h3>
            <ul>
              {renderNavItem('eventos', '📅', 'Gestión de Eventos')}
            </ul>
          </div>

          <div className="nav-section">
            <h3>Configuración Global</h3>
            <ul>
              {renderNavItem('configuracion', '🔧', 'Configuración Global')}
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
                {mounted && new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {/* Si el usuario NO tiene acceso a la seccion activa, mostramos la pantalla de Sin Permisos */}
          {!canAccessSection(activeSection) ? (
            <SinPermisos cap={SECTION_PERMISSION[activeSection] || 'superadmin'} />
          ) : (
            <>
              {activeSection === 'home' && <AdminDashboardHome onNavigate={handleSelectSection} user={user} />}
              {activeSection === 'dashboard-sistema' && <DashboardSistema />}
              {activeSection === 'auditoria' && <AdminAuditoria />}
              {activeSection === 'administradores' && <AdminTable />}
              {activeSection === 'promotores' && (
                <AdminUsuarios 
                  module="promotores" 
                  onViewPromotorDashboard={(promotorId) => {
                    setSelectedPromotorId(promotorId);
                    setActiveSection('dashboard-promotor');
                  }}
                />
              )}
              {activeSection === 'compradores' && <AdminUsuarios module="compradores" />}
              {activeSection === 'eventos' && <AdminEventos />}
              {activeSection === 'configuracion' && <AdminConfiguracion />}
              
              {activeSection === 'dashboard-promotor' && selectedPromotorId && (
                <DashboardPromotorAdmin
                  promotorId={selectedPromotorId}
                  readOnly={true}
                  onBack={() => setActiveSection('promotores')}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminDashboardHome({ onNavigate, user }) {
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
          <h2>¡Bienvenido al Panel de Administración, {user.nombre}!</h2>
          <p>Gestiona usuarios, eventos y configuración global de la plataforma.</p>
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

const CAP_LABEL = {
  manage_users: 'Gestión de Usuarios',
  manage_events: 'Gestión de Eventos',
  view_reports: 'Ver Reportes / Finanzas / Auditoría',
  system_config: 'Configuración del Sistema',
  superadmin: 'SuperAdministrador',
};

function SinPermisos({ cap }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '400px', padding: '40px',
      textAlign: 'center', color: '#9aa3b2',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
      <h2 style={{ color: '#e6e8ed', margin: '0 0 8px 0' }}>Acceso Restringido</h2>
      <p style={{ maxWidth: 460 }}>
        No tienes el permiso de <b>{CAP_LABEL[cap] || cap}</b> para acceder a esta sección.
        Contacta a un SuperAdministrador para solicitar acceso.
      </p>
    </div>
  );
}

export default AdminDashboard;
"""

with open('frontend/src/pages/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Exito")
