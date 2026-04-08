import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserTickets } from '../services/profileService';
import './MisCompras.css';

export default function MisCompras() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    const cargar = async () => {
      setLoading(true);
      try {
        const data = await getUserTickets();
        if (mounted) setPurchases(data || []);
      } catch (err) {
        console.error('Error cargando compras:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    cargar();
    return () => { mounted = false; };
  }, []);

  // Auto-descargar PDF si backend provee pdf_url y compra está pagada
  const [autoDownloaded, setAutoDownloaded] = useState(() => new Set());
  useEffect(() => {
    purchases.forEach((p) => {
      const id = p.id || p.purchase_id || p.code;
      const status = (p.status || p.state || p.status_detail || '').toString().toLowerCase();
      const pdfUrl = p.pdf_url || p.download_url || p.file_url || null;
      if (pdfUrl && (status === 'paid' || status === 'completed' || status === 'pagado') && !autoDownloaded.has(id)) {
        // descargar
        fetch(pdfUrl, { headers: { Accept: 'application/pdf' } })
          .then((r) => r.blob())
          .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(p.event?.name || p.event_name || 'entrada').replace(/\s+/g, '_')}_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setAutoDownloaded((s) => new Set([...s, id]));
          })
          .catch(() => {
            // ignore download errors
            setAutoDownloaded((s) => new Set([...s, id]));
          });
      }
    });
  }, [purchases]);

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleString('es-ES');
    } catch { return d; }
  };

  return (
    <section className="mis-compras-page">
      <header className="mis-compras-header">
        <h2>Mis Compras</h2>
        <p>Consulta el historial de tus compras y revisa detalles de cada entrada.</p>
        <Link to="/dashboard" className="btn-secundario small">Volver</Link>
      </header>

      <div className="mis-compras-grid">
        <div className="compras-list">
          {loading ? (
            <p>Cargando historial...</p>
          ) : purchases.length === 0 ? (
            <p>No se encontraron compras.</p>
          ) : (
            purchases.map(p => {
              const id = p.id || p.purchase_id || p.code || Math.random().toString(36).slice(2);
              const eventName = p.event?.name || p.event_name || p.event || 'Evento desconocido';
              const date = p.purchase_date || p.created_at || p.ts || '';
              const price = p.amount ?? p.total ?? p.price ?? p.precio ?? '0.00';
              return (
                <div className="compra-card" key={id} onClick={() => setSelected(p)}>
                  <div className="compra-main">
                    <div className="compra-title">{eventName}</div>
                    <div className="compra-meta">{formatDate(date)}</div>
                  </div>
                  <div className="compra-right">
                    <div className="compra-amount">Bs. {price}</div>
                    <button className="btn-link small" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>Ver</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="compra-detalle">
          {selected ? (
            <div>
              <h3>Detalle de la compra</h3>
              <p><strong>Evento:</strong> {selected.event?.name || selected.event_name || selected.event}</p>
              <p><strong>Fecha compra:</strong> {formatDate(selected.purchase_date || selected.created_at || selected.ts)}</p>
              <p><strong>Monto:</strong> Bs. {selected.amount ?? selected.total ?? selected.price ?? selected.precio ?? '0.00'}</p>
              <p><strong>Código compra:</strong> {selected.id || selected.purchase_id || selected.code}</p>
              {selected.tickets && Array.isArray(selected.tickets) && (
                <div>
                  <h4>Entradas</h4>
                  <ul>
                    {selected.tickets.map((t, i) => (
                      <li key={i}>{t.name || t.tipo || t.id} — {t.seat || t.location || 'General'}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button className="btn-principal" onClick={() => alert('Descargar PDF (como en perfil)')}>Descargar entrada</button>
                <button className="btn-secundario" style={{ marginLeft: 8 }} onClick={() => setSelected(null)}>Cerrar</button>
              </div>
            </div>
          ) : (
            <div>
              <h3>Selecciona una compra</h3>
              <p>Haz clic en una tarjeta de la izquierda para ver los detalles de la compra.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
