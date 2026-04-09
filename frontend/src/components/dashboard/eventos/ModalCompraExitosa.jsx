import { useNavigate } from 'react-router-dom';

export default function ModalCompraExitosa({ datos, onCerrar }) {
  const navigate = useNavigate();

  const handleVerMisCompras = () => {
    onCerrar();
    navigate('/dashboard/mis-compras');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', padding: '32px', borderRadius: '14px',
        textAlign: 'center', maxWidth: '420px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🎉</div>
        <h2 style={{ margin: '0 0 6px 0', color: '#155724' }}>¡Compra Exitosa!</h2>
        <p style={{ color: '#555', marginBottom: '18px' }}>
          Tu entrada para <strong>{datos.event_name}</strong> ha sido confirmada.
        </p>

        <div style={{
          background: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '18px',
          border: '1px solid #dee2e6',
        }}>
          <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Tipo de entrada</p>
          <p style={{ margin: '0 0 12px 0', fontWeight: 'bold' }}>{datos.ticket_type_name}</p>

          <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Total pagado</p>
          <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '1.25rem', color: '#0d6efd' }}>
            Bs. {parseFloat(datos.total).toFixed(2)}
          </p>

          <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.85rem' }}>Código de respaldo</p>
          <p style={{
            margin: '0', fontWeight: 'bold', fontSize: '1.4rem', letterSpacing: '4px',
            color: '#212529', fontFamily: 'monospace',
          }}>
            {datos.backup_code}
          </p>
        </div>

        {datos.qr_code && (
          <>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '8px' }}>
              Presenta este QR en el evento
            </p>
            <img
              src={`data:image/png;base64,${datos.qr_code}`}
              alt="QR de tu entrada"
              style={{
                width: '200px', height: '200px', border: '2px solid #dee2e6',
                borderRadius: '8px', marginBottom: '18px',
              }}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <button onClick={handleVerMisCompras} style={btnStyle('#0d6efd')}>
            Ver mis entradas
          </button>
          <button onClick={onCerrar} style={btnStyle('#6c757d')}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle = (color) => ({
  padding: '10px 20px', background: color, color: 'white', border: 'none',
  borderRadius: '6px', cursor: 'pointer', width: '100%',
  fontSize: '1rem', fontWeight: 'bold',
});
