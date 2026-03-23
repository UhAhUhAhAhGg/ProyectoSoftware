import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'comprador'
  });
  const [errores, setErrores] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const { login, isAuthenticated, isComprador, isPromotor, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Verificar preferencia del sistema para modo oscuro
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Redirigir según el rol
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin/dashboard');
      } else if (isPromotor) {
        navigate('/dashboard');
      } else if (isComprador) {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, isAdmin, isPromotor, isComprador, navigate]);

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

  // Prellenar según el rol seleccionado
  const handleRoleChange = (role) => {
    const credentials = {
      comprador: { email: 'comprador@ticketgo.com', password: 'Comprador123!' },
      promotor: { email: 'promotor@ticketgo.com', password: 'Promotor123!' },
      administrador: { email: 'admin@ticketgo.com', password: 'Admin2024!' }
    };

    setFormData({
      ...formData,
      role: role,
      email: credentials[role].email,
      password: credentials[role].password
    });
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email es requerido';
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
        const response = await authService.login(formData.email, formData.password);
        
        // Verificar si el rol del backend coincide con la pestaña seleccionada
        const userRole = response.data.user.role.toLowerCase();
        const tabRole = formData.role.toLowerCase();
        
        if (userRole !== tabRole && !(userRole === 'administrador' && tabRole === 'administrador')) {
           throw new Error(`Credenciales válidas, pero este usuario es de tipo ${response.data.user.role}.`);
        }
        
        login(response.data.user, response.data.token, response.data.refresh);
      } catch (error) {
        setLoginError(error.message);
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

  const getRoleStyle = (role) => {
    if (formData.role === role) {
      if (role === 'comprador') return 'active comprador';
      if (role === 'promotor') return 'active promotor';
      if (role === 'administrador') return 'active administrador';
    }
    return '';
  };

  return (
    <div className="login-container">
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
      </button>

      {/* Botón Volver al Inicio */}
      <Link to="/" className="back-to-home">
        <span className="back-icon">←</span>
        Volver al Inicio
      </Link>

      <div className="login-card">
        <div className="login-header">
          <h2>Bienvenido a TicketGo</h2>
          <p className="subtitulo">Selecciona tu rol e inicia sesión</p>
        </div>

        {/* Selector de roles estilo tarjetas */}
        <div className="role-selector">
          <div
            className={`role-card comprador ${getRoleStyle('comprador')}`}
            onClick={() => handleRoleChange('comprador')}
          >
            <div className="role-icon">🛍️</div>
            <h3>Comprador</h3>
            <p>Compra boletos para eventos</p>
          </div>

          <div
            className={`role-card promotor ${getRoleStyle('promotor')}`}
            onClick={() => handleRoleChange('promotor')}
          >
            <div className="role-icon">📢</div>
            <h3>Promotor</h3>
            <p>Crea y gestiona eventos</p>
          </div>

          <div
            className={`role-card administrador ${getRoleStyle('administrador')}`}
            onClick={() => handleRoleChange('administrador')}
          >
            <div className="role-icon">⚙️</div>
            <h3>Administrador</h3>
            <p>Gestión y control de la plataforma</p>
          </div>
        </div>

        {loginError && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            <p>{loginError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo electrónico</label>
            <div className="input-with-icon">
              <span className="input-icon">📧</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className={errores.email ? 'error' : ''}
                disabled={loading}
              />
            </div>
            {errores.email && <span className="error-mensaje">{errores.email}</span>}
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="password-input-container">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Ingresa tu contraseña"
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

          <button
            type="submit"
            className={`btn-login ${formData.role}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              `Iniciar sesión como ${formData.role === 'comprador' ? 'Comprador' : formData.role === 'promotor' ? 'Promotor' : 'Administrador'}`
            )}
          </button>

          <div className="login-footer">
            <p>¿No tienes cuenta?</p>
            <Link to="/registro" className="register-link">
              Regístrate aquí
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;