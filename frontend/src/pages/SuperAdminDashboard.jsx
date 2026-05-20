'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AdminTable from '../components/dashboard/admin/AdminTable';
import AdminUsuarios from '../components/dashboard/admin/AdminUsuarios';
import './SuperAdminDashboard.css';

function SuperAdminDashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  // Hydration-safe: arrancamos en true (igual server/client) y ajustamos en useEffect
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('administradores');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth > 768);
    }
  }, []);

  // Redirigir si no es SuperAdmin
  // TIC-393: usar campo is_superadmin (boolean) en lugar de role string
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin/login');
    } else if (!user?.is_superadmin && user?.role !== 'SuperAdmin') {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (!user) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Cargando panel de SuperAdministración...</p>
      </div>
    );
  }

  const menuItems = [
    {
      path: '/superadmin/administradores',
      icon: '⚙️',
      label: 'Gestión de Administradores',
      section: 'administradores',
      badge: null,
    },
    {
      path: '/superadmin/solicitudes',
      icon: '📋',
      label: 'Solicitudes Pendientes',
      section: 'solicitudes',
      badge: null,
    },
    {
      path: '/superadmin/auditoria',
      icon: '📊',
      label: 'Auditoría de Sistema',
      section: 'auditoria',
      badge: null,
    },
    {
      path: '/superadmin/configuracion',
      icon: '🔧',
      label: 'Configuración Global',
      section: 'configuracion',
      badge: null,
    },
  ];

  const isActive = (section) => activeSection === section;

  const handleMenuClick = (section) => {
    setActiveSection(section);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="superadmin-dashboard">
      {/* Overlay para móvil */}
      {sidebarOpen && mounted && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`superadmin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="superadmin-logo">
            <span className="logo-icon">👑</span>
            <h2>TicketGo</h2>
            <span className="superadmin-badge">SuperAdmin</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        <div className="superadmin-profile">
          <div className="profile-avatar">
            {user.nombre?.charAt(0) || 'S'}
          </div>
          <div className="profile-info">
            <p className="profile-name">{user.nombre}</p>
            <p className="profile-role">SuperAdministrador</p>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3>Panel de Control</h3>
            <ul>
              {menuItems.map(item => (
                <li
                  key={item.path}
                  className={isActive(item.section) ? 'active' : ''}
                >
                  <button
                    onClick={() => handleMenuClick(item.section)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      padding: 0,
                      color: 'inherit',
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            <span className="logout-label">Cerrar sesión</span>
          </button>
          <div className="system-version">
            <p>v2.0.0</p>
            <p>© 2024 TicketGo</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="superadmin-main">
        <header className="superadmin-header">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>

          <h1 className="page-title">
            <span className="title-icon">👑</span>
            Panel de SuperAdministración
          </h1>

          <div className="header-actions">
            <div className="user-widget">
              <div className="user-avatar">{user.nombre?.charAt(0) || 'S'}</div>
              <div className="user-details">
                <p className="user-name">{user.nombre}</p>
                <p className="user-status">SuperAdmin</p>
              </div>
            </div>
          </div>
        </header>

        <div className="superadmin-content">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <span>SuperAdmin</span>
            <span>/</span>
            <span className="current-page">
              {menuItems.find(item => item.section === activeSection)?.label}
            </span>
          </div>

          {/* Section: Gestión de Administradores */}
          {activeSection === 'administradores' && (
            <>
              <div className="section-container" style={{ marginBottom: 20 }}>
                <div className="section-header">
                  <div>
                    <h2>👥 Administradores Activos</h2>
                    <p className="section-description">
                      Gestiona los permisos, suspende o reactiva administradores
                    </p>
                  </div>
                </div>
                <AdminTable />
              </div>

              <div className="section-container">
                <div className="section-header">
                  <div>
                    <h2>✉️ Invitar / Solicitudes / Historial</h2>
                    <p className="section-description">
                      Genera enlaces de invitación, aprueba solicitudes pendientes y revisa
                      el historial de acciones administrativas
                    </p>
                  </div>
                </div>
                <AdminUsuarios module="administradores" />
              </div>
            </>
          )}

          {/* Section: Solicitudes Pendientes */}
          {activeSection === 'solicitudes' && (
            <div className="section-container">
              <div className="section-header">
                <h2>Solicitudes Pendientes de Administrador</h2>
                <p className="section-description">
                  Revisa y aprueba/rechaza las solicitudes para ser administrador
                </p>
              </div>
              <div className="coming-soon">
                <p>📋 Próxima funcionalidad en desarrollo</p>
              </div>
            </div>
          )}

          {/* Section: Auditoría */}
          {activeSection === 'auditoria' && (
            <div className="section-container">
              <div className="section-header">
                <h2>Auditoría del Sistema</h2>
                <p className="section-description">
                  Registro detallado de todas las acciones realizadas en el sistema
                </p>
              </div>
              <div className="coming-soon">
                <p>📊 Próxima funcionalidad en desarrollo</p>
              </div>
            </div>
          )}

          {/* Section: Configuración */}
          {activeSection === 'configuracion' && (
            <div className="section-container">
              <div className="section-header">
                <h2>Configuración Global</h2>
                <p className="section-description">
                  Controla la configuración general del sistema
                </p>
              </div>
              <div className="coming-soon">
                <p>🔧 Próxima funcionalidad en desarrollo</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SuperAdminDashboard;
