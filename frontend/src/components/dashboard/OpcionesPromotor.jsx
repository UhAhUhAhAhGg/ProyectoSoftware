import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { eventosService } from '../../services/eventosService';
import './OpcionesPromotor.css';

// Estado del Promotor "real": las stats se calculan desde sus eventos.
// Solo se enlazan a paginas que realmente existen en App.jsx; las demas
// (asistencia, estadisticas, promociones, pagos, mensajes) quedan marcadas
// como "Proximamente" para evitar links muertos.
function OpcionesPromotor() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    eventosActivos: 0,
    boletosVendidos: 0,
    ingresosTotales: 0,
    eventosProximos: 0,
    loading: true,
  });
  const [proximos, setProximos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const cargar = async () => {
      try {
        const eventos = await eventosService.getEventosByPromotor(user.id);
        if (cancelled) return;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Activos = publicados (no finalizados ni cancelados)
        const activos = eventos.filter(e => e.estado === 'activo');

        // Boletos vendidos e ingresos suman todos los tipos de entrada
        let boletosVendidos = 0;
        let ingresos = 0;
        for (const ev of eventos) {
          for (const t of ev.tiposEntrada || []) {
            const vendidos = t.cupoVendido || 0;
            boletosVendidos += vendidos;
            ingresos += vendidos * (t.precio || 0);
          }
        }

        // Proximos eventos: fecha futura, ordenados por fecha asc
        const futuros = activos
          .filter(e => e.fecha && new Date(e.fecha) >= hoy)
          .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        setStats({
          eventosActivos: activos.length,
          boletosVendidos,
          ingresosTotales: ingresos,
          eventosProximos: futuros.length,
          loading: false,
        });
        setProximos(futuros.slice(0, 3));
      } catch (err) {
        console.warn('Error cargando datos del promotor:', err?.message);
        if (!cancelled) {
          setError('No se pudieron cargar tus datos. Intenta recargar la página.');
          setStats(s => ({ ...s, loading: false }));
        }
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [user?.id]);

  const formatCurrency = (n) => `Bs. ${Number(n || 0).toLocaleString('es-BO')}`;

  // Herramientas de gestion. `disabled: true` marca lo no implementado.
  const herramientas = [
    { id: 'mis-eventos', icono: '📋', titulo: 'Mis Eventos', descripcion: 'Gestiona todos tus eventos', link: '/dashboard/mis-eventos' },
    { id: 'perfil', icono: '👤', titulo: 'Mi Perfil', descripcion: 'Edita tus datos personales', link: '/dashboard/perfil' },
    { id: 'crear', icono: '➕', titulo: 'Crear evento', descripcion: 'Publica un nuevo evento', link: '/dashboard/crear-evento' },
    { id: 'estadisticas', icono: '📊', titulo: 'Estadísticas', descripcion: 'Analiza el rendimiento de tus eventos', disabled: true },
    { id: 'pagos', icono: '💳', titulo: 'Pagos y Cobros', descripcion: 'Gestiona tus métodos de pago', disabled: true },
    { id: 'asistencia', icono: '✅', titulo: 'Control de Asistencia', descripcion: 'Registra asistentes a tus eventos', disabled: true },
  ];

  return (
    <div className="opciones-promotor">
      <div className="bienvenida-promotor">
        <h2>¡Bienvenido Promotor! 🎉</h2>
        <p>Gestiona tus eventos y revisa tus ventas</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Acción principal */}
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

      {/* Stats reales */}
      <div className="resumen-stats">
        <div className="stat-card">
          <span className="stat-valor">{stats.loading ? '…' : stats.eventosActivos}</span>
          <span className="stat-etiqueta">Eventos activos</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">{stats.loading ? '…' : stats.boletosVendidos}</span>
          <span className="stat-etiqueta">Boletos vendidos</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">{stats.loading ? '…' : formatCurrency(stats.ingresosTotales)}</span>
          <span className="stat-etiqueta">Ingresos totales</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">{stats.loading ? '…' : stats.eventosProximos}</span>
          <span className="stat-etiqueta">Próximos eventos</span>
        </div>
      </div>

      {/* Herramientas de gestion */}
      <div className="gestion-section">
        <h3>Herramientas de Gestión</h3>
        <div className="gestion-grid">
          {herramientas.map(opcion => (
            opcion.disabled ? (
              <div key={opcion.id} className="gestion-card gestion-card-disabled" title="Próximamente">
                <span className="gestion-icono">{opcion.icono}</span>
                <div className="gestion-info">
                  <h4>{opcion.titulo}</h4>
                  <p>{opcion.descripcion}</p>
                </div>
                <span className="gestion-badge">Próximamente</span>
              </div>
            ) : (
              <Link to={opcion.link} key={opcion.id} className="gestion-card">
                <span className="gestion-icono">{opcion.icono}</span>
                <div className="gestion-info">
                  <h4>{opcion.titulo}</h4>
                  <p>{opcion.descripcion}</p>
                </div>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Proximos eventos REALES */}
      <div className="proximos-eventos">
        <div className="proximos-header">
          <h3>Tus próximos eventos</h3>
          <Link to="/dashboard/mis-eventos" className="ver-todos">Gestionar eventos →</Link>
        </div>
        <div className="eventos-lista">
          {stats.loading ? (
            <div className="evento-proximo-empty">Cargando eventos…</div>
          ) : proximos.length === 0 ? (
            <div className="evento-proximo-empty">
              <p>📭 No tienes eventos próximos.</p>
              <Link to="/dashboard/crear-evento" className="btn-accion">Crear tu primer evento</Link>
            </div>
          ) : (
            proximos.map(ev => {
              const vendidos = (ev.tiposEntrada || []).reduce((s, t) => s + (t.cupoVendido || 0), 0);
              const fechaTxt = ev.fecha
                ? new Date(ev.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
                : 'Sin fecha';
              return (
                <div key={ev.id} className="evento-proximo-card">
                  <div className="evento-proximo-info">
                    <h4>{ev.nombre}</h4>
                    <p>📅 {fechaTxt}{ev.hora ? ` · ${ev.hora}` : ''}</p>
                    <p>📍 {ev.ubicacion || 'Sin ubicación'}</p>
                    <div className="evento-proximo-stats">
                      <span>🎟️ {vendidos}/{ev.capacidad || 0} boletos</span>
                      <span>💰 {formatCurrency(
                        (ev.tiposEntrada || []).reduce((s, t) => s + (t.cupoVendido || 0) * (t.precio || 0), 0)
                      )}</span>
                    </div>
                  </div>
                  <div className="evento-proximo-acciones">
                    <Link to={`/dashboard/evento/${ev.id}/editar`} className="btn-accion">Editar</Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default OpcionesPromotor;
