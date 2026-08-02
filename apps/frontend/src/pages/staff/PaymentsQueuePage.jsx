import { useEffect, useState } from 'react';
import { PAYMENT_METHOD } from '@ctcj/shared';

import { bookingClient } from '../../api/bookingClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';
import {
  MEMBERSHIP_STATUS_DISPLAY,
  describeMembershipStatus,
} from '../../lib/membershipStatusLabels.js';
import { bogotaTodayKey, DatePicker } from '../reservation/DatePicker.jsx';

const TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Bogota',
});

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Efectivo',
  [PAYMENT_METHOD.TRANSFER]: 'Transferencia',
  [PAYMENT_METHOD.CARD_IN_PERSON]: 'Tarjeta en el club',
};

function MembershipStatusBadge({ status }) {
  const display = MEMBERSHIP_STATUS_DISPLAY[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
        display ? display.className : 'border-neutral-200 bg-neutral-100 text-secondary'
      }`}
    >
      {describeMembershipStatus(status)}
    </span>
  );
}

function ReservationRow({ reservation, courtName, onPaid }) {
  const [method, setMethod] = useState(PAYMENT_METHOD.CASH);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleMarkPaid() {
    setSubmitting(true);
    setError(null);
    try {
      const payment = await bookingClient.recordPayment(reservation.id, { method });
      onPaid(payment, courtName);
    } catch (err) {
      setError(describeBookingError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold text-primary">{courtName}</p>
            {reservation.holderMembershipStatus !== undefined ? (
              <MembershipStatusBadge status={reservation.holderMembershipStatus} />
            ) : null}
          </div>
          <p className="text-sm text-secondary">
            {TIME_FORMATTER.format(new Date(reservation.periodStart))} –{' '}
            {TIME_FORMATTER.format(new Date(reservation.periodEnd))}
            {reservation.priceCop != null ? ` · ${COP_FORMATTER.format(reservation.priceCop)}` : ''}
          </p>
        </div>

        {reservation.priceCop == null ? (
          <span className="text-sm text-error">Sin precio configurado</span>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={submitting}
              className="rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
              aria-label="Método de pago"
            >
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button variant="primary" onClick={handleMarkPaid} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Marcar como pagada'}
            </Button>
          </div>
        )}
      </div>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </li>
  );
}

function Receipt({ receipt, courtName, onDismiss }) {
  return (
    <div className="rounded-md border border-dashed border-green-600 bg-green-50 p-4 print:border-solid">
      <p className="font-display font-semibold text-primary">Pago registrado</p>
      <dl className="mt-2 space-y-1 text-sm text-secondary">
        <div>
          <dt className="inline font-semibold">Cancha: </dt>
          <dd className="inline">{courtName}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Monto: </dt>
          <dd className="inline">{COP_FORMATTER.format(receipt.amountCop)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Método: </dt>
          <dd className="inline">{METHOD_LABELS[receipt.method] ?? receipt.method}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Registrado: </dt>
          <dd className="inline">{new Date(receipt.recordedAt).toLocaleString('es-CO')}</dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-3">
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          Imprimir
        </Button>
        <Button variant="ghost" onClick={onDismiss} className="print:hidden">
          Cerrar
        </Button>
      </div>
    </div>
  );
}

export function PaymentsQueuePage() {
  const [date, setDate] = useState(bogotaTodayKey);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  // The most recently recorded payment, shown as a standalone receipt --
  // deliberately NOT tied to the reservation's position in the unpaid/paid
  // split below. A successful payment immediately moves the reservation
  // from "unpaid" to "paid" on the next refetch, which is a different render
  // branch entirely; keying the receipt to the unpaid list item meant it got
  // silently orphaned the instant that refetch completed (real bug, found
  // via a real browser walkthrough -- see Phase 4 verification).
  const [receipt, setReceipt] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSchedule(null);
    setError(null);
    bookingClient
      .getSchedule(date)
      .then((data) => {
        if (!cancelled) setSchedule(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [date, refreshToken]);

  function handlePaid(payment, courtName) {
    setReceipt({ payment, courtName });
    setRefreshToken((n) => n + 1);
  }

  const courtNameById = new Map((schedule?.courts ?? []).map((c) => [c.id, c.name]));
  const confirmed = (schedule?.reservations ?? []).filter((r) => r.status === 'CONFIRMED');
  const unpaid = confirmed.filter((r) => r.paymentId == null);
  const paid = confirmed.filter((r) => r.paymentId != null);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Pagos</h1>
      <p className="mt-1 text-secondary">
        Reservas confirmadas del día -- registra el pago cuando el jugador llegue.
      </p>

      <div className="mt-6">
        <DatePicker
          value={date}
          onChange={(next) => {
            setDate(next);
            setReceipt(null);
          }}
        />
      </div>

      {receipt ? (
        <div className="mt-6">
          <Receipt
            receipt={receipt.payment}
            courtName={receipt.courtName}
            onDismiss={() => setReceipt(null)}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 text-error">No se pudo cargar el día. Intenta de nuevo.</p>
      ) : null}
      {!error && !schedule ? <p className="mt-6 text-secondary">Cargando...</p> : null}

      {schedule ? (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="font-display text-lg font-semibold text-primary">
              Pendientes de pago ({unpaid.length})
            </h2>
            {unpaid.length === 0 ? (
              <p className="mt-2 text-secondary">No hay reservas confirmadas sin pagar hoy.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {unpaid.map((r) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    courtName={courtNameById.get(r.courtId) ?? 'Cancha'}
                    onPaid={handlePaid}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-primary">
              Pagadas ({paid.length})
            </h2>
            {paid.length === 0 ? (
              <p className="mt-2 text-secondary">Ninguna todavía.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {paid.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-neutral-200 bg-canvas p-3 text-sm text-secondary"
                  >
                    {courtNameById.get(r.courtId) ?? 'Cancha'} ·{' '}
                    {TIME_FORMATTER.format(new Date(r.periodStart))}–
                    {TIME_FORMATTER.format(new Date(r.periodEnd))} · Pagada
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
