import './VenueLayoutPreview.css';

const ZONE_LABELS = {
  general: 'General',
  platea: 'Platea',
  preferencial: 'Preferencial',
  vip: 'VIP',
  palco: 'Palco',
};

const ZONE_THEMES = {
  general: { accent: '#7d8f69', tint: 'rgba(125, 143, 105, 0.14)' },
  platea: { accent: '#507dbc', tint: 'rgba(80, 125, 188, 0.14)' },
  preferencial: { accent: '#c7783b', tint: 'rgba(199, 120, 59, 0.14)' },
  vip: { accent: '#d6a807', tint: 'rgba(214, 168, 7, 0.18)' },
  palco: { accent: '#8a5cf6', tint: 'rgba(138, 92, 246, 0.16)' },
};

const getZoneLabel = (tipoZona) => ZONE_LABELS[tipoZona] || tipoZona || 'Zona';

const getSeatRowsPreview = (rows, seatsPerRow, compact) => {
  const totalRows = Math.min(parseInt(rows, 10) || 0, compact ? 4 : 5);
  const totalSeats = Math.min(parseInt(seatsPerRow, 10) || 0, compact ? 8 : 12);

  return Array.from({ length: totalRows }, (_, rowIndex) => ({
    label: String.fromCharCode(65 + rowIndex),
    seats: Array.from({ length: totalSeats }, (_, seatIndex) => `${rowIndex + 1}-${seatIndex + 1}`),
  }));
};

function VenueLayoutPreview({
  tiposEntrada = [],
  capacidadTotal = 0,
  titulo = 'Distribucion del recinto',
  subtitulo = 'Visualiza zonas, asientos configurados y precios por ubicacion.',
  compact = false,
}) {
  const zonasActivas = tiposEntrada.filter((tipo) => tipo.estado !== 'eliminado');
  const capacidadEvento = parseInt(capacidadTotal, 10) || 0;
  const asientosConfigurados = zonasActivas.reduce(
    (sum, tipo) => sum + (parseInt(tipo.asientosConfigurados, 10) || parseInt(tipo.cupoMaximo, 10) || 0),
    0,
  );
  const zonasVip = zonasActivas.filter((tipo) => tipo.esVIP || tipo.tipoZona === 'vip');
  const precioMinimo = zonasActivas.length > 0 ? Math.min(...zonasActivas.map((tipo) => parseFloat(tipo.precio) || 0)) : 0;
  const precioMaximo = zonasActivas.length > 0 ? Math.max(...zonasActivas.map((tipo) => parseFloat(tipo.precio) || 0)) : 0;

  if (zonasActivas.length === 0) {
    return (
      <section className={`venue-layout-preview ${compact ? 'compact' : ''}`}>
        <div className="venue-layout-heading">
          <div>
            <h3>{titulo}</h3>
            <p>{subtitulo}</p>
          </div>
        </div>
        <div className="venue-layout-empty">
          <span className="venue-layout-empty-icon">🎟️</span>
          <p>No hay zonas activas para visualizar todavia.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`venue-layout-preview ${compact ? 'compact' : ''}`}>
      <div className="venue-layout-heading">
        <div>
          <h3>{titulo}</h3>
          <p>{subtitulo}</p>
        </div>
        <div className="venue-layout-kpis">
          <div className="venue-kpi">
            <strong>{zonasActivas.length}</strong>
            <span>Zonas</span>
          </div>
          <div className="venue-kpi">
            <strong>{asientosConfigurados}</strong>
            <span>Asientos</span>
          </div>
          <div className="venue-kpi">
            <strong>{zonasVip.length}</strong>
            <span>VIP</span>
          </div>
          <div className="venue-kpi">
            <strong>${precioMinimo}{precioMaximo > precioMinimo ? ` - $${precioMaximo}` : ''}</strong>
            <span>Rango</span>
          </div>
        </div>
      </div>

      <div className="venue-stage">Escenario / punto focal</div>

      <div className="venue-zones-grid">
        {zonasActivas.map((tipo) => {
          const cupoMaximo = parseInt(tipo.cupoMaximo, 10) || 0;
          const asientos = parseInt(tipo.asientosConfigurados, 10) || cupoMaximo;
          const share = capacidadEvento > 0 ? Math.min(100, Math.max(8, (cupoMaximo / capacidadEvento) * 100)) : 0;
          const theme = ZONE_THEMES[tipo.tipoZona] || { accent: '#ad8149', tint: 'rgba(173, 129, 73, 0.14)' };
          const rowsPreview = getSeatRowsPreview(tipo.filas, tipo.asientosPorFila, compact);

          const cupoVendido = parseInt(tipo.cupoVendido, 10) || 0;
          const soldPercentage = cupoMaximo > 0 ? (cupoVendido / cupoMaximo) : 0;
          const totalGridSeats = rowsPreview.reduce((sum, r) => sum + r.seats.length, 0);
          const seatsToDim = Math.round(totalGridSeats * soldPercentage);
          let currentDimmed = 0;

          return (
            <article
              key={tipo.id}
              className={`venue-zone-card ${tipo.esVIP ? 'vip' : ''}`}
              style={{ '--zone-accent': theme.accent, '--zone-tint': theme.tint }}
            >
              <div className="venue-zone-card-top">
                <div>
                  <div className="venue-zone-badges">
                    <span className="venue-zone-badge">{getZoneLabel(tipo.tipoZona)}</span>
                    {tipo.esVIP && <span className="venue-zone-badge vip">VIP</span>}
                  </div>
                  <h4>{tipo.nombre}</h4>
                </div>
                <strong className="venue-zone-price">${tipo.precio}</strong>
              </div>

              <div className="venue-zone-capacity">
                <div className="venue-zone-capacity-row">
                  <span>{asientos} asientos configurados</span>
                  <span>{capacidadEvento > 0 ? `${Math.round(share)}% del recinto` : `${cupoMaximo} cupo`}</span>
                </div>
                <div className="venue-zone-capacity-bar">
                  <span style={{ width: `${share}%` }}></span>
                </div>
              </div>

              <div className="venue-zone-layout-meta">
                <span>{tipo.filas || 0} filas</span>
                <span>{tipo.asientosPorFila || 0} por fila</span>
                <span>{tipo.disponibles ?? cupoMaximo} disponibles</span>
              </div>

              <div className="venue-zone-seats">
                {rowsPreview.map((row) => (
                  <div className="venue-seat-row" key={`${tipo.id}-${row.label}`}>
                    <span className="venue-seat-row-label">{row.label}</span>
                    <div className="venue-seat-row-dots">
                      {row.seats.map((seatId) => {
                        const isDimmed = currentDimmed < seatsToDim;
                        if (isDimmed) currentDimmed++;
                        return (
                          <span
                            key={seatId}
                            className={`venue-seat-dot ${tipo.esVIP ? 'vip' : ''} ${isDimmed ? 'occupied' : ''}`}
                            title={isDimmed ? 'Vendido' : seatId}
                            style={isDimmed ? { opacity: 0.25, background: '#3a3a48', borderColor: '#222' } : {}}
                          ></span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {((parseInt(tipo.filas, 10) || 0) > (compact ? 4 : 5) || (parseInt(tipo.asientosPorFila, 10) || 0) > (compact ? 8 : 12)) && (
                <p className="venue-zone-note">Se muestra una muestra reducida de la zona.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default VenueLayoutPreview;