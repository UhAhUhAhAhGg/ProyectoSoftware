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
  }, [user, event]);

  const handleBuy = () => {
    if (alreadyPurchased) {
      alert('Compra no permitida');
    } else {
      // ...code for buying
    }
  };

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
        onClick={handleBuy} /* adaptar al handler existente si tiene otro nombre */
        disabled={alreadyPurchased}
      >
        {alreadyPurchased ? 'Compra no permitida' : 'Comprar entrada'}
      </button>

      {/* ...existing code... */}
    </div>
  );
}