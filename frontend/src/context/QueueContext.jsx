import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const QueueContext = createContext(null);

const QUEUE_URL = process.env.REACT_APP_QUEUE_URL || 'http://localhost:8003';

/**
 * Estado global de la cola virtual.
 * Permite que el usuario navegue por la app mientras espera, manteniendo
 * el polling y el banner flotante visibles.
 */
export function QueueProvider({ children }) {
    const [estadoCola, setEstadoCola] = useState(null);
    // estadoCola = null  → no está en cola
    // estadoCola = { eventoId, eventoNombre, position, eta, queueEntryId, ticketType, minimizado }
    const [admitido, setAdmitido] = useState(null);
    // admitido = null o { eventoId, ticketType } → se debe abrir el SeatMap
    const [fueAdmitidoPorCola, setFueAdmitidoPorCola] = useState(false);

    const pollRef = useRef(null);

    const detenerPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const consultarPosicion = useCallback(async (eventoId) => {
        const token = localStorage.getItem('token');
        if (!token || !eventoId) return;
        try {
            const res = await fetch(`${QUEUE_URL}/api/v1/queue/${eventoId}/position/`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.status === 'expired') {
                detenerPolling();
                setEstadoCola(null);
                return;
            }

            if (data.queued === false) {
                // Dar 2 segundos de gracia antes de admitir, para que
                // el backend termine de limpiar y el usuario vea "casi listo…"
                detenerPolling();
                setEstadoCola((prev) => prev ? {
                    ...prev,
                    etaSeconds: 0,
                    position: 1,
                    lastUpdate: Date.now(),
                } : prev);

                setTimeout(() => {
                    setEstadoCola((prev) => {
                        if (prev) {
                            setAdmitido({ eventoId: prev.eventoId, ticketType: prev.ticketType });
                            setFueAdmitidoPorCola(true);
                        }
                        return null;
                    });
                }, 2000);
                return;
            }

            setEstadoCola((prev) => {
                if (!prev) return prev;
                // Solo aceptar el ETA del servidor si es menor o igual al countdown
                // local + un margen de 3 segundos (evita que el timer "salte" hacia arriba)
                const serverEta = data.estimated_wait_seconds ?? prev.etaSeconds;
                const useEta = serverEta <= (prev.etaSeconds + 3) ? serverEta : prev.etaSeconds;
                return {
                    ...prev,
                    position: data.position ?? prev.position,
                    eta: data.estimated_wait_minutes ?? prev.eta,
                    etaSeconds: useEta,
                    nextSlotSeconds: data.next_slot_seconds ?? prev.nextSlotSeconds,
                    lastUpdate: Date.now(),
                };
            });
        } catch (err) {
            console.error('Error consultando cola:', err);
        }
    }, [detenerPolling]);

    const entrarACola = useCallback(({ eventoId, eventoNombre, position, eta, etaSeconds, nextSlotSeconds, queueEntryId, ticketType }) => {
        setEstadoCola({
            eventoId,
            eventoNombre,
            position,
            eta,
            etaSeconds,
            nextSlotSeconds,
            queueEntryId,
            ticketType,
            minimizado: false,
            lastUpdate: Date.now(),
        });
        detenerPolling();
        pollRef.current = setInterval(() => consultarPosicion(eventoId), 5000);
    }, [consultarPosicion, detenerPolling]);

    const minimizar = useCallback(() => {
        setEstadoCola((prev) => prev ? { ...prev, minimizado: true } : prev);
    }, []);

    const expandir = useCallback(() => {
        setEstadoCola((prev) => prev ? { ...prev, minimizado: false } : prev);
    }, []);

    const salirDeCola = useCallback(async () => {
        const eventoId = estadoCola?.eventoId;
        detenerPolling();
        setEstadoCola(null);
        if (eventoId) {
            const token = localStorage.getItem('token');
            try {
                await fetch(`${QUEUE_URL}/api/v1/queue/${eventoId}/leave/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            } catch { /* ignorar */ }
        }
    }, [estadoCola, detenerPolling]);

    const limpiarAdmitido = useCallback(() => {
        setAdmitido(null);
        // NO resetear fueAdmitidoPorCola aquí — se mantiene true durante el flujo de compra
    }, []);

    // Resetear explícitamente el flag de cola (solo cuando el usuario sale del proceso)
    const resetearFlagCola = useCallback(() => {
        setFueAdmitidoPorCola(false);
    }, []);

    // Limpieza al desmontar
    useEffect(() => {
        return () => detenerPolling();
    }, [detenerPolling]);

    const value = {
        estadoCola,
        admitido,
        estaEnCola: !!estadoCola,
        fueAdmitidoPorCola,
        entrarACola,
        minimizar,
        expandir,
        salirDeCola,
        limpiarAdmitido,
        resetearFlagCola,
    };

    return (
        <QueueContext.Provider value={value}>
            {children}
        </QueueContext.Provider>
    );
}

export function useQueue() {
    const ctx = useContext(QueueContext);
    if (!ctx) throw new Error('useQueue debe usarse dentro de QueueProvider');
    return ctx;
}
