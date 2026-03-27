import { useState, useEffect } from 'react';
import { eventosService } from '../../../services/eventosService';
import './FormularioTipoEntrada.css';

function FormularioTipoEntrada({ eventoId, evento, tipoEditando, onGuardado, onCancelar }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    cupoMaximo: ''
  });

  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  // Calcular cupo disponible
  const tiposActivos = eventoId ? eventosService.getTiposEntradaByEvento(eventoId)
    .filter(t => t.estado === 'activo' && (!tipoEditando || t.id !== tipoEditando.id)) : [];
  
  const cupoAsignado = tiposActivos.reduce((sum, t) => sum + (parseInt(t.cupoMaximo) || 0), 0);
  const cupoDisponible = (parseInt(evento?.capacidad) || 0) - cupoAsignado;

  useEffect(() => {
    if (tipoEditando) {
      setFormData({
        nombre: tipoEditando.nombre || '',
        descripcion: tipoEditando.descripcion || '',
        precio: tipoEditando.precio || '',
        cupoMaximo: tipoEditando.cupoMaximo || ''
      });
    }
  }, [tipoEditando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Limpiar error del campo
    if (errores[name]) {
      setErrores({
        ...errores,
        [name]: ''
      });
    }
    setErrorGeneral('');
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validar nombre
    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.nombre.length > 50) {
      nuevosErrores.nombre = 'El nombre no puede exceder los 50 caracteres';
    }

    // Validar descripción (opcional pero con límite)
    if (formData.descripcion && formData.descripcion.length > 200) {
      nuevosErrores.descripcion = 'La descripción no puede exceder los 200 caracteres';
    }

    // Validar precio
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

    // Validar cupo máximo
    if (!formData.cupoMaximo) {
      nuevosErrores.cupoMaximo = 'El cupo máximo es requerido';
    } else {
      const cupo = parseInt(formData.cupoMaximo);
      if (isNaN(cupo) || cupo < 1) {
        nuevosErrores.cupoMaximo = 'El cupo debe ser al menos 1';
      } else if (cupo > 5000) {
        nuevosErrores.cupoMaximo = 'El cupo no puede exceder 5000 por tipo';
      }
    }

    return nuevosErrores;
  };

  const validarCupoDisponible = () => {
    const cupoNuevo = parseInt(formData.cupoMaximo);
    
    if (tipoEditando) {
      // En edición, considerar el cupo anterior
      const cupoAnterior = tipoEditando.cupoMaximo;
      const diferencia = cupoNuevo - cupoAnterior;
      return (cupoAsignado + diferencia) <= evento.capacidad;
    } else {
      // En creación, verificar cupo disponible
      return cupoNuevo <= cupoDisponible;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const nuevosErrores = validarFormulario();
    
    if (Object.keys(nuevosErrores).length === 0) {
      // Validar cupo disponible
      if (!validarCupoDisponible()) {
        setErrorGeneral(`No hay suficiente cupo disponible. Cupo disponible: ${cupoDisponible}`);
        return;
      }

      setCargando(true);
      
      // Simular envío
      setTimeout(() => {
        try {
          if (tipoEditando) {
            if (eventoId) eventosService.actualizarTipoEntrada(eventoId, tipoEditando.id, formData);
            onGuardado({ ...formData, id: tipoEditando.id, estado: 'activo', cupoVendido: tipoEditando.cupoVendido || 0 });
          } else {
            const nuevoId = Date.now();
            if (eventoId) eventosService.crearTipoEntrada(eventoId, formData);
            onGuardado({ ...formData, id: nuevoId, estado: 'activo', cupoVendido: 0 });
          }
        } catch (error) {
          setErrorGeneral(error.message);
        } finally {
          setCargando(false);
        }
      }, 500);
    } else {
      setErrores(nuevosErrores);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-formulario" onClick={e => e.stopPropagation()}>
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

          <div className="info-cupo">
            <div className="info-item">
              <span className="info-label">Capacidad del evento:</span>
              <span className="info-valor">{evento.capacidad}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Cupo asignado:</span>
              <span className="info-valor">{cupoAsignado}</span>
            </div>
            <div className="info-item destacado">
              <span className="info-label">Cupo disponible:</span>
              <span className="info-valor">{cupoDisponible}</span>
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
            <div className="campo-ayuda">
              {formData.nombre.length}/50 caracteres
            </div>
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
            <div className="campo-ayuda">
              {formData.descripcion.length}/200 caracteres
            </div>
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
                max={cupoDisponible}
                className={errores.cupoMaximo ? 'error' : ''}
              />
              <div className="campo-ayuda">
                Máximo disponible: {cupoDisponible}
              </div>
              {errores.cupoMaximo && <span className="error-mensaje">{errores.cupoMaximo}</span>}
            </div>
          </div>

          {tipoEditando && tipoEditando.cupoVendido > 0 && (
            <div className="advertencia-edicion">
              <p>
                <strong>⚠️ Importante:</strong> Este tipo de entrada ya tiene {tipoEditando.cupoVendido} ventas.
                No puedes reducir el cupo por debajo de las ventas realizadas.
              </p>
            </div>
          )}

          <div className="modal-acciones">
            <button 
              type="button" 
              className="btn-cancelar"
              onClick={onCancelar}
              disabled={cargando}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-guardar"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="spinner-small"></span>
                  Guardando...
                </>
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