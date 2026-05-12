import { useState, useEffect } from 'react';
import { eventosService } from '../../../services/eventosService';
import './FormularioTipoEntrada.css';

const ZONE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'platea', label: 'Platea' },
  { value: 'preferencial', label: 'Preferencial' },
  { value: 'vip', label: 'VIP' },
  { value: 'palco', label: 'Palco' },
];

const getSeatRowsPreview = (rows, seatsPerRow) => {
  const totalRows = Math.min(rows || 0, 6);
  const totalSeats = Math.min(seatsPerRow || 0, 10);

  return Array.from({ length: totalRows }, (_, rowIndex) => ({
    label: String.fromCharCode(65 + rowIndex),
    seats: Array.from({ length: totalSeats }, (_, seatIndex) => `${rowIndex + 1}-${seatIndex + 1}`),
  }));
};

/**
 * FormularioTipoEntrada
 * Props:
 *  - eventoId: ID del evento (null si es creación offline)
 *  - evento: objeto del evento (para leer capacidad)
 *  - tipoEditando: tipo de entrada a editar (null si es creación)
 *  - capacidadDisponible: cupo libre ya calculado por GestionTiposEntrada
 *  - onGuardado(tipoGuardado): callback cuando se guarda exitosamente
 *  - onCancelar(): callback para cerrar el modal
 */
