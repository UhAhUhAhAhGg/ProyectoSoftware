import { useEffect, useState } from 'react';
import { useQueue } from '../../../context/QueueContext';
import { useNavigate } from 'react-router-dom';

/**
 * Banner flotante que aparece en cualquier página cuando el usuario está
 * en una cola de espera. Permite expandirla, salir, o ir al evento.
 */
export default function ColaBannerFlotante() {
    const { estadoCola, expandir, salirDeCola } = useQueue();
    const navigate = useNavigate();
    const [segundosRestantes, setSegundosRestantes] = useState(0);

    // Resincronizar con cada poll del backend
    useEffect(() => {
        if (estadoCola?.etaSeconds !== undefined && estadoCola.etaSeconds !== null) {
            setSegundosRestantes(estadoCola.etaSeconds);
        }
    }, [estadoCola?.etaSeconds, estadoCola?.lastUpdate]);

    // Countdown local cada segundo
    useEffect(() => {
        const interval = setInterval(() => {
            setSegundosRestantes((t) => Math.max(0, t - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!estadoCola || !estadoCola.minimizado) return null;

    const irAEvento = () => {
        expandir();
        navigate(`/dashboard/evento/${estadoCola.eventoId}`);
    };

    const formatRestante = (segs) => {
        const m = Math.floor(segs / 60);
        const s = segs % 60;
        if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
        return `${s}s`;
    };

    return (
        <div style={estilos.contenedor}>
            <div style={estilos.icono}>⏳</div>
            <div style={estilos.info}>
                <div style={estilos.titulo}>En cola de espera</div>
                <div style={estilos.subtitulo}>
                    {estadoCola.eventoNombre ? `${estadoCola.eventoNombre} · ` : ''}
                    Pos. <strong style={{ color: '#fff' }}>#{estadoCola.position}</strong>
                    {segundosRestantes > 0 ? ` · faltan ${formatRestante(segundosRestantes)}` : ' · casi listo...'}
                </div>
            </div>
            <div style={estilos.acciones}>
                <button onClick={irAEvento} style={{ ...estilos.btn, ...estilos.btnVer }}>
                    Ver
                </button>
                <button onClick={salirDeCola} style={{ ...estilos.btn, ...estilos.btnSalir }}>
                    Salir
                </button>
            </div>
        </div>
    );
}

const estilos = {
    contenedor: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '380px',
        animation: 'slideInUp 0.3s ease',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    icono: {
        fontSize: '2rem',
        animation: 'pulse 2s infinite',
    },
    info: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    titulo: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#fbbf24',
    },
    subtitulo: {
        fontSize: '0.78rem',
        color: '#cbd5e1',
    },
    acciones: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    btn: {
        padding: '4px 10px',
        fontSize: '0.75rem',
        fontWeight: 600,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    btnVer: {
        background: '#3b82f6',
        color: '#fff',
    },
    btnSalir: {
        background: '#64748b',
        color: '#fff',
    },
};
