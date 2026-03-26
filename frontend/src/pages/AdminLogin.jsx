'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import './AdminLogin.css';

function AdminLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const { login, isAuthenticated, isAdministrador } = useAuth();
  const router = useRouter();

  // Detectar preferencia de modo oscuro del sistema
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && isAdministrador) {
      router.replace('/admin/dashboard');
    } else if (isAuthenticated && !isAdministrador) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAdministrador, router]);

  // Aplicar clase dark-mode al body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errores[name]) setErrores({ ...errores, [name]: '' });
    setLoginError('');
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email institucional es requerido';
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
        // Llama al endpoint exclusivo de admin — rechaza roles distintos con 401
        const result = await authService.adminLogin(formData.email, formData.password);
        login(result.data.user, result.data.token, result.data.refresh);
        // La redirección la maneja el useEffect de arriba
      } catch (error) {
        setLoginError(error.message || 'Credenciales de administrador inválidas.');
      } finally {
        setLoading(false);
      }
    } else {
      setErrores(nuevosErrores);
    }
  };

  return (
    <div className="admin-login-container">
      <button onClick={() => setDarkMode(!darkMode)} className="dark-mode-toggle">
        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
      </button>

      <Link href="/" className="back-to-home">
        <span className="back-icon">←</span>
        Volver al Inicio
      </Link>

      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-icon">🔐</div>
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
            <small className="input-helper">Solo emails institucionales de TicketGo</small>
          </div>

          <div className="admin-form-group">
            <label>
              <span className="label-icon">🔒</span>
              Contraseña de Administrador
            </label>
            <div className="admin-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
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
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
            {errores.password && <span className="error-mensaje">{errores.password}</span>}
          </div>

          <div className="admin-security-info">
            <span className="security-icon">🛡️</span>
            <p>Este acceso es exclusivo para personal autorizado de TicketGo</p>
          </div>

          <button type="submit" className="admin-login-btn" disabled={loading}>
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
            <Link href="/login" className="user-login-link">
              <span className="link-icon">👤</span>
              ¿Eres usuario? Accede aquí
            </Link>
            <Link href="/login" className="forgot-admin-link">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>


      </div>
    </div>
  );
}

export default AdminLogin;
