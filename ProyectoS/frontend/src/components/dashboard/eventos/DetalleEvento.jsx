import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import VenueLayoutPreview from './VenueLayoutPreview';
import ModalPagoQR from './ModalPagoQR'; // IMPORTAMOS NUESTRO MODAL REAL
import './DetalleEvento.css';

function DetalleEvento() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [cargando, setCargando] = useState(true);

  // NUEVOS ESTADOS PARA LA COMPRA REAL
  const [cargandoCompra, setCargandoCompra] = useState(false);
  const [datosQR, setDatosQR] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

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

      {/* RENDERIZAMOS EL MODAL SI HAY DATOS DEL BACKEND */}
      {mostrarModal && datosQR && (
        <ModalPagoQR 
          qrData={datosQR} 
          onCancel={() => setMostrarModal(false)} 
        />
      )}
    </section>
  );
}

export default DetalleEvento;