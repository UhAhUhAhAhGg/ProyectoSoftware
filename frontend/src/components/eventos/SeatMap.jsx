import React, { useEffect, useState, useRef } from 'react';
import './SeatMap.css';
import { eventosService } from '../../services/eventosService';

const DEFAULT_ROWS = 6;
const DEFAULT_PER_ROW = 10;

function idFromPos(r, c) {
  const letter = String.fromCharCode(65 + r); // A, B, C...
  return `${letter}${c + 1}`;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export default function SeatMap({ eventId, ticketType, onConfirm, onCancel }) {
  const rows = Number(ticketType?.filas) || DEFAULT_ROWS;
  const perRow = Number(ticketType?.asientosPorFila) || DEFAULT_PER_ROW;
  const [occupiedSet, setOccupiedSet] = useState(new Set());
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  // Zoom / pan
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const wrapperRef = useRef(null);

  // Drag-select
  const isPointerDown = useRef(false);
  const dragMode = useRef(null); // 'select' | 'deselect'

  // Realtime
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const lockRef = useRef({ id: null, timer: null });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const base = process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002';
        // Try websocket first
        const wsBase = process.env.NEXT_PUBLIC_EVENTS_WS_URL || base.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/ws/events/${eventId}/seats/`;
        // Attempt websocket with reconnection/backoff
        let attempts = 0;
        function connectWS() {
          try {
            wsRef.current = new WebSocket(wsUrl);
          } catch (e) { wsRef.current = null; return; }
          wsRef.current.onmessage = (ev) => {
            try {
              const data = JSON.parse(ev.data);
              if (data.occupiedSeats) {
                if (mounted) setOccupiedSet(new Set((data.occupiedSeats || []).map(String)));
              }
            } catch (e) { /* ignore */ }
          };
          wsRef.current.onopen = () => { attempts = 0; };
          wsRef.current.onclose = () => {
            wsRef.current = null;
            // schedule reconnect with exponential backoff
            attempts = Math.min(6, attempts + 1);
            const delay = Math.pow(2, attempts) * 500;
            setTimeout(() => connectWS(), delay);
          };
          wsRef.current.onerror = () => {
            wsRef.current && wsRef.current.close();
            wsRef.current = null;
          };
        }
        connectWS();

        // initial fetch and polling fallback
        const fetchSeats = async () => {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002'}/api/v1/events/${eventId}/seat-map/?ticket_type=${ticketType?.id}`);
            if (res.ok) {
              const data = await res.json();
              if (mounted) setOccupiedSet(new Set((data.occupiedSeats || []).map(String)));
            } else {
              // generate mock
              const s = new Set();
              const total = rows * perRow;
              const occupiedCount = Math.min(total, Number(ticketType?.cupoVendido || Math.floor(total * 0.15)));
              while (s.size < occupiedCount) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * perRow);
                s.add(idFromPos(r, c));
              }
              if (mounted) setOccupiedSet(s);
            }
          } catch (err) {
            const s = new Set();
            const total = rows * perRow;
            const occupiedCount = Math.min(total, Number(ticketType?.cupoVendido || Math.floor(total * 0.15)));
            while (s.size < occupiedCount) {
              const r = Math.floor(Math.random() * rows);
              const c = Math.floor(Math.random() * perRow);
              s.add(idFromPos(r, c));
            }
            if (mounted) setOccupiedSet(s);
          }
        };

        await fetchSeats();
        pollRef.current = setInterval(fetchSeats, 5000);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [eventId, ticketType, rows, perRow]);

  // Auto-lock selected seats: refresh lock while selection exists
  useEffect(() => {
    let cancelled = false;
    async function lockSeats() {
      if (!selected || selected.length === 0) return;
      try {
        const resp = await eventosService.lockSeats(eventId, selected, 120);
        // backend may return lock id or success body
        lockRef.current.id = resp?.lock_id || resp?.id || null;
        // refresh every 45s
        if (lockRef.current.timer) clearTimeout(lockRef.current.timer);
        lockRef.current.timer = setTimeout(() => lockSeats(), 45000);
      } catch (err) {
        // if conflict, notify and refresh seat map
        if (!cancelled) {
          console.warn('Lock failed', err);
          if (err && err.status === 409) {
            alert('Algunos asientos se ocuparon mientras seleccionaba. Se actualizará la vista.');
            // force a manual fetch to update occupied seats
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_EVENTS_URL || 'http://localhost:8002'}/api/v1/events/${eventId}/seat-map/?ticket_type=${ticketType?.id}`);
              if (res.ok) {
                const data = await res.json();
                setOccupiedSet(new Set((data.occupiedSeats || []).map(String)));
              }
            } catch (e) { /* ignore */ }
          }
        }
      }
    }
    lockSeats();
    return () => { cancelled = true; if (lockRef.current.timer) clearTimeout(lockRef.current.timer); };
  }, [selected, eventId, ticketType]);

  useEffect(() => {
    const onUp = () => {
      isPointerDown.current = false;
      dragMode.current = null;
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, []);

  function toggleSeat(seatId, force) {
    if (occupiedSet.has(seatId)) return;
    setSelected((prev) => {
      const exists = prev.includes(seatId);
      if (force === 'select') {
        if (exists) return prev; else return [...prev, seatId];
      }
      if (force === 'deselect') {
        if (!exists) return prev; else return prev.filter(s => s !== seatId);
      }
      if (exists) return prev.filter(s => s !== seatId);
      return [...prev, seatId];
    });
  }

  // pointer handlers for drag-select
  function onSeatPointerDown(e, seatId) {
    e.preventDefault();
    if (occupiedSet.has(seatId)) return;
    isPointerDown.current = true;
    const already = selected.includes(seatId);
    dragMode.current = already ? 'deselect' : 'select';
    toggleSeat(seatId, dragMode.current === 'select' ? 'select' : 'deselect');
  }

  function onSeatPointerEnter(seatId) {
    if (!isPointerDown.current || !dragMode.current) return;
    toggleSeat(seatId, dragMode.current === 'select' ? 'select' : 'deselect');
  }

  // pan/zoom handlers
  function onWheel(e) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => clamp(s + delta, 0.5, 2.5));
  }

  function onPointerDown(e) {
    // start panning only when pointer is on empty space (not on seat button)
    if (e.target.closest && e.target.closest('.seat')) return;
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e) {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setTx((t) => t + dx);
    setTy((t) => t + dy);
  }

  function onPointerUp() { draggingRef.current = false; }

  return (
    <div className="seatmap-root">
      <div className="seatmap-header">
        <div className="legend">
          <div><span className="seat legend available"/> Disponible</div>
          <div><span className="seat legend selected"/> Seleccionado</div>
          <div><span className="seat legend occupied"/> Ocupado</div>
        </div>
        <div className="zoom-controls">
          <button className="btn" onClick={() => setScale(s => clamp(s - 0.1, 0.5, 2.5))}>-</button>
          <span style={{padding:'0 8px'}}>{Math.round(scale*100)}%</span>
          <button className="btn" onClick={() => setScale(s => clamp(s + 0.1, 0.5, 2.5))}>+</button>
          <button className="btn" onClick={() => { setScale(1); setTx(0); setTy(0); }}>Fit</button>
        </div>
      </div>

      {loading ? (
        <div>Cargando plazas...</div>
      ) : (
        <div
          className="seatmap-viewport"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          ref={wrapperRef}
        >
          <div
            className="seatmap-grid"
            role="grid"
            aria-label="Mapa de asientos"
            style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0' }}
          >
            {Array.from({ length: rows }).map((_, r) => (
              <div className="seatmap-row" key={r}>
                <div className="row-label">{String.fromCharCode(65 + r)}</div>
                <div className="row-seats">
                  {Array.from({ length: perRow }).map((_, c) => {
                    const id = idFromPos(r, c);
                    const occupied = occupiedSet.has(id);
                    const isSelected = selected.includes(id);
                    const cls = occupied ? 'occupied' : isSelected ? 'selected' : 'available';
                    return (
                      <button
                        key={id}
                        className={`seat ${cls}`}
                        onClick={() => toggleSeat(id)}
                        onPointerDown={(e) => onSeatPointerDown(e, id)}
                        onPointerEnter={() => onSeatPointerEnter(id)}
                        disabled={occupied}
                        aria-pressed={isSelected}
                        title={id}
                      >
                        {c + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="seatmap-actions">
        <div className="selected-count">Seleccionados: {selected.length}</div>
        <div className="actions">
          <button className="btn cancelar" onClick={onCancel}>Cancelar</button>
          <button
            className="btn confirmar"
            onClick={() => onConfirm && onConfirm(selected)}
            disabled={selected.length === 0}
          >Comprar {selected.length > 0 ? `(${selected.length})` : ''}</button>
        </div>
      </div>
    </div>
  );
}
