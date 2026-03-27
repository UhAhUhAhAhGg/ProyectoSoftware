import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './ResetPassword.css';

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') || '';
  }, [location.search]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!token) {
      setError('El enlace de recuperación es inválido.');
      return;
    }

    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.confirmPasswordReset(token, password);
      setMensaje(
        response.data?.message ||
          'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
      );
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message || 'No fue posible restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <h2>Restablecer contraseña</h2>
        <p>Ingresa tu nueva contraseña para recuperar el acceso.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="password">Nueva contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            disabled={loading}
          />

          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la nueva contraseña"
            disabled={loading}
          />

          {error && <p className="estado error">{error}</p>}
          {mensaje && <p className="estado success">{mensaje}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
          </button>
        </form>

        <Link to="/login" className="volver-login">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}

export default ResetPassword;
