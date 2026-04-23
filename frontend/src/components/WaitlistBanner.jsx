import React from 'react';

const WaitlistBanner = ({ position, onCancel }) => {
  return (
    <div style={{
      padding: '10px',
      background: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeeba',
      borderRadius: 6,
      marginBottom: 10,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <div style={{ fontWeight: '700' }}>Estás en cola de espera</div>
        {position != null && (
          <div style={{ fontSize: '0.9rem' }}>Posición en cola: {position}</div>
        )}
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            background: '#d9534f',
            color: '#fff',
            border: 'none',
            padding: '6px 10px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Salir de la cola
        </button>
      )}
    </div>
  );
};

export default WaitlistBanner;
