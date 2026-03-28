import { useState, useEffect } from 'react';
import { eventosService } from '../../../services/eventosService';
import './FormularioTipoEntrada.css';

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
    descripcion: '',
    precio: '',
    cupoMaximo: '',
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  // cupoDisponible: si estamos editando, sumamos de vuelta el cupo anterior
  const cupoEditando = tipoEditando ? (tipoEditando.cupoMaximo || 0) : 0;
  const cupoLibre = (capacidadDisponible ?? 0) + cupoEditando;

  useEffect(() => {
    if (tipoEditando) {
      setFormData({
        nombre: tipoEditando.nombre || '',
        descripcion: tipoEditando.descripcion || '',
        precio: tipoEditando.precio || '',
        cupoMaximo: tipoEditando.cupoMaximo || '',
      });
    }
  }, [tipoEditando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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

    if (!formData.precio) {
      nuevosErrores.precio = 'El precio es requerido';
    } else {
      const precio = parseFloat(formData.precio);
      if (isNaN(precio) || precio < 0) {
        nuevosErrores.precio = 'El precio debe ser un número positivo';
      } else if (precio > 100000) {
        nuevosErrores.precio = 'El precio no puede exceder $100,000';
      }
    }

    if (!formData.cupoMaximo) {
      nuevosErrores.cupoMaximo = 'El cupo máximo es requerido';
    } else {
      const cupo = parseInt(formData.cupoMaximo);
      if (isNaN(cupo) || cupo < 1) {
        nuevosErrores.cupoMaximo = 'El cupo debe ser al menos 1';
      } else if (cupo > cupoLibre) {
        nuevosErrores.cupoMaximo = `El cupo no puede superar el disponible (${cupoLibre})`;
      }
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
    const cupoNuevo = parseInt(formData.cupoMaximo);
    if (cupoNuevo > cupoLibre) {
      setErrorGeneral(`No hay suficiente cupo disponible. Cupo libre: ${cupoLibre}`);
      return;
    }

    setCargando(true);
    try {
      let tipoGuardado;
      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || '',
        precio: parseFloat(formData.precio),
        cupoMaximo: cupoNuevo,
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
              Nombre del tipo de entrada <span className="required">*</span>
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
                placeholder="Ej: 2500"
                min="0"
                max="100000"
                step="100"
                className={errores.precio ? 'error' : ''}
              />
              {errores.precio && <span className="error-mensaje">{errores.precio}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cupoMaximo">
                Cupo máximo <span className="required">*</span>
              </label>
              <input
                type="number"
                id="cupoMaximo"
                name="cupoMaximo"
                value={formData.cupoMaximo}
                onChange={handleChange}
                placeholder="Ej: 500"
                min="1"
                max={cupoLibre}
                className={errores.cupoMaximo ? 'error' : ''}
              />
              <div className="campo-ayuda">Máximo disponible: {cupoLibre}</div>
              {errores.cupoMaximo && <span className="error-mensaje">{errores.cupoMaximo}</span>}
            </div>
          </div>

          {tipoEditando && tipoEditando.cupoVendido > 0 && (
            <div className="advertencia-edicion">
              <p>
                <strong>⚠️ Importante:</strong> Este tipo ya tiene {tipoEditando.cupoVendido} ventas.
                No puedes reducir el cupo por debajo de las ventas realizadas.
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