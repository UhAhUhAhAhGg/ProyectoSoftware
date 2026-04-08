import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
<<<<<<< HEAD
import VenueLayoutPreview from './VenueLayoutPreview';
import ModalPagoQR from './ModalPagoQR'; // IMPORTAMOS NUESTRO MODAL REAL
=======
import { hasPurchasedForEvent, markEventAsPurchased } from '../../../services/profileService';
import { useAuth } from '../../../context/AuthContext';
import VenueLayoutPreview from './VenueLayoutPreview';
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
import './DetalleEvento.css';

function DetalleEvento() {
  const { id } = useParams();
<<<<<<< HEAD
  const [evento, setEvento] = useState(null);
  const [cargando, setCargando] = useState(true);

  // NUEVOS ESTADOS PARA LA COMPRA REAL
  const [cargandoCompra, setCargandoCompra] = useState(false);
  const [datosQR, setDatosQR] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
=======
  const { user, isPromotor } = useAuth();
  const [evento, setEvento] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [showCompra, setShowCompra] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [qrPayload, setQrPayload] = useState(null);
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await eventosService.getEventoById(id);
        setEvento(data);
      } catch {
        setEvento(null);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [id]);

<<<<<<< HEAD
  // FUNCIÓN REAL QUE LLAMA A TU BACKEND DE DJANGO
  const handlePagarConQR = async (ticketTypeId) => {
    setCargandoCompra(true);
    
    try {
      // Usamos el token real de tu sistema de login (ajusta esto si lo guardas distinto)
      const token = localStorage.getItem('token'); 

      const response = await fetch('http://127.0.0.1:8000/api/tickets/procesar_compra/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ticket_type_id: ticketTypeId, // El ID real de la entrada que clickeó
          quantity: 1 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Hubo un error al procesar la compra");
        return;
      }

      // Si todo sale bien, Django nos manda el QR y el tiempo de expiración
      setDatosQR(data);
      setMostrarModal(true);

    } catch (error) {
      console.error("Error en la conexión:", error);
      alert("No se pudo conectar con el servidor.");
    } finally {
      setCargandoCompra(false);
    }
  };
=======
  useEffect(() => {
    if (!user || !id) return;
    setAlreadyPurchased(hasPurchasedForEvent(id));
  }, [user, id]);

  function generateQrPayload(eventId) {
    const code = `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return JSON.stringify({ v: 1, code, eventId, userId: user?.id, ts: Date.now() });
  }

  function handlePagoCompletado() {
    markEventAsPurchased(id);
    setAlreadyPurchased(true);
    setShowCompra(false);
    setQrPayload(null);
  }
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)

  if (cargando) {
    return (
      <section className="detalle-evento estado-vacio">
        <div className="spinner"></div>
        <p>Cargando evento...</p>
      </section>
    );
  }

  if (!evento || evento.estado !== 'activo') {
    return (
      <section className="detalle-evento estado-vacio">
        <h2>Evento no disponible</h2>
        <p>El evento que intentas ver no existe o ya no está disponible.</p>
        <Link className="btn-volver" to="/dashboard/eventos">
          Volver a eventos disponibles
        </Link>
      </section>
    );
  }

  const porcentaje = evento.capacidad > 0
    ? Math.round((evento.boletosVendidos / evento.capacidad) * 100)
    : 0;

  return (
    <section className="detalle-evento">
      <Link className="volver-link" to="/dashboard/eventos">← Volver a eventos</Link>

      <div className="detalle-card">
        {evento.imagen && (
          <Image
            src={evento.imagen}
            alt={evento.nombre}
            width={1600}
            height={320}
            unoptimized
            className="detalle-imagen"
          />
        )}

        <div className="detalle-contenido">
          <h2>{evento.nombre}</h2>
          <p className="descripcion">{evento.descripcion}</p>

          <div className="info-grid">
            <p><strong>Fecha:</strong> {new Date(evento.fecha).toLocaleDateString('es-ES')}</p>
            <p><strong>Hora:</strong> {evento.hora}</p>
            <p><strong>Lugar:</strong> {evento.ubicacion}</p>
          </div>

          <VenueLayoutPreview
            tiposEntrada={evento.tiposEntrada}
            capacidadTotal={evento.capacidad}
            titulo="Distribucion del recinto"
            subtitulo="Consulta las zonas disponibles, ubicaciones premium y la relacion entre cupo y precio antes de seleccionar tu entrada."
          />

          {evento.tiposEntrada.length > 0 && (
            <div className="tipos-entrada">
              <h3>Tipos de entrada</h3>
              {evento.tiposEntrada.map((t) => (
<<<<<<< HEAD
                <div key={t.id} className="tipo-entrada-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <div>
                    <span className="tipo-nombre" style={{ display: 'block', fontWeight: 'bold' }}>{t.nombre}</span>
                    <span className="tipo-precio" style={{ display: 'block', color: '#666' }}>Bs. {t.precio}</span>
                    <span className="tipo-disponible" style={{ fontSize: '0.8rem', color: t.disponibles > 0 ? 'green' : 'red' }}>
                      {t.disponibles > 0 ? `${t.disponibles} disponibles` : 'Agotado'}
                    </span>
                  </div>
                  
                  {/* AQUÍ ESTÁ EL BOTÓN DE COMPRA REAL POR CADA TIPO DE ENTRADA */}
                  <button 
                    onClick={() => handlePagarConQR(t.id)}
                    disabled={cargandoCompra || t.disponibles <= 0}
                    style={{
                      padding: '8px 16px',
                      background: (cargandoCompra || t.disponibles <= 0) ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (cargandoCompra || t.disponibles <= 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {cargandoCompra ? 'Procesando...' : 'Pagar con QR'}
                  </button>
=======
                <div key={t.id} className="tipo-entrada-item">
                  <span className="tipo-nombre">{t.nombre}</span>
                  <span className="tipo-precio">Bs. {t.precio}</span>
                  <span className="tipo-disponible">{t.disponibles} disponibles</span>
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
                </div>
              ))}
            </div>
          )}

<<<<<<< HEAD
          <div className="disponibilidad" style={{ marginTop: '20px' }}>
            <div className="fila">
              <span>Disponibilidad general</span>
=======
          <div className="disponibilidad">
            <div className="fila">
              <span>Disponibilidad</span>
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
              <span>{evento.boletosVendidos}/{evento.capacidad}</span>
            </div>
            <div className="barra">
              <div className="fill" style={{ width: `${porcentaje}%` }}></div>
            </div>
          </div>

<<<<<<< HEAD
        </div>
      </div>

      {/* RENDERIZAMOS EL MODAL SI HAY DATOS DEL BACKEND */}
      {mostrarModal && datosQR && (
        <ModalPagoQR 
          qrData={datosQR} 
          onCancel={() => setMostrarModal(false)} 
        />
      )}
=======
          {alreadyPurchased && (
            <div className="restriccion-compra">
              <span className="restriccion-icono">⚠️</span>
              <div>
                <strong>Ya tienes una entrada para este evento.</strong>
                <p>Solo se permite una entrada por persona por evento. No puedes realizar una nueva compra.</p>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-seleccionar"
            onClick={() => setShowCompra(true)}
          >
            {isPromotor
              ? 'Ver información del evento'
              : alreadyPurchased
                ? 'Ver restricción de compra'
                : 'Seleccionar este evento'}
          </button>

          {showCompra && (
            <div className="compra-panel">
              <div className="compra-panel-header">
                <h3>
                  {isPromotor
                    ? 'Información para Promotores'
                    : alreadyPurchased
                      ? 'Restricción de compra'
                      : 'Completar compra'}
                </h3>
                <button className="compra-panel-cerrar" onClick={() => { setShowCompra(false); setQrPayload(null); }}>✕</button>
              </div>

              {isPromotor ? (
                <div className="compra-panel-restriccion">
                  <div className="restriccion-icono-grande">🎭</div>
                  <h4>Acción no disponible para Promotores</h4>
                  <p>Tu cuenta tiene el rol de <strong>Promotor</strong>, por lo que no puedes adquirir entradas en la plataforma.</p>
                  <p>La compra de entradas es exclusiva para cuentas con rol <strong>Comprador</strong>. Si necesitas asistir al evento, regístrate con una cuenta de comprador.</p>
                  <button className="btn-seleccionar" onClick={() => setShowCompra(false)}>Entendido</button>
                </div>
              ) : alreadyPurchased ? (
                <div className="compra-panel-restriccion">
                  <div className="restriccion-icono-grande">🚫</div>
                  <h4>Compra no permitida</h4>
                  <p>Ya existe una entrada registrada para tu cuenta en este evento.</p>
                  <p>La plataforma permite <strong>máximo una entrada por persona</strong> para garantizar acceso justo a todos los usuarios.</p>
                  <button className="btn-seleccionar" onClick={() => setShowCompra(false)}>Entendido</button>
                </div>
              ) : (
                <div className="compra-panel-opciones">
                  <p className="compra-evento-nombre">Evento: <strong>{evento.nombre}</strong></p>
                  <div className="compra-metodos">
                    <label className={`compra-metodo${selectedMethod === 'card' ? ' activo' : ''}`}>
                      <input type="radio" name="metodo" value="card" checked={selectedMethod === 'card'} onChange={() => setSelectedMethod('card')} />
                      💳 Pago con tarjeta
                    </label>
                    <label className={`compra-metodo${selectedMethod === 'qr' ? ' activo' : ''}`}>
                      <input type="radio" name="metodo" value="qr" checked={selectedMethod === 'qr'} onChange={() => setSelectedMethod('qr')} />
                      📱 Pago por QR
                    </label>
                  </div>

                  {selectedMethod === 'card' && (
                    <div className="compra-accion">
                      <p>Se procesará el pago con tarjeta registrada en tu cuenta.</p>
                      <button className="btn-seleccionar" onClick={() => {
                        handlePagoCompletado();
                        alert('✅ Pago con tarjeta registrado. ¡Gracias por tu compra!');
                      }}>Confirmar pago</button>
                    </div>
                  )}

                  {selectedMethod === 'qr' && (
                    <div className="compra-accion">
                      <p>Escanea el código QR con tu app bancaria para completar el pago.</p>
                      {!qrPayload ? (
                        <button className="btn-seleccionar" onClick={() => setQrPayload(generateQrPayload(id))}>
                          Generar QR de pago
                        </button>
                      ) : (
                        <div className="compra-qr">
                          <img
                            alt="QR de pago"
                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrPayload)}&size=200x200`}
                          />
                          <button className="btn-seleccionar" onClick={() => {
                            handlePagoCompletado();
                            alert('✅ Pago por QR confirmado. ¡Gracias por tu compra!');
                          }}>He pagado</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
    </section>
  );
}

<<<<<<< HEAD
export default DetalleEvento;
=======
export default DetalleEvento;
>>>>>>> 9507609 (Subiendo proyecto parte frontend Marcia)
