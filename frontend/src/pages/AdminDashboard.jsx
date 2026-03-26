'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

// Importar módulos de administración
import AdminUsuarios from '../components/dashboard/admin/AdminUsuarios';
import AdminEventos from '../components/dashboard/admin/AdminEventos';
import AdminConfiguracion from '../components/dashboard/admin/AdminConfiguracion';
import AdminAuditoria from '../components/dashboard/admin/AdminAuditoria';

function AdminDashboard() {
  const { user, isAuthenticated, isAdministrador, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('home');

  // Redirigir si no es admin — protección de ruta
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin/login');
    } else if (!isAdministrador) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAdministrador, router]);

  // Cerrar sidebar en móvil al cambiar de sección
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [activeSection]);

  if (!user) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  const menuItems = [
    {
      path: '/admin/usuarios',
      icon: '👥',
      label: 'Gestionar Usuarios',
      badge: null,
      section: 'usuarios'
    },
    {
      path: '/admin/promotores',
      icon: '📢',
      label: 'Promotores',
      badge: null,
      section: 'usuarios'
    },
    {
      path: '/admin/compradores',
      icon: '🛍️',
      label: 'Compradores',
      badge: null,
      section: 'usuarios'
    },
    {
      path: '/admin/administradores',
      icon: '⚙️',
      label: 'Administradores',
      badge: null,
      section: 'usuarios'
    },
    {
      path: '/admin/eventos',
      icon: '📅',
      label: 'Gestión de Eventos',
      badge: null,
      section: 'eventos'
    },
    {
      path: '/admin/configuracion',
      icon: '⚙️',
      label: 'Configuración Global',
      badge: null,
      section: 'config'
    },
    {
      path: '/admin/auditoria',
      icon: '📋',
      label: 'Log de Auditoria',
      badge: null,
      section: 'auditoria'
    }
  ];

  const isActive = (section) => activeSection === section;

  return (
    <div className="admin-dashboard">
      {/* Overlay para móvil */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar - Estilo como en la imagen */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="admin-logo">
            <span className="logo-icon">🎫</span>
            <h2>TicketGo</h2>
            <span className="admin-badge">Admin</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        <div className="admin-profile">
          <div className="profile-avatar">
            {user.nombre?.charAt(0) || 'A'}
          </div>
          <div className="profile-info">
            <p className="profile-name">{user.nombre}</p>
            <p className="profile-role">Administrador</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Sección: Gestión de Usuarios */}
          <div className="nav-section">
            <h3>Gestionar Usuarios</h3>
            <ul>
              {menuItems.filter(item => item.section === 'usuarios').map(item => (
                <li key={item.path} className={isActive(item.section + '_' + item.path.split('/').pop()) ? 'active' : ''}>
                  <button onClick={() => { setActiveSection(item.path.split('/').pop()); setSidebarOpen(false); }} style={{background:'none',border:'none',cursor:'pointer',width:'100%',textAlign:'left',padding:0,color:'inherit'}}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sección: Gestión de Eventos */}
          <div className="nav-section">
            <h3>Gestión de Eventos</h3>
            <ul>
              {menuItems.filter(item => item.section === 'eventos').map(item => (
                <li key={item.path} className={isActive(item.path.split('/').pop()) ? 'active' : ''}>
                  <button onClick={() => { setActiveSection(item.path.split('/').pop()); setSidebarOpen(false); }} style={{background:'none',border:'none',cursor:'pointer',width:'100%',textAlign:'left',padding:0,color:'inherit'}}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sección: Configuración */}
          <div className="nav-section">
            <h3>Configuración Global</h3>
            <ul>
              {menuItems.filter(item => item.section === 'config').map(item => (
                <li key={item.path} className={isActive(item.path.split('/').pop()) ? 'active' : ''}>
                  <button onClick={() => { setActiveSection(item.path.split('/').pop()); setSidebarOpen(false); }} style={{background:'none',border:'none',cursor:'pointer',width:'100%',textAlign:'left',padding:0,color:'inherit'}}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sección: Auditoría */}
          <div className="nav-section">
            <h3>Log de Auditoria</h3>
            <ul>
              {menuItems.filter(item => item.section === 'auditoria').map(item => (
                <li key={item.path} className={isActive(item.path.split('/').pop()) ? 'active' : ''}>
                  <button onClick={() => { setActiveSection(item.path.split('/').pop()); setSidebarOpen(false); }} style={{background:'none',border:'none',cursor:'pointer',width:'100%',textAlign:'left',padding:0,color:'inherit'}}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <span className="logout-icon">��</span>
            <span className="logout-label">Cerrar sesión</span>
          </button>
          <div className="system-version">
            <p>v2.0.0</p>
            <p>© 2024 TicketGo</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          
          <div className="header-title">
            <h1>{menuItems.find(item => item.path.split('/').pop() === activeSection)?.label || 'Dashboard'}</h1>
          </div>

          <div className="header-actions">
            <div className="date-display">
              <span className="date-icon">📅</span>
              <span className="date-text">
                {new Date().toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {activeSection === 'home' && <AdminDashboardHome />}
          {activeSection === 'usuarios' && <AdminUsuarios module="usuarios" />}
          {activeSection === 'promotores' && <AdminUsuarios module="promotores" />}
          {activeSection === 'compradores' && <AdminUsuarios module="compradores" />}
          {activeSection === 'administradores' && <AdminUsuarios module="administradores" />}
          {activeSection === 'eventos' && <AdminEventos />}
          {activeSection === 'configuracion' && <AdminConfiguracion />}
          {activeSection === 'auditoria' && <AdminAuditoria />}
        </div>
      </main>
    </div>
  );
}

// Componente Home del Dashboard
function AdminDashboardHome() {
  const [stats, setStats] = useState({
    usuarios: { total: 1250, nuevos: 12 },
    promotores: { total: 45, nuevos: 3 },
    compradores: { total: 1180, nuevos: 8 },
    administradores: { total: 5, nuevos: 0 },
    eventos: { total: 89, pendientes: 5 },
    ventas: { total: 245000 }
  });

  return (
    <div className="admin-home">
      {/* Welcome Card */}
      <div className="welcome-card">
        <div className="welcome-text">
          <h2>¡Bienvenido al Panel de Administración!</h2>
          <p>Gestiona usuarios, eventos y configuración global de la plataforma</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.usuarios.total}</h3>
            <p>Usuarios Totales</p>
          </div>
          <span className="stat-badge">+{stats.usuarios.nuevos} hoy</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📢</div>
          <div className="stat-info">
            <h3>{stats.promotores.total}</h3>
            <p>Promotores</p>
          </div>
          <span className="stat-badge">+{stats.promotores.nuevos} nuevos</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🛍️</div>
          <div className="stat-info">
            <h3>{stats.compradores.total}</h3>
            <p>Compradores</p>
          </div>
          <span className="stat-badge">+{stats.compradores.nuevos} hoy</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚙️</div>
          <div className="stat-info">
            <h3>{stats.administradores.total}</h3>
            <p>Administradores</p>
          </div>
          <span className="stat-badge">Activos</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{stats.eventos.total}</h3>
            <p>Eventos Activos</p>
          </div>
          <span className="stat-badge pending">{stats.eventos.pendientes} pendientes</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>${stats.ventas.total.toLocaleString()}</h3>
            <p>Ventas Totales</p>
          </div>
          <span className="stat-trend positive">+15%</span>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
