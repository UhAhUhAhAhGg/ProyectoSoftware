import React, { useState } from 'react';

export default function ModalPagoQR({ qrData, onCancel, onPagoConfirmado, concepto }) {
  const [simulando, setSimulando] = useState(false);

  const handleSimularPago = async () => {
    setSimulando(true);
    // onPagoConfirmado hace la llamada al backend para activar la promoción
    await onPagoConfirmado('COMPROBANTE_SIMULADO');
    setSimulando(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '30px', borderRadius: '12px',
        textAlign: 'center', maxWidth: '400px', width: '90%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Resumen de pago</h2>
        <p style={{ margin: '0 0 15px 0', color: '#64748b' }}>{concepto}</p>
        
        <div style={{ borderBottom: '1px dashed #ccc', marginBottom: '15px' }}></div>
        
        <h3 style={{ color: '#16a34a', fontSize: '1.5rem', margin: '0 0 20px 0' }}>
          Total: Bs. {qrData.total_price}
        </h3>
        
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px' }}>
          Escanea este código para completar tu compra
        </p>
        
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PagoPromocion`} 
          alt="Código QR de Pago"
          style={{ width: '220px', height: '220px', border: '2px solid #eee', borderRadius: '8px', marginBottom: '20px' }}
        />

        <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fde68a' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#92400e', fontSize: '0.85rem' }}>
            🛠️ MODO DESARROLLO
          </p>
          <button 
            onClick={handleSimularPago}
            disabled={simulando}
            style={{
              width: '100%', padding: '12px', background: '#16a34a', color: 'white', 
              border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: simulando ? 'not-allowed' : 'pointer', 
              fontSize: '1rem', transition: 'background 0.2s'
            }}
          >
            {simulando ? 'Procesando...' : '✅ Simular pago aprobado'}
          </button>
        </div>

        <button 
          onClick={onCancel}
          style={{
            padding: '10px 20px', background: '#64748b',
            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
            width: '100%', fontSize: '1.1rem', fontWeight: 'bold', transition: 'background 0.2s'
          }}
        >
          Cancelar Pago
        </button>
      </div>
    </div>
  );
}