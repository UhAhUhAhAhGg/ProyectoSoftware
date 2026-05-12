'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import './AdminLogin.css';

function AdminRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { darkMode, toggleDarkMode } = useTheme();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    employee_code: '',
    department: '',
  });
  const [errores, setErrores] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValido, setTokenValido] = useState(true);

  // Verificar que haya token en la URL
  useEffect(() => {
    if (!token) {
      setTokenValido(false);
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errores[name]) setErrores({ ...errores, [name]: '' });
    setSubmitError('');
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email es requerido';
    }

    if (!formData.password) {
      nuevosErrores.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      nuevosErrores.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      nuevosErrores.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!formData.employee_code.trim()) {
      nuevosErrores.employee_code = 'El código de empleado es requerido';
    }

    if (!formData.department.trim()) {
      nuevosErrores.department = 'El departamento es requerido';
    }

    return nuevosErrores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nuevosErrores = validarFormulario();

    if (Object.keys(nuevosErrores).length === 0) {
      setLoading(true);
      setSubmitError('');

      try {
        await authService.applyAdmin({
          email: formData.email,
          password: formData.password,
          employee_code: formData.employee_code,
          department: formData.department,
          token: token, // Token JWT de invitación capturado de la URL
        });
        setSuccess(true);
      } catch (error) {
        setSubmitError(error.message || 'Error al enviar la solicitud. Inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    } else {
      setErrores(nuevosErrores);
    }
  };

  // Pantalla de confirmación tras envío exitoso
  if (success) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div className="admin-icon">✅</div>
          <h2 style={{ marginTop: '16px' }}>Solicitud Enviada</h2>
          <p className="admin-subtitulo" style={{ marginTop: '12px', lineHeight: '1.6' }}>
            Tu solicitud de acceso como administrador fue enviada correctamente.
            El SuperAdmin revisará tu información y te notificará cuando sea aprobada.
          </p>
          <p style={{ marginTop: '24px', opacity: 0.7, fontSize: '14px' }}>
            Este proceso puede tardar entre 24 y 48 horas hábiles.
          </p>
          <Link href="/admin/login" className="admin-login-btn" style={{ display: 'inline-block', marginTop: '32px', textDecoration: 'none' }}>
            Volver al Login Admin
          </Link>
        </div>
      </div>
    );
  }

  // Pantalla de error si no hay token en la URL
  if (!tokenValido) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div className="admin-icon">⛔</div>
          <h2 style={{ marginTop: '16px' }}>Enlace Inválido</h2>
          <p className="admin-subtitulo" style={{ marginTop: '12px' }}>
            Este enlace de registro no es válido o ha expirado.
            Solicita una nueva invitación al SuperAdmin.
          </p>
          <Link href="/admin/login" className="admin-login-btn" style={{ display: 'inline-block', marginTop: '32px', textDecoration: 'none' }}>
            Ir al Login Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-container">
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
      </button>

      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-icon">📋</div>
          <h2>Registro de Administrador</h2>
          <p className="admin-subtitulo">Completa tus datos para solicitar acceso administrativo</p>
        </div>

        {submitError && (
          <div className="admin-login-error">
            <span className="error-icon">⚠️</span>
            <p>{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          {/* Email */}
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
                placeholder="tu@ticketgo.com"
                className={errores.email ? 'error' : ''}
                disabled={loading}
              />
            </div>
            {errores.email && <span className="error-mensaje">{errores.email}</span>}
          </div>

          {/* Contraseña */}
          <div className="admin-form-group">
            <label>
              <span className="label-icon">🔒</span>
              Contraseña
            </label>
            <div className="admin-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
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

          {/* Confirmar Contraseña */}
          <div className="admin-form-group">
            <label>
              <span className="label-icon">🔒</span>
              Confirmar Contraseña
            </label>
            <div className="admin-input-wrapper">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite la contraseña"
                className={errores.confirmPassword ? 'error' : ''}
                disabled={loading}
              />
            </div>
            {errores.confirmPassword && <span className="error-mensaje">{errores.confirmPassword}</span>}
          </div>

          {/* Código de Empleado */}
          <div className="admin-form-group">
            <label>
              <span className="label-icon">🏷️</span>
              Código de Empleado
            </label>
            <div className="admin-input-wrapper">
              <input
                type="text"
                name="employee_code"
                value={formData.employee_code}
                onChange={handleChange}
                placeholder="Ej: EMP-2024-001"
                className={errores.employee_code ? 'error' : ''}
                disabled={loading}
              />
            </div>
            {errores.employee_code && <span className="error-mensaje">{errores.employee_code}</span>}
          </div>

          {/* Departamento */}
          <div className="admin-form-group">
            <label>
              <span className="label-icon">🏢</span>
              Departamento
            </label>
            <div className="admin-input-wrapper">
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={errores.department ? 'error' : ''}
                disabled={loading}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: '14px' }}
              >
                <option value="">Selecciona tu departamento</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Operaciones">Operaciones</option>
                <option value="Finanzas">Finanzas</option>
                <option value="Marketing">Marketing</option>
                <option value="Soporte">Soporte</option>
                <option value="Gerencia">Gerencia</option>
              </select>
            </div>
            {errores.department && <span className="error-mensaje">{errores.department}</span>}
          </div>

          <div className="admin-security-info">
            <span className="security-icon">🛡️</span>
            <p>Tu solicitud será revisada por el SuperAdmin antes de activar tu acceso</p>
          </div>

          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Enviando solicitud...
              </>
            ) : (
              'Enviar Solicitud de Acceso'
            )}
          </button>

          <div className="admin-login-footer">
            <Link href="/admin/login" className="user-login-link">
              <span className="link-icon">←</span>
              Volver al Login Admin
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminRegister;
