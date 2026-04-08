import React, { useState, useEffect } from 'react';

export default function ModalPagoQR({ qrData, onCancel }) {
  const [tiempoRestante, setTiempoRestante] = useState('');
  const [estadoPago, setEstadoPago] = useState('pending'); // 'pending', 'paid', 'cancelled', 'expired'

  // EFECTO 1: Cronómetro real de 15 minutos
  useEffect(() => {
    if (estadoPago !== 'pending') return; // Si ya se pagó o rechazó, detenemos el reloj

    const fechaExpiracion = new Date(qrData.expires_at).getTime();
    const intervalo = setInterval(() => {
      const ahora = new Date().getTime();
      const diferencia = fechaExpiracion - ahora;

      if (diferencia <= 0) {
        clearInterval(intervalo);
        setTiempoRestante("00:00");
        setEstadoPago('expired');
      } else {
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
        setTiempoRestante(`${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [qrData.expires_at, estadoPago]);

  // EFECTO 2: Polling - Preguntar al backend cada 3 segundos si el banco ya respondió
  useEffect(() => {
    if (estadoPago !== 'pending') return; // Solo preguntamos si sigue pendiente

    const consultarEstado = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/api/tickets/estado_orden/?order_id=${qrData.order_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          // Si el estado en la BD cambió, actualizamos la UI
          if (data.status !== 'pending') {
            setEstadoPago(data.status);
          }
        }
      } catch (error) {
        console.error("Error consultando estado:", error);
      }
    };

    const intervaloPolling = setInterval(consultarEstado, 3000); // Pregunta cada 3 segundos

    return () => clearInterval(intervaloPolling);
  }, [qrData.order_id, estadoPago]);


  // RENDERIZADO CONDICIONAL DE LA UI SEGÚN EL ESTADO DEL PAGO
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
        
        {/* --- ESTADO: RECHAZADO (Tu Subtarea) --- */}
        {estadoPago === 'cancelled' && (
          <div style={{ color: '#721c24', background: '#f8d7da', padding: '20px', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>❌</div>
            <h2 style={{ margin: '0 0 10px 0' }}>Pago Rechazado</h2>
            <p>La entidad financiera ha rechazado la transacción. Esto puede deberse a fondos insuficientes o un error de comunicación con tu app bancaria.</p>
            <button onClick={onCancel} style={btnStyle('#dc3545')}>Cerrar e intentar con otro método</button>
          </div>
        )}

        {/* --- ESTADO: PAGADO CON ÉXITO --- */}
        {estadoPago === 'paid' && (
          <div style={{ color: '#155724', background: '#d4edda', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
            <h2 style={{ margin: '0 0 10px 0' }}>¡Pago Exitoso!</h2>
            <p>Tu entrada ha sido generada correctamente y enviada a tu correo.</p>
            <button onClick={onCancel} style={btnStyle('#28a745')}>Ver mis entradas</button>
          </div>
        )}

        {/* --- ESTADO: EXPIRADO --- */}
        {estadoPago === 'expired' && (
          <div style={{ color: '#856404', background: '#fff3cd', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏱️</div>
            <h2 style={{ margin: '0 0 10px 0' }}>Tiempo Expirado</h2>
            <p>El código QR ya no es válido. Por favor, genera una nueva orden de compra.</p>
            <button onClick={onCancel} style={btnStyle('#6c757d')}>Volver al evento</button>
          </div>
        )}

        {/* --- ESTADO: PENDIENTE (Mostrando el QR) --- */}
        {estadoPago === 'pending' && (
          <>
            <h2>Total a pagar: Bs. {qrData.total_price}</h2>
            <p style={{ color: '#666' }}>Escanea este código con tu aplicación bancaria (Simple, BNB, Mercantil, etc).</p>
            
            <img 
              src={`data:image/png;base64,${qrData.qr_image}`} 
              alt="Código QR de Pago"
              style={{ width: '250px', height: '250px', border: '2px solid #eee', borderRadius: '8px' }}
            />
            
            <div style={{ margin: '20px 0', padding: '10px', background: '#e2e3e5', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#383d41' }}>⏳ Tiempo restante para pagar:</p>
              <p style={{ fontSize: '2rem', margin: '5px 0', fontWeight: '900', color: '#383d41' }}>{tiempoRestante}</p>
            </div>
            
            <button onClick={onCancel} style={btnStyle('#6c757d')}>Cancelar Pago</button>
          </>
        )}

      </div>
    </div>
  );
}

// Helper para los estilos de los botones para no repetir código
const btnStyle = (color) => ({
  padding: '10px 20px', background: color, color: 'white', border: 'none', 
  borderRadius: '6px', cursor: 'pointer', width: '100%', 
  fontSize: '1.1rem', fontWeight: 'bold', marginTop: '15px'
});