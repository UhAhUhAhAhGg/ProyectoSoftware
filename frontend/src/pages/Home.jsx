import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import './Home.css';

function Home() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  return (
    <div className="home-container">
      {/* Header con navegación (sin cambios) */}
      <header className="home-header">
        <div className="header-content">
          <div className="logo-container">
            <Link to="/" className="logo">
              <span className="logo-icon">🎫</span>
              <h1>TicketGo</h1>
            </Link>
          </div>

          <nav className={`nav-menu ${menuAbierto ? 'abierto' : ''}`}>
            <button className="nav-close" onClick={toggleMenu}>×</button>
            <ul>
              <li><a href="#inicio" onClick={toggleMenu}>Inicio</a></li>
              <li><a href="#quienes-somos" onClick={toggleMenu}>Quiénes Somos</a></li>
              <li><a href="#como-funciona" onClick={toggleMenu}>Cómo Funciona</a></li>
              <li><a href="#contacto" onClick={toggleMenu}>Contacto</a></li>
            </ul>
          </nav>

          <div className="header-actions">
            <button onClick={toggleDarkMode} className="dark-mode-toggle">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="menu-toggle" onClick={toggleMenu}>
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section (sin cambios) */}
      <section id="inicio" className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            ¡Bienvenido a <span className="highlight">TicketGo</span>!
          </h1>
          <p className="hero-subtitle">
            La plataforma más fácil y segura para comprar y vender boletos de eventos
          </p>

          <div className="hero-buttons">
            <Link to="/login" className="btn-primary">
              <span className="btn-icon">🔑</span>
              Iniciar Sesión
            </Link>
            <Link to="/registro" className="btn-secondary">
              <span className="btn-icon">📝</span>
              Crear Cuenta
            </Link>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">🇧🇴</span>
              <span className="stat-label">Hecho en Bolivia</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Seguro</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Soporte</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="https://media.istockphoto.com/id/2194925696/es/vector/boletos-dorados-3d-boleto-dorado-con-estrellas-y-la-inscripci%C3%B3n-admita-uno-ilustraci%C3%B3n.jpg?s=612x612&w=0&k=20&c=5H93HojRupFNC08nacTGtXbDvclWcaVgyLl91s8vzAg=" alt="Eventos" />
        </div>
      </section>

      {/* Quiénes Somos (sin cambios) */}
      <section id="quienes-somos" className="about-section">
        <div className="section-header">
          <h2>¿Quiénes Somos?</h2>
          <div className="section-divider"></div>
        </div>

        <div className="about-content">
          <div className="about-text">
            <p>
              En <strong>TicketGo</strong>, somos apasionados por conectar a las personas
              con experiencias inolvidables. Nacimos en Bolivia en 2024 para crear la
              plataforma más confiable y fácil de usar para la compra y venta de boletos
              para todo tipo de eventos.
            </p>
            <p>
              Nuestra misión es democratizar el acceso al entretenimiento, permitiendo
              que tanto compradores como promotores puedan realizar transacciones de
              manera segura, rápida y transparente.
            </p>

            <div className="mission-vision">
              <div className="mission-card">
                <h3>🎯 Misión</h3>
                <p>
                  Facilitar el acceso a eventos culturales, deportivos y de
                  entretenimiento en Bolivia, creando una comunidad vibrante
                  alrededor de las experiencias únicas.
                </p>
              </div>
              <div className="vision-card">
                <h3>⭐ Visión</h3>
                <p>
                  Ser la plataforma líder de Bolivia para la gestión de eventos,
                  reconocida por su innovación, seguridad y experiencia
                  de usuario.
                </p>
              </div>
            </div>
          </div>

          <div className="about-image">
            <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80" alt="Multitud en un concierto" loading="lazy" />
          </div>
        </div>
      </section>

      {/* Cómo Funciona (SECCIÓN MODIFICADA CON LA NUEVA IMAGEN) */}
      <section id="como-funciona" className="how-it-works">
        <div className="section-header">
          <h2>¿Cómo Funciona?</h2>
          <div className="section-divider"></div>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">📝</div>
            <h3>Regístrate</h3>
            <p>Crea tu cuenta gratis eligiendo tu tipo de perfil: Comprador o Promotor</p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">🔍</div>
            <h3>Explora o Crea</h3>
            <p>Compradores: busca eventos. Promotores: publica tus eventos</p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🎫</div>
            <h3>Compra o Vende</h3>
            <p>Realiza transacciones seguras con nuestra plataforma</p>
          </div>

          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-icon">🎉</div>
            <h3>Disfruta</h3>
            <p>Asiste a tus eventos favoritos o celebra el éxito de tus ventas</p>
          </div>
        </div>

        {/* Banner promocional */}
        <div className="upcoming-banner">
          <img
            src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1600&q=80"
            alt="Próximos eventos"
            className="upcoming-image"
            loading="lazy"
          />
          <div className="banner-overlay">
            <h3>¿Listo para los próximos eventos?</h3>
            <p>Cientos de experiencias te esperan. ¡Encuentra la tuya!</p>
          </div>
        </div>

        <div className="roles-showcase">
          <h3>Dos perfiles, una plataforma</h3>
          <div className="roles-cards">
            <div className="role-card buyer">
              <h4>🛍️ Comprador</h4>
              <ul>
                <li>✓ Explora miles de eventos</li>
                <li>✓ Compra boletos seguros</li>
                <li>✓ Recibe notificaciones</li>
                <li>✓ Guarda tus favoritos</li>
              </ul>
              <Link to="/registro" className="role-link">Regístrate como Comprador →</Link>
            </div>
            <div className="role-card promoter">
              <h4>📢 Promotor</h4>
              <ul>
                <li>✓ Crea eventos ilimitados</li>
                <li>✓ Gestiona ventas en tiempo real</li>
                <li>✓ Analiza estadísticas</li>
                <li>✓ Promociona tus eventos</li>
              </ul>
              <Link to="/registro" className="role-link">Regístrate como Promotor →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contacto (sin cambios) */}
      <section id="contacto" className="contact-section">
        <div className="section-header">
          <h2>Contáctanos</h2>
          <div className="section-divider"></div>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <h3>¿Tienes preguntas?</h3>
            <p>Estamos aquí para ayudarte. Elige el canal que prefieras:</p>

            <div className="contact-methods">
              <div className="contact-method">
                <span className="method-icon">📧</span>
                <div>
                  <h4>Email</h4>
                  <p>soporte@ticketgo.com</p>
                  <p>ventas@ticketgo.com</p>
                </div>
              </div>

              <div className="contact-method">
                <span className="method-icon">📞</span>
                <div>
                  <h4>Teléfono</h4>
                  <p>+591 2 123-4567</p>
                  <p>Lun-Vie 9:00 - 18:00</p>
                </div>
              </div>

              <div className="contact-method">
                <span className="method-icon">📍</span>
                <div>
                  <h4>Dirección</h4>
                  <p>Av. Ballivián 1234</p>
                  <p>La Paz, Bolivia</p>
                </div>
              </div>

              <div className="contact-method">
                <span className="method-icon">💬</span>
                <div>
                  <h4>Soporte</h4>
                  <p>Te respondemos en menos de 24h hábiles</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-image">
            <img src="https://illustrations.popsy.co/amber/customer-support.svg" alt="Contacto" />
          </div>
        </div>
      </section>

      {/* Footer (sin cambios) */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>TicketGo</h4>
            <p>Tu plataforma de confianza para eventos</p>
          </div>

          <div className="footer-section">
            <h4>Enlaces rápidos</h4>
            <ul>
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#quienes-somos">Quiénes Somos</a></li>
              <li><a href="#como-funciona">Cómo Funciona</a></li>
              <li><a href="#contacto">Contacto</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Términos y Condiciones</a></li>
              <li><a href="#">Política de Privacidad</a></li>
              <li><a href="#">Política de Cookies</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contacto</h4>
            <p>📧 soporte@ticketgo.com</p>
            <p>📞 +591 2 123-4567</p>
            <p>📍 La Paz, Bolivia</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 TicketGo. Hecho en Bolivia 🇧🇴 — Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;