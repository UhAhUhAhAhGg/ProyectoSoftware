'use client';

import { useState, useEffect } from 'react';

/**
 * ForbiddenToast — escucha el evento global 'auth:forbidden' disparado por el interceptor
 * de Axios en api.js cuando el backend devuelve un error 403. Muestra un aviso al usuario.
 */
function ForbiddenToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handler = (e) => {
      setMessage(e.detail?.message || 'Permisos insuficientes para esta acción.');
      setVisible(true);

      // Auto-ocultar después de 5 segundos
      setTimeout(() => setVisible(false), 5000);
    };

    window.addEventListener('auth:forbidden', handler);
    return () => window.removeEventListener('auth:forbidden', handler);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      background: '#e74c3c',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(231,76,60,0.4)',
      maxWidth: '360px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      animation: 'slideIn 0.3s ease',
    }}>
      <span style={{ fontSize: '20px' }}>🚫</span>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>Acceso Denegado</strong>
        <span style={{ fontSize: '14px', opacity: 0.9 }}>{message}</span>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '0', lineHeight: 1 }}
      >
        ×
      </button>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ForbiddenToast;
