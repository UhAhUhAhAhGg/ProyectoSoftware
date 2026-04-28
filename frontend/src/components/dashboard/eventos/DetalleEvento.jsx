import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import VenueLayoutPreview from './VenueLayoutPreview';
import ModalPagoQR from './ModalPagoQR';
import SeatMapModal from '../../eventos/SeatMapModal';
import ColaEspera from './ColaEspera';
import './DetalleEvento.css';
import WaitlistBanner from '../../WaitlistBanner';

const QUEUE_URL = process.env.REACT_APP_QUEUE_URL || 'http://localhost:8003';

function DetalleEvento() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [cargandoCompra, setCargandoCompra] = useState(false);
  const [ordenCompra, setOrdenCompra] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [errorCompra, setErrorCompra] = useState('');
  const [waitlistInfo, setWaitlistInfo] = useState(null);
  const waitlistPollRef = useRef(null);

  // Estados para el mapa de asientos interactivo
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [mostrarSeatMap, setMostrarSeatMap] = useState(false);
  const [yaCompro, setYaCompro] = useState(false);
  const seatSelectionStart = useRef(null); // HS18: registra cuándo entró al mapa de asientos

  // Estados para la cola virtual (HS18)
  const [verificandoCola, setVerificandoCola] = useState(false);
  const [enCola, setEnCola] = useState(false);
  const [colaInfo, setColaInfo] = useState(null); // { position, estimated_wait_minutes, queue_entry_id }
  const [colaError, setColaError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await eventosService.getEventoById(id);
        setEvento(data);

        const token = localStorage.getItem('token');
        if (token) {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002'}/api/v1/purchases/history/?event_id=${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const history = await res.json();
              const hasBought = history.results && history.results.some(p => p.event_id === id && (p.status === 'active' || p.status === 'pending'));
              setYaCompro(hasBought);
            }
          } catch (err) { /* ignorar error de red en historial */ }
        }
      } catch {
        setEvento(null);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [id]);

  const handlePagarConQR = async (ticketTypeId, quantity = 1) => {
    setCargandoCompra(true);
    setErrorCompra('');
    try {
      const respuesta = await eventosService.realizarCompra(id, ticketTypeId, quantity);
      if (respuesta.status === 'waitlist') {
        const purchaseId = respuesta.data?.id || respuesta.data?.purchase_id || respuesta.data?.purchaseId;
        const position = respuesta.data?.queue_position ?? null;
        setWaitlistInfo({ purchaseId, position });
        startWaitlistPolling(purchaseId);
        return;
      }
      setOrdenCompra(respuesta.data);
      setMostrarModal(true);
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Error al iniciar la compra';
      setErrorCompra(msg);
      alert('Aviso: ' + msg);
    } finally {
      setCargandoCompra(false);
    }
  };

  const stopWaitlistPolling = () => {
    if (waitlistPollRef.current) {
      clearInterval(waitlistPollRef.current);
      waitlistPollRef.current = null;
    }
  };

  const startWaitlistPolling = (purchaseId) => {
    stopWaitlistPolling();
    if (!purchaseId) return;
    waitlistPollRef.current = setInterval(async () => {
      try {
        const status = await eventosService.consultarEstadoCompra(purchaseId);
        if (!status) return;
        if (status.queue_position !== undefined) {
          setWaitlistInfo((prev) => ({ ...(prev || {}), position: status.queue_position }));
        }
        const s = status.status || status.state || null;
        if (s === 'confirmed' || s === 'completed' || s === 'paid' || s === 'success') {
          stopWaitlistPolling();
          setWaitlistInfo(null);
          setOrdenCompra(status.data ?? status.purchase ?? status);
          setMostrarModal(true);
        } else if (s === 'cancelled' || s === 'failed') {
          stopWaitlistPolling();
          setWaitlistInfo(null);
          setErrorCompra('Tu posición en la cola fue cancelada.');
        }
      } catch (err) {
        console.error('Error consultando estado de compra:', err);
      }
    }, 5000);
  };

  const handleCancelWaitlist = async () => {
    if (!waitlistInfo?.purchaseId) return;
    try {
      stopWaitlistPolling();
      await eventosService.cancelarCompra(waitlistInfo.purchaseId);
      setWaitlistInfo(null);
      setErrorCompra('Has salido de la cola.');
    } catch (err) {
      console.error('Error cancelando espera:', err);
      setErrorCompra('No se pudo salir de la cola. Intenta nuevamente.');
    }
  };

  // HS18: Verificar acceso con service-queue antes de mostrar el SeatMap
  const verificarAccesoConCola = useCallback(async (ticketType, accionSinAsientos) => {
    const token = localStorage.getItem('token');
    if (!token || !id) {
      // Sin token o sin evento, continuar normal
      seatSelectionStart.current = Date.now();
      if (accionSinAsientos) accionSinAsientos();
      else { setSelectedTicketType(ticketType); setMostrarSeatMap(true); }
      return;
    }

    setVerificandoCola(true);
    setColaError('');
    try {
      const res = await fetch(`${QUEUE_URL}/api/v1/queue/${id}/enter/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.status === 403) {
        setColaError(data.error || 'Tu tiempo en la cola ha expirado.');
        return;
      }

      // FIX: el backend devuelve can_proceed, no queued
      if (data.can_proceed === false) {
        // Mandar a la cola de espera
        setEnCola(true);
        setColaInfo({
          position: data.position,
          estimated_wait_minutes: data.estimated_wait_minutes,
          queue_entry_id: data.queue_entry_id,
        });
      } else {
        // Acceso libre — registrar inicio y continuar al SeatMap o compra directa
        seatSelectionStart.current = Date.now();
        if (accionSinAsientos) {
          accionSinAsientos();
        } else {
          setSelectedTicketType(ticketType);
          setMostrarSeatMap(true);
        }
      }
    } catch (err) {
      // Si service-queue no está disponible, permitir acceso (fail-open)
      console.warn('service-queue no disponible, permitiendo acceso:', err);
      seatSelectionStart.current = Date.now();
      if (accionSinAsientos) accionSinAsientos();
      else { setSelectedTicketType(ticketType); setMostrarSeatMap(true); }
    } finally {
      setVerificandoCola(false);
    }
  }, [id]);

  // Cuando el usuario es admitido desde la ColaEspera
  const handleAdmitidoDesdeCola = useCallback(() => {
    setEnCola(false);
    setColaInfo(null);
    if (selectedTicketType) {
      setMostrarSeatMap(true);
    }
  }, [selectedTicketType]);

  // Si hubo error de expiración en la ColaEspera
  const handleErrorDesdeCola = useCallback((msg) => {
    setEnCola(false);
    setColaInfo(null);
    setColaError(msg);
  }, []);
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
          <img
            src={evento.imagen}
            alt={evento.nombre}
            className="detalle-imagen"
            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
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
            subtitulo="Consulta las zonas disponibles antes de seleccionar tu entrada."
          />

          {evento.tiposEntrada?.length > 0 && (
            <div className="tipos-entrada">
              <h3>Tipos de entrada</h3>
              {waitlistInfo && (
                <WaitlistBanner position={waitlistInfo.position} onCancel={handleCancelWaitlist} />
              )}
              {errorCompra && (
                <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '10px', border: '1px solid #f5c6cb' }}>
                  {errorCompra}
                </div>
              )}
              {evento.tiposEntrada.map((t) => (
                <div key={t.id} className="tipo-entrada-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <div>
                    <span className="tipo-nombre" style={{ display: 'block', fontWeight: 'bold' }}>{t.nombre}</span>
                    <span className="tipo-precio" style={{ display: 'block', color: '#666' }}>Bs. {t.precio}</span>
                    <span className="tipo-disponible" style={{ fontSize: '0.8rem', color: t.disponibles > 0 ? 'green' : 'red' }}>
                      {t.disponibles > 0 ? `${t.disponibles} disponibles` : 'Agotado'}
                    </span>
                  </div>
                  
                  {/* BOTÓN DE COMPRA — Pasa por la cola virtual (HS18) */}
                  {colaError && (
                    <div style={{ fontSize: '0.78rem', color: '#ef9a9a', marginBottom: '6px' }}>
                      {colaError}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (t.filas && t.asientosPorFila) {
                        // Con mapa de asientos → verificar cola primero
                        verificarAccesoConCola(t, null);
                      } else {
                        // Sin mapa → verificar cola y luego compra directa
                        verificarAccesoConCola(t, () => handlePagarConQR(t.id, 1));
                      }
                    }}
                    disabled={cargandoCompra || verificandoCola || t.disponibles <= 0 || yaCompro}
                    style={{
                      padding: '8px 16px',
                      background: (cargandoCompra || verificandoCola || t.disponibles <= 0 || yaCompro) ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (cargandoCompra || verificandoCola || t.disponibles <= 0 || yaCompro) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {verificandoCola ? 'Verificando disponibilidad...' : cargandoCompra ? 'Procesando...' : (yaCompro ? 'Ya compraste entrada' : (t.filas && t.asientosPorFila ? 'Seleccionar Asientos' : 'Comprar'))}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="disponibilidad" style={{ marginTop: '20px' }}>
            <div className="fila">
              <span>Disponibilidad general</span>
              <span>{evento.boletosVendidos}/{evento.capacidad}</span>
            </div>
            <div className="barra">
              <div className="fill" style={{ width: `${porcentaje}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE PAGO QR */}
      {mostrarModal && ordenCompra && (
        <ModalPagoQR
          ordenData={ordenCompra}
          seatStartTime={seatSelectionStart.current}
          onCerrar={() => { setMostrarModal(false); setOrdenCompra(null); }}
        />
      )}

      {/* MODAL DE SELECCIÓN DE ASIENTOS INTERACTIVO */}
      {mostrarSeatMap && selectedTicketType && (
        <SeatMapModal
          open={mostrarSeatMap}
          onClose={() => { setMostrarSeatMap(false); setSelectedTicketType(null); }}
          eventId={id}
          ticketType={selectedTicketType}
          onConfirm={(selectedSeats) => {
            setMostrarSeatMap(false);
            handlePagarConQR(selectedTicketType.id, selectedSeats.length || 1);
          }}
        />
      )}

      {/* PANTALLA DE COLA VIRTUAL (HS18) */}
      {enCola && colaInfo && (
        <ColaEspera
          eventId={id}
          queueEntryId={colaInfo.queue_entry_id}
          posicionInicial={colaInfo.position}
          etaInicial={colaInfo.estimated_wait_minutes}
          onAdmitido={handleAdmitidoDesdeCola}
          onError={handleErrorDesdeCola}
        />
      )}
    </section>
  );
}

export default DetalleEvento;
