import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import VenueLayoutPreview from './VenueLayoutPreview';
import ModalPagoQR from './ModalPagoQR';
import SeatMapModal from '../../eventos/SeatMapModal';
import './DetalleEvento.css';
import WaitlistBanner from '../../WaitlistBanner';

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

  // Estado de cola virtual
  const [enCola, setEnCola] = useState(false);
  const [posicionCola, setPosicionCola] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await eventosService.getEventoById(id);
        setEvento(data);

        const token = localStorage.getItem('token');
        if (token) {
          try {
            // Verificar historial de compras
            const res = await fetch(`${process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002'}/api/v1/purchases/history/?event_id=${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const history = await res.json();
              const hasBought = history.results && history.results.some(p => p.event_id === id && (p.status === 'active' || p.status === 'pending'));
              setYaCompro(hasBought);
            }

            // Verificar si el usuario ya está en lista de espera
            const estadoCola = await eventosService.getEstadoWaitlist(id);
            setEnCola(estadoCola.enCola);
            setPosicionCola(estadoCola.posicion);
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

          {/* BANNER DE COLA VIRTUAL - Mostrar si el usuario ya está en cola al cargar */}
          {enCola && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '16px',
            }}>
              <p style={{
                fontWeight: '700',
                color: '#92400e',
                fontSize: '15px',
                margin: '0 0 6px 0',
              }}>
                ⏳ Estás en la lista de espera
              </p>
              {posicionCola && (
                <p style={{ margin: '0 0 4px 0', color: '#78350f', fontSize: '14px' }}>
                  <strong>Tu posición:</strong> #{posicionCola}
                </p>
              )}
              <p style={{ margin: '0', color: '#78350f', fontSize: '13px' }}>
                La compra de entradas está deshabilitada mientras estás en cola.
                Serás notificado cuando sea tu turno.
              </p>
            </div>
          )}

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
                  
                  {/* BOTÓN DE COMPRA O SELECCIÓN DE ASIENTOS - DESHABILITADO SI ESTÁ EN COLA */}
                  <button 
                    onClick={() => {
                      if (enCola) {
                        setErrorCompra('Estás en lista de espera. No puedes comprar hasta que sea tu turno.');
                        return;
                      }
                      if (t.filas && t.asientosPorFila) {
                        setSelectedTicketType(t);
                        setMostrarSeatMap(true);
                      } else {
                        handlePagarConQR(t.id, 1);
                      }
                    }}
                    disabled={cargandoCompra || t.disponibles <= 0 || yaCompro || enCola}
                    style={{
                      padding: '8px 16px',
                      background: (cargandoCompra || t.disponibles <= 0 || yaCompro || enCola) ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (cargandoCompra || t.disponibles <= 0 || yaCompro || enCola) ? 'not-allowed' : 'pointer'
                    }}
                    title={enCola ? 'Estás en lista de espera. Compra deshabilitada.' : ''}
                  >
                    {cargandoCompra ? 'Procesando...' : (enCola ? '🔒 En lista de espera' : (yaCompro ? 'Ya compraste entrada' : (t.filas && t.asientosPorFila ? 'Seleccionar Asientos' : 'Comprar')))}
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
    </section>
  );
}

export default DetalleEvento;
