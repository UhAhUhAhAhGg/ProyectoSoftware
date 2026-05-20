'use client';

import { useState } from 'react';
import { adminService } from '../../../services/adminService';
import './SuperAdminCrearAdmin.css';

// TIC-397/443: Formulario para que el SuperAdmin cree directamente
// una cuenta de Administrador con permisos asignables.
const PERMISOS_DISPONIBLES = [
  { id: 'manage_users', label: 'Gestionar Usuarios', icon: '👥' },
  { id: 'manage_events', label: 'Gestionar Eventos', icon: '📅' },
  { id: 'view_reports', label: 'Ver Reportes', icon: '📊' },
  { id: 'manage_queue', label: 'Gestionar Cola', icon: '⏳' },
  { id: 'system_config', label: 'Configuración del Sistema', icon: '🔧' },
];

function SuperAdminCrearAdmin({ onCreated }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errores, setErrores] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: '' }));
  };

  const togglePermiso = (id) => {
    setPermisos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido';
    if (!form.password) errs.password = 'Contraseña obligatoria';
    else if (form.password.length < 8) errs.password = 'Mínimo 8 caracteres';
    if (form.password !== form.password_confirm) errs.password_confirm = 'Las contraseñas no coinciden';
    if (!form.first_name.trim()) errs.first_name = 'Nombre obligatorio';
    if (!form.last_name.trim()) errs.last_name = 'Apellido obligatorio';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await adminService.crearAdministrador({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        permissions: permisos,
        reason: 'Creado directamente por SuperAdmin',
      });
      setMessage(`✅ Administrador ${form.email} creado correctamente.`);
      setForm({ email: '', password: '', password_confirm: '', first_name: '', last_name: '', phone: '' });
      setPermisos([]);
      if (typeof onCreated === 'function') onCreated();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage(`❌ ${err?.message || 'No se pudo crear el administrador.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-crear-admin">
      {message && (
        <div className={`sa-crear-msg ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="sa-crear-form">
        <div className="sa-row">
          <div className="sa-field">
            <label>Email institucional *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@ticketgo.com"
              disabled={loading}
              className={errores.email ? 'has-error' : ''}
            />
            {errores.email && <span className="sa-err">{errores.email}</span>}
          </div>
          <div className="sa-field">
            <label>Teléfono</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+591 70000000"
              disabled={loading}
            />
          </div>
        </div>

        <div className="sa-row">
          <div className="sa-field">
            <label>Nombre *</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              disabled={loading}
              className={errores.first_name ? 'has-error' : ''}
            />
            {errores.first_name && <span className="sa-err">{errores.first_name}</span>}
          </div>
          <div className="sa-field">
            <label>Apellido *</label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              disabled={loading}
              className={errores.last_name ? 'has-error' : ''}
            />
            {errores.last_name && <span className="sa-err">{errores.last_name}</span>}
          </div>
        </div>

        <div className="sa-row">
          <div className="sa-field">
            <label>Contraseña inicial *</label>
            <div className="sa-pwd-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                disabled={loading}
                className={errores.password ? 'has-error' : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="sa-pwd-toggle"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errores.password && <span className="sa-err">{errores.password}</span>}
          </div>
          <div className="sa-field">
            <label>Confirmar contraseña *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password_confirm"
              value={form.password_confirm}
              onChange={handleChange}
              disabled={loading}
              className={errores.password_confirm ? 'has-error' : ''}
            />
            {errores.password_confirm && <span className="sa-err">{errores.password_confirm}</span>}
          </div>
        </div>

        <div className="sa-permisos-block">
          <label className="sa-permisos-title">Permisos asignados</label>
          <p className="sa-permisos-hint">
            Selecciona qué acciones podrá realizar este Administrador en el panel.
          </p>
          <div className="sa-permisos-grid">
            {PERMISOS_DISPONIBLES.map((p) => (
              <label key={p.id} className={`sa-permiso ${permisos.includes(p.id) ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={permisos.includes(p.id)}
                  onChange={() => togglePermiso(p.id)}
                  disabled={loading}
                />
                <span className="sa-permiso-icon">{p.icon}</span>
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="sa-actions">
          <button type="submit" className="sa-btn-primary" disabled={loading}>
            {loading ? 'Creando...' : '➕ Crear Administrador'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SuperAdminCrearAdmin;
