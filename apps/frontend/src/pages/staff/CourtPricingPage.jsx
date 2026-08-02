import { useEffect, useState } from 'react';

import { bookingClient } from '../../api/bookingClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';

function CourtRow({ court, onSaved }) {
  const [value, setValue] = useState(court.priceCop != null ? String(court.priceCop) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await bookingClient.setCourtPrice(court.id, Number(value));
      onSaved(court.id, result.priceCop);
      setSaved(true);
    } catch (err) {
      setError(describeBookingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-canvas p-4">
      <div>
        <p className="font-display font-semibold text-primary">{court.name}</p>
        <p className="text-sm text-secondary">
          {court.priceCop != null
            ? `Precio actual: $${court.priceCop.toLocaleString('es-CO')}`
            : 'Sin precio configurado'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`price-${court.id}`}>
          Precio por hora en pesos
        </label>
        <input
          id={`price-${court.id}`}
          type="number"
          min="1"
          step="1"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="Pesos por hora"
          className="w-36 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
        <Button variant="primary" onClick={handleSave} disabled={saving || !value}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
      {saved ? <p className="w-full text-sm text-success">Precio actualizado.</p> : null}
    </li>
  );
}

export function CourtPricingPage() {
  const [courts, setCourts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    bookingClient
      .listCourts()
      .then((data) => {
        if (!cancelled) setCourts(data.courts);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSaved(courtId, priceCop) {
    setCourts((prev) => prev.map((c) => (c.id === courtId ? { ...c, priceCop } : c)));
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Precios de canchas</h1>
      <p className="mt-1 text-secondary">
        El precio se cobra al confirmar la reserva y queda fijo para esa reserva, aunque el precio
        de la cancha cambie después.
      </p>

      {error ? <p className="mt-6 text-error">No se pudieron cargar las canchas.</p> : null}
      {!error && !courts ? <p className="mt-6 text-secondary">Cargando...</p> : null}

      {courts ? (
        <ul className="mt-6 space-y-3">
          {courts.map((court) => (
            <CourtRow key={court.id} court={court} onSaved={handleSaved} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
