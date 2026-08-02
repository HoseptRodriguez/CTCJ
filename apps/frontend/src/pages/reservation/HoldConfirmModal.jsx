import { useEffect, useState } from 'react';

import { bookingClient } from '../../api/bookingClient.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';

// Explicit timeZone -- slot.start/end are UTC instants representing a
// specific club-local (Bogotá) hour (see BookingGrid's slotRange). Without
// pinning the zone here, a viewer whose device isn't set to America/Bogota
// would see the wrong hour.
const TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Bogota',
});

/** @param {{ slot: {courtId: string, courtName: string, start: string, end: string}, onClose: () => void, onConfirmed: () => void }} props */
export function HoldConfirmModal({ slot, onClose, onConfirmed }) {
  const [phase, setPhase] = useState('holding'); // 'holding' | 'held' | 'confirming' | 'error'
  const [hold, setHold] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    bookingClient
      .hold({ courtId: slot.courtId, start: slot.start, end: slot.end })
      .then((result) => {
        if (!cancelled) {
          setHold(result);
          setPhase('held');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(describeBookingError(err));
          setPhase('error');
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.courtId, slot.start, slot.end]);

  function handleCancel() {
    if (hold?.reservationId) {
      bookingClient.cancel(hold.reservationId).catch(() => {});
    }
    onClose();
  }

  async function handleConfirm() {
    setPhase('confirming');
    try {
      await bookingClient.confirm({ reservationId: hold.reservationId });
      onConfirmed();
    } catch (err) {
      setError(describeBookingError(err));
      setPhase('error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-navy-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hold-modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-canvas p-6 shadow-lg">
        <h2 id="hold-modal-title" className="font-display text-xl font-semibold text-primary">
          {slot.courtName}
        </h2>
        <p className="mt-1 text-secondary">
          {TIME_FORMATTER.format(new Date(slot.start))} –{' '}
          {TIME_FORMATTER.format(new Date(slot.end))}
        </p>

        {phase === 'holding' ? (
          <p className="mt-6 text-secondary">Reteniendo el horario...</p>
        ) : null}

        {phase === 'held' || phase === 'confirming' ? (
          <>
            <p className="mt-6 text-secondary">
              Tu horario quedó retenido por unos minutos. El pago se realiza en recepción del club,
              no en línea -- confirma aquí para asegurar tu cancha y paga al llegar.
            </p>
            <div className="mt-3">
              <Badge>Pago en línea: próximamente</Badge>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="primary" onClick={handleConfirm} disabled={phase === 'confirming'}>
                {phase === 'confirming' ? 'Confirmando...' : 'Confirmar reserva'}
              </Button>
              <Button variant="ghost" onClick={handleCancel} disabled={phase === 'confirming'}>
                Cancelar
              </Button>
            </div>
          </>
        ) : null}

        {phase === 'error' ? (
          <>
            <p className="mt-6 text-error">{error}</p>
            <div className="mt-6">
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
