import React, { useState, useEffect, useCallback } from 'react';
import { eventosService } from '../../../services/eventosService';
import { useNavigate } from 'react-router-dom';

export default function ModalPagoQR({ ordenData, onCerrar }) {
  const navigate = useNavigate();
  const [tiempoRestante, setTiempoRestante] = useState('15:00');
  const [estadoPago, setEstadoPago] = useState('pending'); // pending | active | cancelled | expired
  const [datosTicket, setDatosTicket] = useState(null);
  const [simulando, setSimulando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cronómetro de expiración
  useEffect(() => {
    if (estadoPago !== 'pending') return;
    const fechaExp = new Date(ordenData.expires_at).getTime();
    const intervalo = setInterval(() => {
      const diff = fechaExp - Date.now();
      if (diff <= 0) {
        clearInterval(intervalo);
        setTiempoRestante('00:00');
        setEstadoPago('expired');
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTiempoRestante(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [ordenData.expires_at, estadoPago]);

  // Polling de estado cada 3 segundos
  const consultarEstado = useCallback(async () => {
    const data = await eventosService.consultarEstadoCompra(ordenData.purchase_id);
    if (!data) return;
    if (data.status === 'active') {
      setDatosTicket(data);
      setEstadoPago('active');
    } else if (data.status === 'cancelled') {
      setEstadoPago('cancelled');
    }
  }, [ordenData.purchase_id]);

  useEffect(() => {
    if (estadoPago !== 'pending') return;
    const poll = setInterval(consultarEstado, 3000);
    return () => clearInterval(poll);
  }, [estadoPago, consultarEstado]);

  const handleSimularPago = async () => {
    setSimulando(true);
    setErrorMsg('');
    try {
      const res = await eventosService.simularPago(ordenData.purchase_id);
      setDatosTicket(res.data);
      setEstadoPago('active');
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setSimulando(false);
    }
  };

  const handleCancelar = async () => {
    // Solo cancelar si la compra aún está pendiente
    if (estadoPago === 'pending' && ordenData?.purchase_id) {
      setCancelando(true);
      try {
        await eventosService.cancelarCompra(ordenData.purchase_id);
      } catch {
        // Ignorar error: aunque falle, cerramos el modal 
        // La compra expirará sola en 15 min por el backend
      } finally {
        setCancelando(false);
      }
    }
    onCerrar();
  };

  const handleVerMisCompras = () => {
    onCerrar();
    navigate('/dashboard/mis-compras');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', padding: '30px', borderRadius: '14px',
        textAlign: 'center', maxWidth: '420px', width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>

        {/* PAGO PENDIENTE */}
        {estadoPago === 'pending' && (
          <>
            <h2 style={{ margin: '0 0 4px 0' }}>Total: Bs. {ordenData.total}</h2>
            <p style={{ color: '#555', margin: '0 0 12px 0' }}>
              {ordenData.event_name} · {ordenData.ticket_type_name}
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px' }}>
              En producción: escanea este QR con tu app bancaria.
            </p>

            {ordenData.payment_qr && (
              <img
                src={`data:image/png;base64,${ordenData.payment_qr}`}
                alt="QR de pago"
                style={{ width: 200, height: 200, border: '2px solid #dee2e6', borderRadius: 8, marginBottom: 12 }}
              />
            )}

            <div style={{ background: '#e2e3e5', borderRadius: 8, padding: '10px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#383d41' }}>⏳ Tiempo restante:</p>
              <p style={{ fontSize: '2rem', margin: '4px 0', fontWeight: 900, color: '#383d41' }}>{tiempoRestante}</p>
            </div>

            {errorMsg && (
              <p style={{ color: '#721c24', background: '#f8d7da', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}>
                {errorMsg}
              </p>
            )}

            {/* BOTÓN DE SIMULACIÓN — solo para desarrollo */}
            <div style={{
              background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
              padding: '12px', marginBottom: 12,
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#856404', fontWeight: 'bold' }}>
                🛠️ MODO DESARROLLO
              </p>
              <button
                onClick={handleSimularPago}
                disabled={simulando}
                style={btnStyle(simulando ? '#aaa' : '#28a745')}
              >
                {simulando ? 'Procesando...' : '✅ Simular pago aprobado'}
              </button>
            </div>

            <button
              onClick={handleCancelar}
              disabled={cancelando}
              style={btnStyle('#6c757d')}
            >
              {cancelando ? 'Cancelando...' : 'Cancelar'}
            </button>
          </>
        )}

        {/* PAGO EXITOSO */}
        {estadoPago === 'active' && datosTicket && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
            <h2 style={{ margin: '0 0 6px 0', color: '#155724' }}>¡Pago Exitoso!</h2>
            <p style={{ color: '#555', marginBottom: 12 }}>Tu entrada ha sido generada.</p>

            {datosTicket.email_sent && datosTicket.email_sent_to && (
              <div style={{
                background: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: 8,
                padding: '10px 14px', marginBottom: 14, color: '#0c5460',
                fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: '1.2rem' }}>📧</span>
                <span>Ticket enviado a <strong>{datosTicket.email_sent_to}</strong></span>
              </div>
            )}
            {!datosTicket.email_sent && (
              <div style={{
                background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
                padding: '10px 14px', marginBottom: 14, color: '#856404',
                fontSize: '0.85rem',
              }}>
                ⚠️ No se pudo enviar el email. Descarga tu entrada desde "Mis Entradas".
              </div>
            )}

            <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #dee2e6' }}>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.8rem' }}>Código de respaldo</p>
              <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '1.4rem', letterSpacing: 4, fontFamily: 'monospace' }}>
                {datosTicket.backup_code}
              </p>
              <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.8rem' }}>Presenta este QR en el evento</p>
              {datosTicket.qr_code && (
                <img
                  src={`data:image/png;base64,${datosTicket.qr_code}`}
                  alt="QR de tu entrada"
                  style={{ width: 180, height: 180, border: '2px solid #dee2e6', borderRadius: 8 }}
                />
              )}
            </div>

            <button onClick={handleVerMisCompras} style={{ ...btnStyle('#0d6efd'), marginBottom: 8 }}>
              Ver mis entradas
            </button>
            <button onClick={onCerrar} style={btnStyle('#6c757d')}>Cerrar</button>
          </>
        )}

        {/* EXPIRADO - */}
        {estadoPago === 'expired' && (
          <div style={{ color: '#991b1b', background: '#fee2e2', padding: 20, borderRadius: 8, border: '1px solid #fca5a5' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>⚠️</div>
            
            {/* Texto exacto requerido por la Historia de Usuario */}
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem' }}>
              Tiempo para pagar agotado, asientos liberados
            </h2>
            
            <p style={{ color: '#7f1d1d', marginBottom: '15px' }}>
              El tiempo de reserva de 15 minutos ha concluido. Por favor, intenta comprar de nuevo si aún hay asientos disponibles.
            </p>
            
            <button onClick={handleCancelar} style={btnStyle('#6c757d')}>
              Volver al evento
            </button>
          </div>
        )}

        {/* CANCELADO */}
        {estadoPago === 'cancelled' && (
          <div style={{ color: '#721c24', background: '#f8d7da', padding: 20, borderRadius: 8, border: '1px solid #f5c6cb' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>❌</div>
            <h2 style={{ margin: '0 0 8px 0' }}>Orden Cancelada</h2>
            <p>Esta orden de pago fue cancelada o expiró.</p>
            <button onClick={onCerrar} style={btnStyle('#dc3545')}>Volver al evento</button>
          </div>
        )}

      </div>
    </div>
  );
}


const btnStyle = (color) => ({
  padding: '10px 20px', background: color, color: 'white', border: 'none',
  borderRadius: 6, cursor: 'pointer', width: '100%', fontSize: '1rem',
  fontWeight: 'bold', marginTop: 4,
});
