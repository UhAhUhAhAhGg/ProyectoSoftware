import React, { useState, useEffect } from 'react';

// Recibe la data REAL que nos devolvió Django en el endpoint anterior
export default function ModalPagoQR({ qrData, onCancel }) {
  const [tiempoRestante, setTiempoRestante] = useState('');
  const [expiro, setExpiro] = useState(false);

  useEffect(() => {
    // Leemos la fecha exacta de expiración que mandó la Base de Datos
    const fechaExpiracion = new Date(qrData.expires_at).getTime();

    const intervalo = setInterval(() => {
      const ahora = new Date().getTime();
      const diferencia = fechaExpiracion - ahora;

      // Si el tiempo se acabó
      if (diferencia <= 0) {
        clearInterval(intervalo);
        setTiempoRestante("00:00");
        setExpiro(true);
      } else {
        // Calcular minutos y segundos restantes reales
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
        
        // Formatear para que siempre tenga 2 dígitos (ej: 09:05)
        setTiempoRestante(
          `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [qrData.expires_at]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '30px', borderRadius: '12px',
        textAlign: 'center', maxWidth: '400px', width: '90%'
      }}>
        <h2>Total a pagar: Bs. {qrData.total_price}</h2>
        
        {expiro ? (
          <div style={{ color: 'red', margin: '20px 0' }}>
            <h3>⏱️ El tiempo ha expirado</h3>
            <p>El código QR ya no es válido. Por favor, cierra esta ventana e intenta comprar de nuevo.</p>
          </div>
        ) : (
          <>
            <p style={{ color: '#666' }}>Escanea este código con tu aplicación bancaria.</p>
            {/* Renderizamos el QR REAL generado por Django */}
            <img 
              src={`data:image/png;base64,${qrData.qr_image}`} 
              alt="Código QR de Pago"
              style={{ width: '250px', height: '250px', border: '2px solid #eee', borderRadius: '8px' }}
            />
            
            <div style={{ margin: '20px 0', padding: '10px', background: '#fff3cd', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#856404' }}>
                ⏳ Tiempo restante para pagar:
              </p>
              <p style={{ fontSize: '2rem', margin: '5px 0', fontWeight: '900', color: '#856404' }}>
                {tiempoRestante}
              </p>
            </div>
          </>
        )}

        <button 
          onClick={onCancel}
          style={{
            padding: '10px 20px', background: expiro ? '#dc3545' : '#6c757d',
            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
            width: '100%', fontSize: '1.1rem', fontWeight: 'bold'
          }}
        >
          {expiro ? "Volver al evento" : "Cancelar Pago"}
        </button>
      </div>
    </div>
  );
}