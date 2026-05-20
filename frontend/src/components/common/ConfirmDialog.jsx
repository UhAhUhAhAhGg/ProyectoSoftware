import React from 'react';

/**
 * ConfirmDialog — Modal de confirmación bonito y consistente.
 * Reemplaza a window.confirm() con un diseño propio.
 *
 * Props:
 *   - open: boolean
 *   - titulo: string
 *   - mensaje: string
 *   - icono: string (emoji, default ⚠️)
 *   - textoConfirmar: string (default "Sí, salir")
 *   - textoCancelar: string (default "Volver")
 *   - colorConfirmar: string (default "#dc3545")
 *   - onConfirm: () => void
 *   - onCancel: () => void
 */
export default function ConfirmDialog({
  open,
  titulo = '¿Estás seguro?',
  mensaje = '',
  icono = '⚠️',
  textoConfirmar = 'Sí, salir',
  textoCancelar = 'Volver',
  colorConfirmar = '#dc3545',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div style={estilos.overlay} onClick={onCancel}>
      <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
        {/* Icono */}
        <div style={estilos.iconoWrap}>
          <span style={estilos.icono}>{icono}</span>
        </div>

        {/* Titulo */}
        <h3 style={estilos.titulo}>{titulo}</h3>

        {/* Mensaje */}
        <p style={estilos.mensaje}>{mensaje}</p>

        {/* Botones */}
        <div style={estilos.botones}>
          <button
            onClick={onCancel}
            style={estilos.botonCancelar}
            onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.target.style.background = '#f1f5f9'; }}
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirm}
            style={{ ...estilos.botonConfirmar, background: colorConfirmar }}
            onMouseEnter={(e) => { e.target.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.15s ease-out',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '28px 32px',
    maxWidth: '380px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0,0,0,0.05)',
    animation: 'scaleIn 0.2s ease-out',
  },
  iconoWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
    boxShadow: '0 2px 8px rgba(251, 146, 60, 0.25)',
  },
  icono: {
    fontSize: '1.6rem',
    lineHeight: 1,
  },
  titulo: {
    margin: '0 0 8px 0',
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  mensaje: {
    margin: '0 0 20px 0',
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.5,
  },
  botones: {
    display: 'flex',
    gap: '10px',
  },
  botonCancelar: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  botonConfirmar: {
    flex: 1,
    padding: '10px 16px',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};
