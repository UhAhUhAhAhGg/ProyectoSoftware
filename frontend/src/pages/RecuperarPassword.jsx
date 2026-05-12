import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import './RecuperarPassword.css';

function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [mockLink, setMockLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setMockLink('');

    if (!email.trim()) {
      setError('Debes ingresar un correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.requestPasswordReset(email.trim());
      setMensaje(
        response.data?.message ||
          'Si el correo está registrado, recibirás un enlace de recuperación en breve.'
      );
      if (response.data?.mock_link) {
        setMockLink(response.data.mock_link);
      }
      setEmail('');
    } catch (err) {
      setError(err.message || 'No fue posible solicitar la recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recuperar-password-page">
      <div className="recuperar-password-card">
        <h2>Recuperar contraseña</h2>
        <p>
          Te enviaremos un enlace para restablecer tu contraseña. Por seguridad, el enlace
          tiene tiempo de expiración.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            disabled={loading}
          />

          {error && <p className="estado error">{error}</p>}
          {mensaje && <p className="estado success">{mensaje}</p>}

          {mockLink && (
            <div className="mock-link-box">
              <p className="mock-link-label">Enlace de recuperación (modo desarrollo):</p>
              <a href={mockLink} className="mock-link">
                Haz clic aquí para restablecer tu contraseña
              </a>
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>

        <Link to="/login" className="volver-login">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}

export default RecuperarPassword;
