import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './AdminLogin.css';

function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errores, setErrores] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const { loginAdmin, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Verificar preferencia del sistema para modo oscuro
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Redirigir si ya está autenticado como admin
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin/dashboard');
    } else if (isAuthenticated && !isAdmin) {
      // Si es usuario común pero intenta acceder a admin login, redirigir a su dashboard
      navigate('/dashboard');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // Aplicar modo oscuro
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errores[name]) {
      setErrores({
        ...errores,
        [name]: ''
      });
    }
    setLoginError('');
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email institucional es requerido';
    } else if (!formData.email.endsWith('@ticketgo.com') && !formData.email.endsWith('@admin.ticketgo.com')) {
      nuevosErrores.email = 'Debe usar un email institucional de TicketGo';
    }

    if (!formData.password) {
      nuevosErrores.password = 'La contraseña es requerida';
    }

    return nuevosErrores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nuevosErrores = validarFormulario();
    
    if (Object.keys(nuevosErrores).length === 0) {
      setLoading(true);
      setLoginError('');
      
      try {
        await loginAdmin(formData.email, formData.password);
        // La redirección se maneja en el useEffect
      } catch (error) {
        setLoginError(error.message || 'Credenciales de administrador inválidas');
      } finally {
        setLoading(false);
      }
    } else {
      setErrores(nuevosErrores);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="admin-login-container">
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
      </button>

      <Link to="/" className="back-to-home">
        <span className="back-icon">←</span>
        Volver al Inicio
      </Link>

      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-icon">⚙️</div>
          <h2>Panel de Administración</h2>
          <p className="admin-subtitulo">Acceso exclusivo para administradores de TicketGo</p>
        </div>

        {loginError && (
          <div className="admin-login-error">
            <span className="error-icon">⚠️</span>
            <p>{loginError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label>
              <span className="label-icon">📧</span>
              Email Institucional
            </label>
            <div className="admin-input-wrapper">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@ticketgo.com"
                className={errores.email ? 'error' : ''}
                disabled={loading}
              />
              <span className="input-badge">Admin</span>
            </div>
            {errores.email && <span className="error-mensaje">{errores.email}</span>}
            <small className="input-helper">Solo emails @ticketgo.com o @admin.ticketgo.com</small>
          </div>

          <div className="admin-form-group">
            <label>
              <span className="label-icon">🔒</span>
              Contraseña de Administrador
            </label>
            <div className="admin-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={errores.password ? 'error' : ''}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errores.password && <span className="error-mensaje">{errores.password}</span>}
          </div>

          <div className="admin-security-info">
            <span className="security-icon">🛡️</span>
            <p>Este acceso es exclusivo para personal autorizado de TicketGo</p>
          </div>

          <button 
            type="submit" 
            className="admin-login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Verificando credenciales...
              </>
            ) : (
              'Acceder al Panel Admin'
            )}
          </button>

          <div className="admin-login-footer">
            <Link to="/login" className="user-login-link">
              <span className="link-icon">👤</span>
              ¿Eres usuario? Accede aquí
            </Link>
            <Link to="/recuperar-admin" className="forgot-admin-link">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>

        <div className="admin-credentials-hint">
          <p>Credenciales de demostración:</p>
          <code>admin@ticketgo.com / Admin2024!</code>
        </div>

        <div className="admin-access-log">
          <h4>Accesos recientes al sistema</h4>
          <div className="access-item">
            <span className="access-status success"></span>
            <span className="access-ip">192.168.1.100</span>
            <span className="access-time">Hace 5 minutos</span>
          </div>
          <div className="access-item">
            <span className="access-status success"></span>
            <span className="access-ip">192.168.1.105</span>
            <span className="access-time">Hace 2 horas</span>
          </div>
          <div className="access-item">
            <span className="access-status warning"></span>
            <span className="access-ip">10.0.0.50</span>
            <span className="access-time">Ayer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;