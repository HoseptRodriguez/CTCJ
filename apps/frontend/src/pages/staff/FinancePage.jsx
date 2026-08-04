import { useEffect, useState } from 'react';
import { PAYMENT_METHOD } from '@ctcj/shared';

import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeBillingError } from '../../lib/billingErrorMessages.js';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';
import { exportToCsv } from '../../lib/csvExport.js';

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

const METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Efectivo',
  [PAYMENT_METHOD.TRANSFER]: 'Transferencia',
  [PAYMENT_METHOD.CARD_IN_PERSON]: 'Tarjeta en el club',
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${pad2(month + 1)}-01`,
    to: `${year}-${pad2(month + 1)}-${pad2(lastDay)}`,
  };
}

function DateRangeForm({ range, onChange }) {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-canvas p-4"
    >
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="finance-from">
          Desde
        </label>
        <input
          id="finance-from"
          type="date"
          value={range.from}
          onChange={(e) => onChange({ ...range, from: e.target.value })}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="finance-to">
          Hasta
        </label>
        <input
          id="finance-to"
          type="date"
          value={range.to}
          onChange={(e) => onChange({ ...range, to: e.target.value })}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
    </form>
  );
}

function CourtPaymentsSection({ data, error }) {
  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-semibold text-primary">Pagos de canchas</h3>
        {data ? (
          <Button
            variant="ghost"
            onClick={() =>
              exportToCsv({
                filename: 'pagos-canchas.csv',
                columns: [
                  { header: 'Fecha', get: (p) => new Date(p.recordedAt).toISOString() },
                  { header: 'Método', get: (p) => METHOD_LABELS[p.method] ?? p.method },
                  { header: 'Monto', get: (p) => p.amountCop },
                ],
                rows: data.payments,
              })
            }
          >
            Exportar CSV
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {!error && !data ? <p className="mt-2 text-sm text-secondary">Cargando...</p> : null}

      {data ? (
        <>
          <p className="mt-2 text-sm text-secondary">
            Subtotal: <strong>{COP_FORMATTER.format(data.totalCop)}</strong> ({data.count} pagos)
          </p>
          {data.payments.length === 0 ? (
            <p className="mt-2 text-sm text-secondary">Sin pagos en este período.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {data.payments.map((p) => (
                <li key={p.id} className="rounded-md bg-raised px-3 py-2">
                  {DATE_FORMATTER.format(new Date(p.recordedAt))} ·{' '}
                  {METHOD_LABELS[p.method] ?? p.method} · {COP_FORMATTER.format(p.amountCop)}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

function MembershipPaymentsSection({ data, error }) {
  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-semibold text-primary">Pagos de membresías</h3>
        {data ? (
          <Button
            variant="ghost"
            onClick={() =>
              exportToCsv({
                filename: 'pagos-membresias.csv',
                columns: [
                  { header: 'Fecha de pago', get: (i) => new Date(i.paidAt).toISOString() },
                  {
                    header: 'Jugador',
                    get: (i) => `${i.playerFirstName ?? ''} ${i.playerLastName ?? ''}`.trim(),
                  },
                  { header: 'Método', get: (i) => METHOD_LABELS[i.paidMethod] ?? i.paidMethod },
                  { header: 'Monto', get: (i) => i.amountCop },
                ],
                rows: data.invoices,
              })
            }
          >
            Exportar CSV
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {!error && !data ? <p className="mt-2 text-sm text-secondary">Cargando...</p> : null}

      {data ? (
        <>
          <p className="mt-2 text-sm text-secondary">
            Subtotal: <strong>{COP_FORMATTER.format(data.totalCop)}</strong> ({data.count} pagos)
          </p>
          {data.invoices.length === 0 ? (
            <p className="mt-2 text-sm text-secondary">Sin pagos en este período.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {data.invoices.map((i) => (
                <li key={i.id} className="rounded-md bg-raised px-3 py-2">
                  {DATE_FORMATTER.format(new Date(i.paidAt))} ·{' '}
                  {i.playerFirstName ?? 'Jugador desconocido'} {i.playerLastName ?? ''} ·{' '}
                  {METHOD_LABELS[i.paidMethod] ?? i.paidMethod} ·{' '}
                  {COP_FORMATTER.format(i.amountCop)}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

function CarteraSection({ data, error }) {
  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-semibold text-primary">Cartera (facturas pendientes)</h3>
        {data ? (
          <Button
            variant="ghost"
            onClick={() =>
              exportToCsv({
                filename: 'cartera.csv',
                columns: [
                  {
                    header: 'Jugador',
                    get: (i) => `${i.playerFirstName ?? ''} ${i.playerLastName ?? ''}`.trim(),
                  },
                  { header: 'Vence', get: (i) => new Date(i.dueDate).toISOString().slice(0, 10) },
                  { header: 'Vencida', get: (i) => (i.isOverdue ? 'Sí' : 'No') },
                  { header: 'Monto', get: (i) => i.amountCop },
                ],
                rows: data.invoices,
              })
            }
          >
            Exportar CSV
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {!error && !data ? <p className="mt-2 text-sm text-secondary">Cargando...</p> : null}

      {data ? (
        <>
          <p className="mt-2 text-sm text-secondary">
            Total pendiente: <strong>{COP_FORMATTER.format(data.totalCop)}</strong> ({data.count}{' '}
            facturas)
          </p>
          {data.invoices.length === 0 ? (
            <p className="mt-2 text-sm text-secondary">Sin facturas pendientes.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {data.invoices.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between rounded-md bg-raised px-3 py-2"
                >
                  <span>
                    {i.playerFirstName ?? 'Jugador desconocido'} {i.playerLastName ?? ''} · vence{' '}
                    {DATE_FORMATTER.format(new Date(i.dueDate))} ·{' '}
                    {COP_FORMATTER.format(i.amountCop)}
                  </span>
                  {i.isOverdue ? (
                    <span className="rounded-full border border-error px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-error">
                      Vencida
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

export function FinancePage() {
  const [range, setRange] = useState(currentMonthRange);
  const [courtPayments, setCourtPayments] = useState(null);
  const [courtError, setCourtError] = useState(null);
  const [membershipPayments, setMembershipPayments] = useState(null);
  const [membershipError, setMembershipError] = useState(null);
  const [cartera, setCartera] = useState(null);
  const [carteraError, setCarteraError] = useState(null);

  useEffect(() => {
    setCourtPayments(null);
    setCourtError(null);
    bookingClient
      .listPayments({ from: range.from, to: range.to })
      .then(setCourtPayments)
      .catch((err) => setCourtError(describeBookingError(err)));

    setMembershipPayments(null);
    setMembershipError(null);
    billingClient
      .listInvoicesClubWide({ status: 'PAID', from: range.from, to: range.to })
      .then(setMembershipPayments)
      .catch((err) => setMembershipError(describeBillingError(err)));
  }, [range.from, range.to]);

  useEffect(() => {
    billingClient
      .listInvoicesClubWide({ status: 'PENDING' })
      .then(setCartera)
      .catch((err) => setCarteraError(describeBillingError(err)));
  }, []);

  const combinedTotalCop =
    courtPayments && membershipPayments
      ? courtPayments.totalCop + membershipPayments.totalCop
      : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Gestión financiera</h1>
      <p className="mt-1 text-secondary">
        Ingresos por canchas y membresías, y cartera pendiente de cobro.
      </p>

      <div className="mt-6">
        <DateRangeForm range={range} onChange={setRange} />
      </div>

      <div className="mt-6 rounded-md border border-neutral-200 bg-raised p-4">
        <p className="text-sm text-secondary">Ingresos totales del período</p>
        <p className="font-display text-3xl font-semibold text-primary">
          {combinedTotalCop != null ? COP_FORMATTER.format(combinedTotalCop) : 'Cargando...'}
        </p>
      </div>

      <CourtPaymentsSection data={courtPayments} error={courtError} />
      <MembershipPaymentsSection data={membershipPayments} error={membershipError} />
      <CarteraSection data={cartera} error={carteraError} />
    </div>
  );
}
