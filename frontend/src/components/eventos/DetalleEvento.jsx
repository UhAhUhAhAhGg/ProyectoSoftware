<<<<<<< HEAD
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { hasPurchasedForEvent } from '../../services/profileService';

export default function DetalleEvento(props) {
  const { event } = props; // ajustar si el prop tiene otro nombre
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!user || !event?.id) {
        if (mounted) setCheckingPurchase(false);
        return;
      }
      setCheckingPurchase(true);
      const purchased = await hasPurchasedForEvent(event.id);
      if (mounted) {
        setAlreadyPurchased(purchased);
        setCheckingPurchase(false);
      }
    }
    check();
    return () => { mounted = false; };
=======
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasPurchasedForEvent, markEventAsPurchased } from '../../services/profileService';

export default function DetalleEvento(props) {
  const { event } = props;
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const { user } = useAuth();
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [qrPayload, setQrPayload] = useState(null);

  useEffect(() => {
    if (!user || !event?.id) {
      setCheckingPurchase(false);
      return;
    }
    setAlreadyPurchased(hasPurchasedForEvent(event.id));
    setCheckingPurchase(false);
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
  }, [user, event]);

  const handleBuy = () => {
    if (alreadyPurchased) {
      alert('Compra no permitida');
<<<<<<< HEAD
    } else {
      // ...code for buying
    }
  };

=======
      return;
    }
    // Mostrar opciones de pago
    setShowPaymentOptions(true);
  };

  function generateQrPayload({ eventId, amount = 0, userId } = {}) {
    // Payload simple: JSON con identificador, timestamp y código aleatorio
    const code = `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const payload = {
      v: 1,
      code,
      eventId,
      userId,
      amount,
      ts: Date.now(),
    };
    return JSON.stringify(payload);
  }

>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
  return (
    <div className="detalle-evento">
      {/* ...existing code... */}

      {!checkingPurchase && alreadyPurchased && (
        <div className="restriction-message" style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', borderRadius: 4, marginBottom: 12 }}>
          Atención: ya existe una compra registrada para este evento con su cuenta. Solo se permite una entrada por persona.
        </div>
      )}

      <button
        className="btn-comprar"
<<<<<<< HEAD
        onClick={handleBuy} /* adaptar al handler existente si tiene otro nombre */
=======
        onClick={handleBuy}
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
        disabled={alreadyPurchased}
      >
        {alreadyPurchased ? 'Compra no permitida' : 'Comprar entrada'}
      </button>

<<<<<<< HEAD
=======
      {showPaymentOptions && (
        <div className="payment-options" style={{ marginTop: 12, border: '1px solid #e6e6e6', padding: 12, borderRadius: 8 }}>
          <h4>Selecciona método de pago</h4>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="method" value="card" checked={selectedMethod === 'card'} onChange={() => setSelectedMethod('card')} /> Pago con tarjeta
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="method" value="qr" checked={selectedMethod === 'qr'} onChange={() => setSelectedMethod('qr')} /> Pago por QR
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            {selectedMethod === 'card' ? (
              <div>
                <p>Pago con tarjeta: aquí se integraría el formulario de tarjeta o la redirección al proveedor.</p>
                <button className="btn-principal" onClick={() => {
                  markEventAsPurchased(event.id);
                  setAlreadyPurchased(true);
                  setShowPaymentOptions(false);
                  alert('Pago con tarjeta registrado. ¡Gracias por tu compra!');
                }}>Pagar con tarjeta</button>
              </div>
            ) : (
              <div>
                <p>Pago por QR: genera un código QR que el usuario escaneará con su app bancaria.</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn-principal"
                    onClick={() => {
                      // Generar payload mínimo para el cobro y mostrar QR
                      const payload = generateQrPayload({ eventId: event.id, amount: event.precio || 0, userId: user?.id });
                      setQrPayload(payload);
                    }}
                  >
                    Generar QR
                  </button>
                  <button className="btn-secundario" onClick={() => setShowPaymentOptions(false)}>Cancelar</button>
                </div>

                {qrPayload && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                      <img alt="QR de pago" src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrPayload)}&size=250x250`} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Datos para pago</div>
                      <div>Evento: {event.name}</div>
                      <div>Monto: {event.precio ?? '0.00'}</div>
                      <div>Código: {qrPayload}</div>
                      <div style={{ marginTop: 8 }}>
                        <button className="btn-principal" onClick={() => {
                          markEventAsPurchased(event.id);
                          setAlreadyPurchased(true);
                          setShowPaymentOptions(false);
                          setQrPayload(null);
                          alert('Pago por QR registrado. ¡Gracias por tu compra!');
                        }}>He pagado</button>
                        <button className="btn-secundario" style={{ marginLeft: 8 }} onClick={() => setQrPayload(null)}>Cerrar QR</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
      {/* ...existing code... */}
    </div>
  );
}