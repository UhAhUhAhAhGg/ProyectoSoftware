import React, { useState, useEffect } from 'react';
import TicketCard from '../../components/TicketCard';
import { Link } from 'react-router-dom';
// Importamos el hook que tienes en tu proyecto para la autenticación
import { useAuth } from '../../context/AuthContext'; 

export default function MisBoletos() {
  const [misEntradas, setMisEntradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // Extraemos info del usuario desde tu AuthContext
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Si no está logueado, no hacemos nada
    if (!isAuthenticated) return;

    const fetchMisEntradas = async () => {
      try {
        // Asegúrate de cambiar esto por la URL real de tu endpoint en Django
        // y de obtener el token de donde lo estés guardando (localStorage, cookies, etc.)
        const token = localStorage.getItem('token'); 

        const response = await fetch('http://127.0.0.1:8000/api/tickets/mis_entradas/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener los boletos de la base de datos');
        }

        const data = await response.json();
        setMisEntradas(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    fetchMisEntradas();
  }, [isAuthenticated]);

  if (cargando) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando tus boletos reales desde el servidor...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="mis-boletos-container" style={{ padding: '20px' }}>
      <Link to="/dashboard" style={{ display: 'inline-flex', marginBottom: '10px', textDecoration: 'none', fontWeight: 600 }}>
        ← Volver al dashboard
      </Link>
      <h2>🎟️ Mis Boletos Activos</h2>
      <p>Presenta el código QR en la entrada del evento. Si falla, el guardia puede usar el código alfanumérico.</p>
      
      {misEntradas.length === 0 ? (
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
          <p>Aún no has comprado entradas para ningún evento.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '20px', 
          justifyContent: 'center',
          marginTop: '30px'
        }}>
          {misEntradas.map((entrada) => (
            <div key={entrada.id} style={{ opacity: entrada.is_used ? 0.5 : 1 }}>
              <TicketCard 
                eventName={entrada.event_name}
                ticketType={entrada.ticket_type}
                qrCodeBase64={entrada.qr_code}
                emergencyCode={entrada.emergency_code}
              />
              {entrada.is_used && (
                <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center', marginTop: '10px' }}>
                  ESTA ENTRADA YA FUE USADA
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
