import { useState, useEffect } from 'react';
import { eventosService } from '../../../services/eventosService';

/**
 * Panel de configuración de cola virtual para un evento.
 * Se renderiza dentro de la ficha del evento (vista promotor).
 *
 * Props:
 *   - eventoId: UUID del evento
 *   - promotorId: UUID del promotor dueño (para validar visibilidad)
 *   - usuarioId: UUID del usuario actual
 *   - capacidadEvento: Capacidad total del evento (para mostrar usuarios concurrentes)
 */
export default function ConfiguracionCola({ eventoId, promotorId, usuarioId, capacidadEvento = 0 }) {
    const [config, setConfig] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [error, setError] = useState(null);

    // Valores del formulario
    const [umbral, setUmbral] = useState('');
    const [timeout, setTimeout_] = useState('');

    // Solo mostrar si el usuario es el promotor dueño
    const esDueno = String(promotorId) === String(usuarioId);

    // Calcular usuarios concurrentes basado en threshold y capacidad
    const calcularUsuariosConcurrentes = (thresholdPorcentaje) => {
        const capacity = capacidadEvento || 1;
        const threshold = parseInt(thresholdPorcentaje) || 0;
        if (threshold <= 0) return 1;
        const calculated = Math.ceil(capacity * threshold / 100);
        return Math.max(1, calculated);
    };

    const usuariosConcurrentes = calcularUsuariosConcurrentes(umbral);

    useEffect(() => {
        if (!esDueno) return;
        cargarConfig();
    }, [eventoId]);

    const cargarConfig = async () => {
        setCargando(true);
        setError(null);
        try {
            const datos = await eventosService.getQueueConfig(eventoId);
            if (datos) {
                setConfig(datos);
                setUmbral(String(datos.waitlist_threshold));
                setTimeout_(String(datos.payment_timeout_minutes));
            }
        } catch (err) {
            setError('No se pudo cargar la configuración.');
        } finally {
            setCargando(false);
        }
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setMensaje(null);
        setError(null);

        const umbralNum = parseInt(umbral);
        const timeoutNum = parseInt(timeout);

        // Validaciones frontend — mensajes específicos por contexto
        if (umbral === '' || isNaN(umbralNum)) {
            setError('Debes ingresar un porcentaje de umbral para activar la cola (ej: 80).');
            setGuardando(false);
            return;
        }
        if (umbralNum <= 0) {
            setError('El umbral no puede ser 0% ni negativo. Ingresa un valor entre 1% y 100% de la capacidad del evento.');
            setGuardando(false);
            return;
        }
        if (umbralNum > 100) {
            setError(`El umbral no puede superar el 100%. Actualmente la capacidad del evento es ${capacidadEvento} personas.`);
            setGuardando(false);
            return;
        }

        if (timeout === '' || isNaN(timeoutNum)) {
            setError('Debes ingresar el tiempo máximo de pago en minutos (ej: 15).');
            setGuardando(false);
            return;
        }
        if (timeoutNum <= 0) {
            setError('El tiempo de pago debe ser al menos 1 minuto. Un valor de 0 no daría tiempo suficiente para completar el pago.');
            setGuardando(false);
            return;
        }
        if (timeoutNum > 60) {
            setError('El tiempo máximo de pago no puede superar los 60 minutos. Recomendamos entre 5 y 15 minutos.');
            setGuardando(false);
            return;
        }

        try {
            const resultado = await eventosService.updateQueueConfig(eventoId, {
                umbral: umbralNum,
                timeoutMinutos: timeoutNum,
            });
            setConfig(resultado);
            setMensaje('✅ Configuración guardada correctamente.');
        } catch (err) {
            // Mostrar error del backend con contexto
            const backendMsg = err.message || '';
            if (backendMsg.includes('umbral') || backendMsg.includes('threshold') || backendMsg.includes('superar')) {
                setError(`No se pudo guardar: ${backendMsg}`);
            } else if (backendMsg.includes('timeout') || backendMsg.includes('minutos')) {
                setError(`No se pudo guardar: ${backendMsg}`);
            } else {
                setError(`Error al guardar la configuración: ${backendMsg || 'Verifica los valores e intenta nuevamente.'}`);
            }
        } finally {
            setGuardando(false);
        }
    };

    // No mostrar nada si no es el dueño del evento
    if (!esDueno) return null;

    return (
        <div style={estilos.contenedor}>
            <h3 style={estilos.titulo}>⚙️ Configuración de Cola Virtual</h3>

            {/* ESTADO ACTUAL */}
            {config && (
                <div style={estilos.estadoActual}>
                    <span style={estilos.etiqueta}>Estado de la cola:</span>
                    <span style={{
                        ...estilos.badge,
                        backgroundColor: config.waitlist_active ? '#f59e0b' : '#10b981',
                    }}>
                        {config.waitlist_active ? '🟡 Activa' : '🟢 Inactiva'}
                    </span>
                    <span style={estilos.etiqueta}>Umbral actual:</span>
                    <span style={estilos.valor}>{config.waitlist_threshold}%</span>
                    <span style={estilos.etiqueta}>Timeout de pago:</span>
                    <span style={estilos.valor}>{config.payment_timeout_minutes} min</span>
                </div>
            )}

            {cargando && (
                <p style={estilos.cargando}>Cargando configuración...</p>
            )}

            {/* FORMULARIO */}
            {!cargando && (
                <form onSubmit={handleGuardar} noValidate style={estilos.formulario}>
                    <div style={estilos.campo}>
                        <label style={estilos.label}>
                            Umbral de capacidad para activar cola (%)
                        </label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '4px' }}>
                            <input
                                type="number"
                                value={umbral}
                                onChange={(e) => setUmbral(e.target.value)}
                                style={estilos.input}
                                placeholder="Ej: 80"
                            />
                            <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                = {usuariosConcurrentes} {usuariosConcurrentes === 1 ? 'usuario' : 'usuarios'} simultáneo{usuariosConcurrentes > 1 ? 's' : ''}
                            </span>
                        </div>
                        <small style={estilos.ayuda}>
                            Cuando el evento alcance este % de capacidad vendida,
                            se activará la cola automáticamente.
                        </small>
                    </div>

                    <div style={estilos.campo}>
                        <label style={estilos.label}>
                            Tiempo máximo de pago (minutos)
                        </label>
                        <input
                            type="number"
                            value={timeout}
                            onChange={(e) => setTimeout_(e.target.value)}
                            style={estilos.input}
                            placeholder="Ej: 15"
                        />
                        <small style={estilos.ayuda}>
                            Tiempo que tiene el comprador para completar el pago
                            antes de que su orden expire.
                        </small>
                    </div>

                    {/* Botones rápidos de umbral */}
                    <div style={estilos.botonesSugeridos}>
                        <span style={estilos.label}>Accesos rápidos:</span>
                        {[50, 70, 80, 90].map((val) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setUmbral(String(val))}
                                style={{
                                    ...estilos.botonSugerido,
                                    backgroundColor:
                                        umbral === String(val) ? '#1f2937' : '#e5e7eb',
                                    color: umbral === String(val) ? '#fff' : '#374151',
                                }}
                            >
                                {val}%
                            </button>
                        ))}
                    </div>

                    {/* Mensajes de feedback */}
                    {mensaje && (
                        <div style={estilos.mensajeExito}>{mensaje}</div>
                    )}
                    {error && (
                        <div style={estilos.mensajeError}>⚠️ {error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={guardando}
                        style={{
                            ...estilos.botonGuardar,
                            opacity: guardando ? 0.6 : 1,
                        }}
                    >
                        {guardando ? 'Guardando...' : 'Guardar configuración'}
                    </button>
                </form>
            )}
        </div>
    );
}

// Estilos inline
const estilos = {
    contenedor: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '12px',
    },
    titulo: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '10px',
        marginTop: 0,
    },
    estadoActual: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '8px 12px',
        marginBottom: '12px',
    },
    etiqueta: {
        fontSize: '13px',
        color: '#6b7280',
        fontWeight: '500',
    },
    valor: {
        fontSize: '14px',
        color: '#1f2937',
        fontWeight: '700',
    },
    badge: {
        fontSize: '12px',
        color: '#fff',
        borderRadius: '9999px',
        padding: '2px 10px',
        fontWeight: '600',
    },
    formulario: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    campo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#1f2937',
        maxWidth: '200px',
    },
    ayuda: {
        fontSize: '12px',
        color: '#9ca3af',
    },
    botonesSugeridos: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    botonSugerido: {
        padding: '4px 12px',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '13px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.15s',
    },
    mensajeExito: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        padding: '10px 14px',
        borderRadius: '6px',
        fontSize: '13px',
    },
    mensajeError: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        padding: '10px 14px',
        borderRadius: '6px',
        fontSize: '13px',
    },
    botonGuardar: {
        backgroundColor: '#1f2937',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        alignSelf: 'flex-start',
    },
    cargando: {
        color: '#6b7280',
        fontSize: '13px',
    },
};
