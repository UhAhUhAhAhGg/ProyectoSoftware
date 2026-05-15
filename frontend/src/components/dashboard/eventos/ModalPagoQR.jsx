import React, { useState, useEffect, useCallback } from 'react';
import { eventosService } from '../../../services/eventosService';
import { useNavigate } from 'react-router-dom';
import { useQueue } from '../../../context/QueueContext';
import ConfirmDialog from '../../common/ConfirmDialog';

export default function ModalPagoQR({ ordenData, onCerrar, onVolver, asientosSeleccionados, hayColaActiva }) {
  const navigate = useNavigate();
  const { fueAdmitidoPorCola } = useQueue();
  const [tiempoRestante, setTiempoRestante] = useState('1:00');
  const [estadoPago, setEstadoPago] = useState('pending'); // pending | active | cancelled
  const [datosTicket, setDatosTicket] = useState(null);
  const [simulando, setSimulando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mostrarConfirm, setMostrarConfirm] = useState(false);

  // Cronómetro de expiración
  useEffect(() => {
    if (estadoPago !== 'pending') return;
    const fechaExp = new Date(ordenData.expires_at).getTime();
    const intervalo = setInterval(() => {
      const diff = fechaExp - Date.now();
      if (diff <= 0) {
        clearInterval(intervalo);
        setTiempoRestante('00:00');
        // Forzar consulta al backend para que cancele y libere asientos
        consultarEstado().then(() => {
          // Si la consulta no cambió el estado (backend aún no canceló),
          // forzar la vista de cancelado
          setEstadoPago(prev => prev === 'pending' ? 'cancelled' : prev);
        });
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTiempoRestante(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
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

  const handleCancelar = () => {
    // Advertencia si hay cola activa
    if (hayColaActiva || fueAdmitidoPorCola) {
      setMostrarConfirm(true);
      return;
    }
    ejecutarCancelacion();
  };

  const ejecutarCancelacion = async () => {
    setMostrarConfirm(false);
    // Solo cancelar si la compra aún está pendiente
    if (estadoPago === 'pending' && ordenData?.purchase_id) {
      setCancelando(true);
      try {
        await eventosService.cancelarCompra(ordenData.purchase_id);
      } catch {
        // Ignorar error: aunque falle, cerramos el modal 
        // La compra expirará sola por el backend
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
      overflowY: 'auto', padding: '20px 0',
    }}>
      <div style={{
        background: 'white', padding: '30px', borderRadius: '14px',
        textAlign: 'center', maxWidth: '420px', width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        maxHeight: '90vh', overflowY: 'auto',
        margin: 'auto',
      }}>

        {/* PAGO PENDIENTE */}
        {estadoPago === 'pending' && (
          <>
            <h2 style={{ margin: '0 0 4px 0' }}>Resumen de compra</h2>
            <p style={{ color: '#555', margin: '0 0 12px 0', fontSize: '0.95rem' }}>
              {ordenData.event_name}
            </p>

            {/* RESUMEN DETALLADO */}
            <div style={{
              background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8,
              padding: '12px', marginBottom: '12px', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                <span style={{ color: '#666' }}>Tipo de entrada:</span>
                <strong>{ordenData.ticket_type_name}</strong>
              </div>
              {asientosSeleccionados && asientosSeleccionados.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span style={{ color: '#666' }}>Asientos:</span>
                  <strong>{asientosSeleccionados.join(', ')}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                <span style={{ color: '#666' }}>Cantidad:</span>
                <strong>{asientosSeleccionados?.length || 1}</strong>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: '8px', borderTop: '1px solid #dee2e6',
                fontSize: '1.05rem', fontWeight: 'bold',
              }}>
                <span>Total:</span>
                <span style={{ color: '#28a745' }}>Bs. {ordenData.total}</span>
              </div>
            </div>

            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '8px' }}>
              📱 Escanea este QR con tu app bancaria
            </p>

            {ordenData.payment_qr && (
              <img
                src={`data:image/png;base64,${ordenData.payment_qr}`}
                alt="QR de pago"
                style={{ width: 180, height: 180, border: '2px solid #dee2e6', borderRadius: 8, marginBottom: 10 }}
              />
            )}

            <div style={{ background: '#e2e3e5', borderRadius: 8, padding: '8px', marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#383d41', fontSize: '0.85rem' }}>⏳ Tiempo restante:</p>
              <p style={{ fontSize: '1.6rem', margin: '2px 0', fontWeight: 900, color: '#383d41' }}>{tiempoRestante}</p>
            </div>

            {errorMsg && (
              <p style={{ color: '#721c24', background: '#f8d7da', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}>
                {errorMsg}
              </p>
            )}

            {/* BOTÓN DE SIMULACIÓN — solo para desarrollo */}
            <div style={{
              background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
              padding: '10px', marginBottom: 10,
            }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#856404', fontWeight: 'bold' }}>
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

            {/* BOTONES: Volver y Cancelar lado a lado */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {onVolver && (
                <button
                  onClick={onVolver}
                  disabled={cancelando}
                  style={{ ...btnStyle('#0d6efd'), flex: 1 }}
                >
                  ← Volver
                </button>
              )}
              <button
                onClick={handleCancelar}
                disabled={cancelando}
                style={{ ...btnStyle('#6c757d'), flex: 1 }}
              >
                {cancelando ? 'Cancelando...' : 'Cancelar'}
              </button>
            </div>
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

        {/* CANCELADO / EXPIRADO — vista unificada */}
        {estadoPago === 'cancelled' && (
          <div style={{ color: '#721c24', background: '#f8d7da', padding: 20, borderRadius: 8, border: '1px solid #f5c6cb' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>❌</div>
            <h2 style={{ margin: '0 0 8px 0' }}>Orden Cancelada</h2>
            <p>Esta orden de pago fue cancelada o expiró. Los asientos han sido liberados.</p>
            <button onClick={onCerrar} style={btnStyle('#dc3545')}>Volver al evento</button>
          </div>
        )}

      </div>

      {/* Diálogo de confirmación bonito */}
      <ConfirmDialog
        open={mostrarConfirm}
        icono="🚫"
        titulo="¿Cancelar la compra?"
        mensaje="Hay una cola de espera activa para este evento. Si cancelas, perderás tu turno y tendrás que volver a hacer cola."
        textoConfirmar="Sí, cancelar"
        textoCancelar="Seguir con el pago"
        onConfirm={ejecutarCancelacion}
        onCancel={() => setMostrarConfirm(false)}
      />
    </div>
  );
}


const btnStyle = (color) => ({
  padding: '10px 20px', background: color, color: 'white', border: 'none',
  borderRadius: 6, cursor: 'pointer', width: '100%', fontSize: '1rem',
  fontWeight: 'bold', marginTop: 4,
});