function FormularioTipoEntrada({ eventoId, evento, tipoEditando, capacidadDisponible, onGuardado, onCancelar }) {
  const [formData, setFormData] = useState({
    nombre: '',
    tipoZona: 'general',
    esVIP: false,
    descripcion: '',
    precio: '0',
    filas: '',
    asientosPorFila: '',
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  // cupoDisponible: si estamos editando, sumamos de vuelta el cupo anterior
  const cupoEditando = tipoEditando ? (tipoEditando.cupoMaximo || 0) : 0;
  const cupoLibre = (capacidadDisponible ?? 0) + cupoEditando;
  const filas = parseInt(formData.filas, 10) || 0;
  const asientosPorFila = parseInt(formData.asientosPorFila, 10) || 0;
  const totalAsientos = filas * asientosPorFila;
  const seatPreviewRows = getSeatRowsPreview(filas, asientosPorFila);

  useEffect(() => {
    if (tipoEditando) {
      const filasIniciales = tipoEditando.filas || (tipoEditando.cupoMaximo ? 1 : '');
      const asientosIniciales = tipoEditando.asientosPorFila || tipoEditando.cupoMaximo || '';
      setFormData({
        nombre: tipoEditando.nombre || '',
        tipoZona: tipoEditando.tipoZona || 'general',
        esVIP: Boolean(tipoEditando.esVIP || tipoEditando.tipoZona === 'vip'),
        descripcion: tipoEditando.descripcion || '',
        precio: tipoEditando.precio || '',
        filas: filasIniciales,
        asientosPorFila: asientosIniciales,
      });
    }
  }, [tipoEditando]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    const nextState = { ...formData, [name]: nextValue };

    if (name === 'tipoZona' && value === 'vip') {
      nextState.esVIP = true;
    }

    setFormData(nextState);
    if (errores[name]) setErrores({ ...errores, [name]: '' });
    setErrorGeneral('');
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.nombre.length > 50) {
      nuevosErrores.nombre = 'El nombre no puede exceder los 50 caracteres';
    }

    if (formData.descripcion && formData.descripcion.length > 200) {
      nuevosErrores.descripcion = 'La descripción no puede exceder los 200 caracteres';
    }

    if (!formData.tipoZona) {
      nuevosErrores.tipoZona = 'Debes seleccionar una zona';
    }

    if (!formData.precio) {
      nuevosErrores.precio = 'El precio es requerido';
    } else {
      const precio = parseFloat(formData.precio);
      if (isNaN(precio) || precio <= 0) {
        nuevosErrores.precio = 'El precio debe ser mayor a 0';
      } else if (precio > 100000) {
        nuevosErrores.precio = 'El precio no puede exceder $100,000';
      }
    }

    if (!formData.filas) {
      nuevosErrores.filas = 'Las filas son requeridas';
    } else {
      const totalFilas = parseInt(formData.filas, 10);
      if (isNaN(totalFilas) || totalFilas < 1) {
        nuevosErrores.filas = 'Las filas deben ser al menos 1';
      } else if (totalFilas > 50) {
        nuevosErrores.filas = 'Las filas no pueden exceder 50';
      }
    }

    if (!formData.asientosPorFila) {
      nuevosErrores.asientosPorFila = 'Los asientos por fila son requeridos';
    } else {
      const seatsByRow = parseInt(formData.asientosPorFila, 10);
      if (isNaN(seatsByRow) || seatsByRow < 1) {
        nuevosErrores.asientosPorFila = 'Los asientos por fila deben ser al menos 1';
      } else if (seatsByRow > 100) {
        nuevosErrores.asientosPorFila = 'Los asientos por fila no pueden exceder 100';
      }
    }

    if (totalAsientos < 1) {
      nuevosErrores.distribucion = 'La distribución debe generar al menos 1 asiento';
    } else if (totalAsientos > cupoLibre) {
      nuevosErrores.distribucion = `La zona supera el cupo disponible (${cupoLibre})`;
    }

    if (tipoEditando?.cupoVendido > 0 && totalAsientos < tipoEditando.cupoVendido) {
      nuevosErrores.distribucion = `No puedes definir menos asientos que los ya vendidos (${tipoEditando.cupoVendido})`;
    }

    return nuevosErrores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nuevosErrores = validarFormulario();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    // Doble check: bloquea si intenta exceder la capacidad libre
    const cupoNuevo = totalAsientos;
    if (cupoNuevo > cupoLibre) {
      setErrorGeneral(`No hay suficiente cupo disponible. Cupo libre: ${cupoLibre}`);
      return;
    }

    setCargando(true);
    try {
      let tipoGuardado;
      const payload = {
        nombre: formData.nombre.trim(),
        tipoZona: formData.tipoZona,
        esVIP: Boolean(formData.esVIP || formData.tipoZona === 'vip'),
        descripcion: formData.descripcion?.trim() || '',
        precio: parseFloat(formData.precio),
        cupoMaximo: cupoNuevo,
        filas,
        asientosPorFila,
      };

      if (tipoEditando) {
        if (eventoId) {
          tipoGuardado = await eventosService.actualizarTipoEntrada(eventoId, tipoEditando.id, payload);
        } else {
          tipoGuardado = { ...tipoEditando, ...payload };
        }
      } else {
        if (eventoId) {
          tipoGuardado = await eventosService.crearTipoEntrada(eventoId, payload);
        } else {
          // Modo offline (creación de evento nuevo aún no guardado)
          tipoGuardado = { ...payload, id: Date.now(), estado: 'activo', cupoVendido: 0 };
        }
      }

      onGuardado(tipoGuardado);
    } catch (error) {
      setErrorGeneral(error.message || 'Error al guardar el tipo de entrada.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-formulario" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{tipoEditando ? 'Editar Tipo de Entrada' : 'Nuevo Tipo de Entrada'}</h3>
          <button className="modal-close" onClick={onCancelar}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {errorGeneral && (
            <div className="error-general">
              <span className="error-icono">⚠️</span>
              <p>{errorGeneral}</p>
            </div>
          )}

          {/* Resumen de capacidad */}
          <div className="info-cupo">
            <div className="info-item">
              <span className="info-label">Capacidad del evento:</span>
              <span className="info-valor">{evento?.capacidad}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Cupo asignado:</span>
              <span className="info-valor">{(parseInt(evento?.capacidad) || 0) - capacidadDisponible}</span>
            </div>
            <div className="info-item destacado">
              <span className="info-label">Cupo disponible:</span>
              <span className="info-valor">{cupoLibre}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="nombre">
              Nombre de la zona <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: General, VIP, Platea, etc."
              className={errores.nombre ? 'error' : ''}
              maxLength="50"
            />
            <div className="campo-ayuda">{formData.nombre.length}/50 caracteres</div>
            {errores.nombre && <span className="error-mensaje">{errores.nombre}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tipoZona">
                Tipo de zona <span className="required">*</span>
              </label>
              <select
                id="tipoZona"
                name="tipoZona"
                value={formData.tipoZona}
                onChange={handleChange}
                className={errores.tipoZona ? 'error' : ''}
              >
                {ZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errores.tipoZona && <span className="error-mensaje">{errores.tipoZona}</span>}
            </div>

            <div className="form-group form-group-checkbox">
              <label htmlFor="esVIP">Zona premium</label>
              <label className="checkbox-card" htmlFor="esVIP">
                <input
                  type="checkbox"
                  id="esVIP"
                  name="esVIP"
                  checked={Boolean(formData.esVIP)}
                  onChange={handleChange}
                />
                <span>
                  {formData.esVIP ? 'Marcada como VIP / premium' : 'Sin beneficios VIP'}
                </span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción (opcional)</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe las características de este tipo de entrada"
              rows="3"
              className={errores.descripcion ? 'error' : ''}
              maxLength="200"
            />
            <div className="campo-ayuda">{formData.descripcion.length}/200 caracteres</div>
            {errores.descripcion && <span className="error-mensaje">{errores.descripcion}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">
                Precio ($) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                placeholder="Ej: 2500.50"
                min="0"
                max="100000"
                step="10"
                className={errores.precio ? 'error' : ''}
              />
              {errores.precio && <span className="error-mensaje">{errores.precio}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="filas">
                Filas <span className="required">*</span>
              </label>
              <input
                type="number"
                id="filas"
                name="filas"
                value={formData.filas}
                onChange={handleChange}
                placeholder="Ej: 5"
                min="1"
                max="50"
                className={errores.filas ? 'error' : ''}
              />
              <div className="campo-ayuda">Máximo sugerido: 50 filas</div>
              {errores.filas && <span className="error-mensaje">{errores.filas}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="asientosPorFila">
                Asientos por fila <span className="required">*</span>
              </label>
              <input
                type="number"
                id="asientosPorFila"
                name="asientosPorFila"
                value={formData.asientosPorFila}
                onChange={handleChange}
                placeholder="Ej: 20"
                min="1"
                max="100"
                className={errores.asientosPorFila ? 'error' : ''}
              />
              <div className="campo-ayuda">Máximo sugerido: 100 asientos por fila</div>
              {errores.asientosPorFila && <span className="error-mensaje">{errores.asientosPorFila}</span>}
            </div>

            <div className="form-group">
              <label>Cupo generado</label>
              <div className="seat-summary-card">
                <strong>{totalAsientos || 0} asientos</strong>
                <span>{filas || 0} filas x {asientosPorFila || 0} asientos</span>
                <small>Cupo disponible en el evento: {cupoLibre}</small>
              </div>
            </div>
          </div>

          {errores.distribucion && <span className="error-mensaje">{errores.distribucion}</span>}

          {(filas > 0 || asientosPorFila > 0) && (
            <div className="seat-preview">
              <div className="seat-preview-header">
                <h4>Vista previa de asientos</h4>
                <span>{formData.tipoZona.toUpperCase()}</span>
              </div>
              <div className="seat-preview-stage">Escenario / punto focal</div>
              <div className="seat-preview-grid">
                {seatPreviewRows.length > 0 ? seatPreviewRows.map((row) => (
                  <div className="seat-row" key={row.label}>
                    <span className="seat-row-label">{row.label}</span>
                    <div className="seat-row-seats">
                      {row.seats.map((seatId) => (
                        <span
                          key={seatId}
                          className={`seat-dot ${formData.esVIP ? 'vip' : ''}`}
                          title={seatId}
                        />
                      ))}
                    </div>
                  </div>
                )) : (
                  <p className="seat-preview-empty">Define filas y asientos por fila para ver la distribución.</p>
                )}
              </div>
              {(filas > 6 || asientosPorFila > 10) && (
                <p className="seat-preview-note">La vista previa muestra una muestra reducida del mapa real.</p>
              )}
            </div>
          )}

          {tipoEditando && tipoEditando.cupoVendido > 0 && (
            <div className="advertencia-edicion">
              <p>
                <strong>⚠️ Importante:</strong> Este tipo ya tiene {tipoEditando.cupoVendido} ventas.
                No puedes definir menos asientos que las ventas realizadas.
              </p>
            </div>
          )}

          <div className="modal-acciones">
            <button type="button" className="btn-cancelar" onClick={onCancelar} disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={cargando || cupoLibre <= 0}>
              {cargando ? (
                <><span className="spinner-small"></span>Guardando...</>
              ) : (
                tipoEditando ? 'Actualizar' : 'Crear Tipo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioTipoEntrada;
