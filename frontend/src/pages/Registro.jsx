import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import './Registro.css';

function Registro() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    tipoUsuario: 'comprador'
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  const [errores, setErrores] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState('');

  // Requisitos de contraseña
  const passwordRequirements = [
    { id: 'minLength', label: 'Mínimo 8 caracteres', test: (pwd) => pwd.length >= 8 },
    { id: 'uppercase', label: 'Al menos una mayúscula', test: (pwd) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'Al menos una minúscula', test: (pwd) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'Al menos un número', test: (pwd) => /[0-9]/.test(pwd) },
    { id: 'special', label: 'Al menos un carácter especial (@, #, $, etc.)', test: (pwd) => /[^A-Za-z0-9]/.test(pwd) }
  ];

  // Verificar preferencia del sistema al cargar
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Aplicar o quitar la clase dark-mode al body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Evaluar fortaleza de la contraseña
  useEffect(() => {
    if (formData.password) {
      let strength = 0;
      passwordRequirements.forEach(req => {
        if (req.test(formData.password)) strength += 1;
      });
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [formData.password]);

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
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nuevosErrores.email = 'Email inválido';
    }

    // Validar cada requisito de contraseña
    const requisitosIncumplidos = [];
    passwordRequirements.forEach(req => {
      if (!req.test(formData.password)) {
        requisitosIncumplidos.push(req.label);
      }
    });

    if (requisitosIncumplidos.length > 0) {
      nuevosErrores.password = requisitosIncumplidos;
    }

    if (!formData.password) {
      nuevosErrores.password = ['La contraseña es requerida'];
    }

    if (formData.password !== formData.confirmPassword) {
      nuevosErrores.confirmPassword = 'Las contraseñas no coinciden';
    }

    return nuevosErrores;
  };

  const getPasswordStrengthText = () => {
    if (!formData.password) return '';
    if (passwordStrength <= 2) return 'Débil';
    if (passwordStrength <= 3) return 'Media';
    if (passwordStrength >= 4) return 'Fuerte';
  };

  const getPasswordStrengthColor = () => {
    if (!formData.password) return '';
    if (passwordStrength <= 2) return 'weak';
    if (passwordStrength <= 3) return 'medium';
    if (passwordStrength >= 4) return 'strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nuevosErrores = validarFormulario();

    if (Object.keys(nuevosErrores).length === 0) {
      setLoading(true);
      setBackendError('');

      try {
        const roleName = formData.tipoUsuario === 'comprador' ? 'Comprador' : 'Promotor';
        await authService.register(formData.email, formData.password, roleName);

        // Auto-login post-registro para que puedan entrar al dashboard directamente
        try {
          const authResponse = await authService.login(formData.email, formData.password);
          login(authResponse.data.user, authResponse.data.token, authResponse.data.refresh);
        } catch (e) {
          console.error("No se pudo auto-logear:", e);
        }

        // Registro exitoso — mostrar modal de bienvenida (comportamiento original)
        const userData = {
          nombre: formData.nombre,
          email: formData.email,
          tipoUsuario: formData.tipoUsuario,
          fechaRegistro: new Date().toLocaleDateString()
        };
        setRegisteredUser(userData);
        setShowWelcomeModal(true);

        setFormData({
          nombre: '',
          email: '',
          password: '',
          confirmPassword: '',
          tipoUsuario: 'comprador'
        });
      } catch (error) {
        // Error del backend (email duplicado, validación, etc.)
        setBackendError(error.message);
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

  const closeModal = () => {
    setShowWelcomeModal(false);
    // Redirigir al dashboard según el rol
    if (registeredUser) {
      if (registeredUser.tipoUsuario === 'promotor') {
        navigate('/dashboard'); // O cambiar a /dashboard/promotor si existe la ruta dedicada
      } else {
        navigate('/dashboard'); // O cambiar a /dashboard/comprador
      }
    }
  };

  return (
    <div className="registro-container">
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
      </button>

      {/* Botón volver al inicio */}
      <Link to="/" className="back-to-home">
        <span className="back-icon">←</span>
        Volver al Inicio
      </Link>

      <div className="registro-card">
        <h2>Crear Cuenta</h2>
        <p className="subtitulo">Selecciona si deseas registrarte como Comprador o Promotor</p>

        <form onSubmit={handleSubmit}>
          <div className="tipo-usuario">
            <label className={`tipo-option ${formData.tipoUsuario === 'comprador' ? 'active' : ''}`}>
              <input
                type="radio"
                name="tipoUsuario"
                value="comprador"
                checked={formData.tipoUsuario === 'comprador'}
                onChange={handleChange}
              />
              <span className="radio-custom"></span>
              <div className="tipo-content">
                <h3>Comprador</h3>
                <p>Compra boletos para eventos</p>
              </div>
            </label>

            <label className={`tipo-option ${formData.tipoUsuario === 'promotor' ? 'active' : ''}`}>
              <input
                type="radio"
                name="tipoUsuario"
                value="promotor"
                checked={formData.tipoUsuario === 'promotor'}
                onChange={handleChange}
              />
              <span className="radio-custom"></span>
              <div className="tipo-content">
                <h3>Promotor</h3>
                <p>Crea y gestiona eventos</p>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label>Nombre completo</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ingresa tu nombre"
              className={errores.nombre ? 'error' : ''}
            />
            {errores.nombre && <span className="error-mensaje">{errores.nombre}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              className={errores.email ? 'error' : ''}
            />
            {errores.email && <span className="error-mensaje">{errores.email}</span>}
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Crea una contraseña segura"
                className={errores.password ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            
            {/* Lista de requisitos de contraseña */}
            <div className="password-requirements-list">
              <p className="requirements-title">La contraseña debe tener:</p>
              <ul>
                {passwordRequirements.map((req) => (
                  <li 
                    key={req.id}
                    className={req.test(formData.password) ? 'requirement-met' : 'requirement-unmet'}
                  >
                    <span className="requirement-icon">
                      {req.test(formData.password) ? '✓' : '○'}
                    </span>
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Indicador de fortaleza */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[...Array(5)].map((_, index) => (
                    <div 
                      key={index}
                      className={`strength-bar ${index < passwordStrength ? getPasswordStrengthColor() : ''}`}
                    ></div>
                  ))}
                </div>
                <span className={`strength-text ${getPasswordStrengthColor()}`}>
                  Fortaleza: {getPasswordStrengthText()} ({passwordStrength}/5)
                </span>
              </div>
            )}
            
            {errores.password && (
              <div className="error-mensaje password-requirements">
                <strong>Requisitos no cumplidos:</strong>
                <ul>
                  {Array.isArray(errores.password) ? (
                    errores.password.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))
                  ) : (
                    <li>{errores.password}</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirmar contraseña</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                className={errores.confirmPassword ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errores.confirmPassword && (
              <span className="error-mensaje">{errores.confirmPassword}</span>
            )}
            
            {/* Indicador de coincidencia */}
            {formData.password && formData.confirmPassword && (
              <div className="password-match">
                {formData.password === formData.confirmPassword ? (
                  <span className="match-success">✓ Las contraseñas coinciden</span>
                ) : (
                  <span className="match-error">✗ Las contraseñas no coinciden</span>
                )}
              </div>
            )}
          </div>

          {backendError && (
            <div className="error-mensaje" style={{ marginBottom: '1rem', textAlign: 'center' }}>
              ⚠️ {backendError}
            </div>
          )}

          <button type="submit" className="btn-registro" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>

          <p className="login-link">
            ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
          </p>
        </form>
      </div>

      {/* Modal de bienvenida */}
      {showWelcomeModal && registeredUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            
            <div className="modal-icon">
              {registeredUser.tipoUsuario === 'comprador' ? '🎫' : '🎉'}
            </div>
            
            <h2>¡Bienvenido{registeredUser.tipoUsuario === 'comprador' ? '' : ' Promotor'}!</h2>
            
            <div className="welcome-message">
              <p>Hola <strong>{registeredUser.nombre}</strong>,</p>
              <p>Tu cuenta ha sido creada exitosamente como <strong>{registeredUser.tipoUsuario === 'comprador' ? 'Comprador' : 'Promotor'}</strong>.</p>
              <p className="email-confirm">Hemos enviado un correo de confirmación a:</p>
              <p className="user-email">{registeredUser.email}</p>
              <p className="registration-date">Fecha de registro: {registeredUser.fechaRegistro}</p>
            </div>
            
            <div className="next-steps">
              <h3>¿Qué sigue?</h3>
              {registeredUser.tipoUsuario === 'comprador' ? (
                <ul>
                  <li>Explora eventos disponibles</li>
                  <li>Compra tus boletos favoritos</li>
                  <li>Recibe notificaciones de nuevos eventos</li>
                </ul>
              ) : (
                <ul>
                  <li>Crea tu primer evento</li>
                  <li>Configura la venta de boletos</li>
                  <li>Promociona tus eventos</li>
                </ul>
              )}
            </div>
            
            <button className="modal-button" onClick={closeModal}>
              ¡Comenzar!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Registro;

