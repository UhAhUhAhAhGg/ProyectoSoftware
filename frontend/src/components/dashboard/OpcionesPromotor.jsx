import { Link } from 'react-router-dom';
import { useState } from 'react';
import './OpcionesPromotor.css';

function OpcionesPromotor() {
  const [estadisticas] = useState({
    eventosActivos: 3,
    boletosVendidos: 150,
    ingresosTotales: 75000,
    eventosProximos: 2
  });

  const opcionesPrincipales = [
    {
      id: 'crear-evento',
      icono: '➕',
      titulo: 'Crear Evento',
      descripcion: 'Publica un nuevo evento en la plataforma',
      link: '/dashboard/crear-evento',
      color: '#AD8149',
      primary: true
    },
    {
      id: 'mis-eventos',
      icono: '📋',
      titulo: 'Mis Eventos',
      descripcion: 'Gestiona todos tus eventos',
      link: '/dashboard/mis-eventos',
      color: '#EABF0B',
      contador: estadisticas.eventosActivos
    },
    {
      id: 'ventas',
      icono: '💰',
      titulo: 'Ventas',
      descripcion: 'Revisa tus ventas y ganancias',
      link: '/dashboard/ventas',
      color: '#363A33',
      contador: `$${estadisticas.ingresosTotales}`
    }
  ];

  const opcionesGestion = [
    {
      id: 'perfil',
      icono: '👤',
      titulo: 'Mi Perfil',
      descripcion: 'Edita tus datos personales',
      link: '/dashboard/perfil'
    },
    {
      id: 'boletos-vendidos',
      icono: '🎟️',
      titulo: 'Boletos Vendidos',
      descripcion: 'Lista de boletos vendidos',
      link: '/dashboard/boletos-vendidos',
      contador: estadisticas.boletosVendidos
    },
    {
      id: 'asistencia',
      icono: '✅',
      titulo: 'Control de Asistencia',
      descripcion: 'Registra asistentes a tus eventos',
      link: '/dashboard/asistencia'
    },
    {
      id: 'estadisticas',
      icono: '📊',
      titulo: 'Estadísticas',
      descripcion: 'Analiza el rendimiento de tus eventos',
      link: '/dashboard/estadisticas'
    },
    {
      id: 'promociones',
      icono: '📢',
      titulo: 'Promociones',
      descripcion: 'Crea descuentos y ofertas',
      link: '/dashboard/promociones'
    },
    {
      id: 'pagos',
      icono: '💳',
      titulo: 'Pagos y Cobros',
      descripcion: 'Gestiona tus métodos de pago',
      link: '/dashboard/pagos'
    },
    {
      id: 'mensajes',
      icono: '💬',
      titulo: 'Mensajes',
      descripcion: 'Conversa con compradores',
      link: '/dashboard/mensajes'
    }
  ];

  return (
    <div className="opciones-promotor">
      <div className="bienvenida-promotor">
        <h2>¡Bienvenido Promotor! 🎉</h2>
        <p>Gestiona tus eventos y revisa tus ventas</p>
      </div>

      {/* Botón principal de crear evento - MUY DESTACADO */}
      <div className="accion-principal">
        <Link to="/dashboard/crear-evento" className="btn-crear-evento">
          <span className="btn-icono-grande">➕</span>
          <span className="btn-texto">
            <strong>Crear Nuevo Evento</strong>
            <small>Publica y vende boletos</small>
          </span>
          <span className="btn-flecha">→</span>
        </Link>
      </div>

      {/* Tarjetas de resumen */}
      <div className="resumen-stats">
        <div className="stat-card">
          <span className="stat-valor">{estadisticas.eventosActivos}</span>
          <span className="stat-etiqueta">Eventos Activos</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">{estadisticas.boletosVendidos}</span>
          <span className="stat-etiqueta">Boletos Vendidos</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">${estadisticas.ingresosTotales}</span>
          <span className="stat-etiqueta">Ingresos Totales</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">{estadisticas.eventosProximos}</span>
          <span className="stat-etiqueta">Próximos Eventos</span>
        </div>
      </div>

      {/* Opciones principales en grid */}
      <div className="opciones-grid">
        {opcionesPrincipales.map(opcion => (
          <Link to={opcion.link} key={opcion.id} className={`opcion-card-principal ${opcion.primary ? 'primary' : ''}`}>
            <div className="opcion-icono-wrapper" style={{ backgroundColor: opcion.color + '20' }}>
              <span className="opcion-icono" style={{ color: opcion.color }}>{opcion.icono}</span>
            </div>
            <div className="opcion-contenido">
              <h3>{opcion.titulo}</h3>
              <p>{opcion.descripcion}</p>
            </div>
            {opcion.contador && (
              <span className="opcion-valor" style={{ backgroundColor: opcion.color }}>
                {opcion.contador}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Sección de gestión */}
      <div className="gestion-section">
        <h3>Herramientas de Gestión</h3>
        <div className="gestion-grid">
          {opcionesGestion.map(opcion => (
            <Link to={opcion.link} key={opcion.id} className="gestion-card">
              <span className="gestion-icono">{opcion.icono}</span>
              <div className="gestion-info">
                <h4>{opcion.titulo}</h4>
                <p>{opcion.descripcion}</p>
              </div>
              {opcion.contador && (
                <span className="gestion-contador">{opcion.contador}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Eventos próximos */}
      <div className="proximos-eventos">
        <div className="proximos-header">
          <h3>Tus próximos eventos</h3>
          <Link to="/dashboard/mis-eventos" className="ver-todos">Gestionar eventos →</Link>
        </div>
        <div className="eventos-lista">
          {[1, 2].map(item => (
            <div key={item} className="evento-proximo-card">
              <div className="evento-proximo-info">
                <h4>Evento {item}</h4>
                <p>📅 25 de Marzo, 2024 - 20:00</p>
                <p>📍 Estadio Centenario</p>
                <div className="evento-proximo-stats">
                  <span>🎟️ 45/100 boletos</span>
                  <span>💰 $22,500</span>
                </div>
              </div>
              <div className="evento-proximo-acciones">
                <Link to={`/dashboard/evento/${item}`} className="btn-accion">Ver</Link>
                <Link to={`/dashboard/evento/${item}/editar`} className="btn-accion secundario">Editar</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips para promotores */}
      <div className="tips-section">
        <h3>💡 Tips para promotores</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>Promociona tus eventos</h4>
            <p>Usa las redes sociales para llegar a más personas</p>
          </div>
          <div className="tip-card">
            <h4>Precios dinámicos</h4>
            <p>Ofrece descuentos por compra anticipada</p>
          </div>
          <div className="tip-card">
            <h4>Comunícate</h4>
            <p>Responde rápido las consultas de los compradores</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpcionesPromotor;