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
 */
export default function ConfiguracionCola({ eventoId, promotorId, usuarioId }) {
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

        // Validaciones frontend
        if (isNaN(umbralNum) || umbralNum <= 0 || umbralNum > 100) {
            setError('El umbral debe ser un número entre 1 y 100.');
            setGuardando(false);
            return;
        }
        if (isNaN(timeoutNum) || timeoutNum <= 0 || timeoutNum > 60) {
            setError('El timeout debe ser entre 1 y 60 minutos.');
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
            setError(err.message || 'Error al guardar.');
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
                <form onSubmit={handleGuardar} style={estilos.formulario}>
                    <div style={estilos.campo}>
                        <label style={estilos.label}>
                            Umbral de capacidad para activar cola (%)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={umbral}
                            onChange={(e) => setUmbral(e.target.value)}
                            style={estilos.input}
                            placeholder="Ej: 80"
                        />
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
                            min="1"
                            max="60"
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

// Estilos inline básicos (puedes migrarlos a CSS si prefieres)
const estilos = {
    contenedor: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginTop: '24px',
    },
    titulo: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '16px',
    },
    estadoActual: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '20px',
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
        gap: '16px',
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