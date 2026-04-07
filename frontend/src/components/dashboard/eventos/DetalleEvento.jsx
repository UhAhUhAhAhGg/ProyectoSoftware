import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link, useParams } from 'react-router-dom';
import { eventosService } from '../../../services/eventosService';
import VenueLayoutPreview from './VenueLayoutPreview';
import './DetalleEvento.css';
import TicketView from '../../TicketView';

function DetalleEvento() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        // 🔵 CÓDIGO REAL (cuando backend esté listo)
        // const data = await eventosService.getEventoById(id);
        // setEvento(data);

        // 🟡 DEMO TEMPORAL
        const data = {
          id: 1,
          nombre: "Evento Demo",
          descripcion: "Evento de prueba",
          fecha: new Date(),
          hora: "20:00",
          ubicacion: "La Paz",
          estado: "activo",
          capacidad: 100,
          boletosVendidos: 20,
          tiposEntrada: [
            {
              id: 1,
              nombre: "General",
              precio: 50,
              disponibles: 80
            }
          ]
        };

        setEvento(data);

      } catch {
        setEvento(null);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [id]);

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
            subtitulo="Consulta las zonas disponibles antes de seleccionar tu entrada."
          />

          {evento.tiposEntrada?.length > 0 && (
            <div className="tipos-entrada">
              <h3>Tipos de entrada</h3>
              {evento.tiposEntrada.map((t) => (
                <div key={t.id} className="tipo-entrada-item">
                  <span className="tipo-nombre">{t.nombre}</span>
                  <span className="tipo-precio">Bs. {t.precio}</span>
                  <span className="tipo-disponible">{t.disponibles} disponibles</span>
                </div>
              ))}
            </div>
          )}

          <div className="disponibilidad">
            <div className="fila">
              <span>Disponibilidad</span>
              <span>{evento.boletosVendidos}/{evento.capacidad}</span>
            </div>
            <div className="barra">
              <div className="fill" style={{ width: `${porcentaje}%` }}></div>
            </div>
          </div>

          {/* 🟢 BOTÓN DEMO */}
          <button
            type="button"
            className="btn-seleccionar"
            onClick={() => {
              const ticketDemo = {
                evento: evento.nombre,
                usuario: "Usuario Demo",
                fecha: new Date().toLocaleDateString(),
                codigo: "ABC123XYZ",
                qr: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Demo",
                pdf: "#"
              };
              setTicket(ticketDemo);
            }}
          >
            Comprar entrada
          </button>

          {/* 🟢 TICKET */}
          {ticket && <TicketView ticket={ticket} />}

        </div>
      </div>
    </section>
  );
}

export default DetalleEvento;
