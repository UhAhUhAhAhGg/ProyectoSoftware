import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errores, setErrores] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loginError, setLoginError] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Verificar preferencia del sistema para modo oscuro
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

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
      nuevosErrores.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nuevosErrores.email = 'Email inválido';
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
        // Intentar login
        const response = await authService.login(formData.email, formData.password);
        
        if (response.success) {
          // Guardar sesión
          login(response.data.user, response.data.token);
          
          // Si no quiere recordar sesión, usamos sessionStorage en lugar de localStorage
          if (!rememberMe) {
            // Esto se maneja en AuthContext con localStorage por defecto
            // Podríamos modificar para usar sessionStorage si no recuerda
          }
          
          // Redirección automática (se maneja en el useEffect)
        }
      } catch (error) {
        setLoginError(error.message || 'Error al iniciar sesión');
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
    <div className="login-container">
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
      </button>

      {/* Botón volver al inicio */}
      <Link to="/" className="back-home-btn">
        <span className="back-icon">←</span>
        Volver al Inicio
      </Link>

      <div className="login-card">
        <div className="login-header">
          <h2>Bienvenido de vuelta</h2>
          <p className="subtitulo">Ingresa a tu cuenta</p>
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

          <div className="form-options">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">Recordarme</span>
            </label>
            <Link to="/recuperar-password" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>

          <div className="login-footer">
            <p>¿No tienes cuenta?</p>
            <Link to="/registro" className="register-link">
              Regístrate aquí
            </Link>
          </div>
        </form>

        <div className="demo-credentials">
          <p className="demo-title">Cuentas de demostración:</p>
          <div className="demo-buttons">
            <button 
              className="demo-btn comprador"
              onClick={() => setFormData({ email: 'demo@ejemplo.com', password: 'Demo123!' })}
              disabled={loading}
            >
              Comprador Demo
            </button>
            <button 
              className="demo-btn promotor"
              onClick={() => setFormData({ email: 'promotor@ejemplo.com', password: 'Promo123!' })}
              disabled={loading}
            >
              Promotor Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;