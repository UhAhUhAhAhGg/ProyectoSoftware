import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

function AdminConfiguracion() {
  const { inactivityMinutes, updateInactivityTimeout } = useAuth();
  const [tempMinutes, setTempMinutes] = useState(inactivityMinutes);
  const [mensaje, setMensaje] = useState('');

  const handleSave = () => {
    updateInactivityTimeout(tempMinutes);
    setMensaje(`Tiempo de inactividad actualizado a ${tempMinutes} minuto(s). El cambio aplica inmediatamente.`);
    setTimeout(() => setMensaje(''), 5000);
  };

  return (
    <div className="admin-module">
      <h2>Configuracion Global</h2>
      <p>Ajustes generales de seguridad y plataforma.</p>

      <div style={{ marginTop: '1.5rem', maxWidth: '500px' }}>
        {/* Sección: Seguridad */}
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#e6c96b' }}>
            Seguridad de Sesion
          </h3>
          <p style={{ color: '#999', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            Configura el tiempo maximo de inactividad antes de cerrar la sesion automaticamente.
          </p>

          <label style={{ display: 'block', color: '#ccc', marginBottom: '0.4rem', fontWeight: 600 }}>
            Tiempo de inactividad (minutos)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              max={60}
              value={tempMinutes}
              onChange={(e) => setTempMinutes(Number(e.target.value))}
              style={{
                width: '80px',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #444',
                background: '#222',
                color: '#fff',
                fontSize: '1rem',
                textAlign: 'center',
              }}
            />
            <span style={{ color: '#999', fontSize: '0.85rem' }}>
              min (actual: {inactivityMinutes} min)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {[1, 5, 15, 30].map((m) => (
              <button
                key={m}
                onClick={() => setTempMinutes(m)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: tempMinutes === m ? '1px solid #e6c96b' : '1px solid #444',
                  background: tempMinutes === m ? '#e6c96b22' : '#2a2a2a',
                  color: tempMinutes === m ? '#e6c96b' : '#aaa',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {m} min
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: '#ad8149',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Guardar cambios
          </button>

          {mensaje && (
            <p style={{ marginTop: '0.75rem', color: '#21693b', fontSize: '0.9rem' }}>
              {mensaje}
            </p>
          )}
        </div>

        {/* Info */}
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '1.25rem',
        }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#e6c96b' }}>
            Informacion del Sistema
          </h3>
          <div style={{ color: '#999', fontSize: '0.9rem', lineHeight: '1.8' }}>
            <p><strong style={{ color: '#ccc' }}>Version:</strong> 2.0.0</p>
            <p><strong style={{ color: '#ccc' }}>JWT Access Token:</strong> 15 minutos</p>
            <p><strong style={{ color: '#ccc' }}>JWT Refresh Token:</strong> 1 dia</p>
            <p><strong style={{ color: '#ccc' }}>Timeout Inactividad:</strong> {inactivityMinutes} minuto(s)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminConfiguracion;
