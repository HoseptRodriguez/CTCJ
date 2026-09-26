import { RESERVATION_TYPE } from '@ctcj/shared';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { bookingClient } from '../../api/bookingClient.js';
import { PrinterIcon } from '../../components/icons/PrinterIcon.jsx';
import { AnimatedCheck } from '../../components/motion/AnimatedCheck.jsx';
import { AnimatedList } from '../../components/motion/AnimatedList.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { cn } from '../../components/ui/cn.js';
import { ClubLogo } from '../../components/ui/ClubLogo.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';
import { CLUB_NAME } from '../../lib/clubInfo.js';
import { clubTodayKey } from '../../lib/clubTime.js';
import { formatCop, formatTime } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { SectionCard } from '../mictcj/shared.jsx';

import {
  dayTitle,
  isChargeable,
  isUnpaid,
  METHOD_LABELS,
  RESERVATION_TYPE_LABELS,
  StaffDateNav,
  timeRange,
} from './staffShared.jsx';

const DATE_TIME = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

function whoFor(r) {
  if (r.holderName) return r.holderName;
  const type = r.reservationType ?? RESERVATION_TYPE.PRIVATE;
  return type === RESERVATION_TYPE.PRIVATE ? 'Jugador sin nombre' : RESERVATION_TYPE_LABELS[type];
}

// ---------------------------------------------------------------------------

function ReservationRow({ reservation: r, courtName, payment, onCharge, onReceipt }) {
  const paid = r.paymentId != null;
  const type = r.reservationType ?? RESERVATION_TYPE.PRIVATE;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center md:p-5">
      <div
        className={cn(
          'flex shrink-0 flex-row items-baseline gap-2 rounded-lg px-4 py-3 text-white sm:w-36 sm:flex-col sm:items-start sm:gap-0',
          paid ? 'bg-status-ok-fg' : 'bg-clay',
        )}
      >
        <span className="font-display text-h3 font-bold leading-tight">
          {formatTime(r.periodStart)}
        </span>
        <span className="text-body font-semibold">{courtName}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-lead font-bold text-ink">{whoFor(r)}</p>
        <p className="text-body text-ink-soft">
          {type !== RESERVATION_TYPE.PRIVATE && `${RESERVATION_TYPE_LABELS[type]} · `}
          {timeRange(r)}
        </p>
        {r.bookedByOther && (
          <p className="text-body text-ink">
            La reservó su acudiente{r.createdByName ? `, ${r.createdByName}` : ''}
          </p>
        )}
        {r.holderMembershipStatus && (
          <StatusBadge status={r.holderMembershipStatus} className="mt-2" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        <p className="font-display text-h3 font-bold text-ink">{formatCop(r.priceCop)}</p>
        {paid ? (
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              status="al-dia"
              label={
                payment ? `Pagada · ${METHOD_LABELS[payment.method] ?? payment.method}` : 'Pagada'
              }
            />
            {payment && (
              <Button variant="ghost" icon={<PrinterIcon />} onClick={() => onReceipt(r, payment)}>
                Recibo
              </Button>
            )}
          </div>
        ) : r.priceCop == null ? (
          <p className="max-w-[14rem] text-body font-semibold text-danger">
            Sin precio configurado. Pídele al administrador que lo defina en Precios.
          </p>
        ) : (
          <Button size="lg" onClick={() => onCharge(r)}>
            Cobrar
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** What gets printed: only this, on a plain page (see the print: classes). */
function PrintableReceipt({ receipt }) {
  if (!receipt) return null;
  return createPortal(
    <div className="receipt-print hidden bg-white p-8 text-black print:block">
      <div className="flex items-center gap-4 border-b border-black pb-4">
        <ClubLogo decorative />
        <div>
          <p className="text-lead font-bold">{CLUB_NAME}</p>
          <p className="text-body">Recibo de pago de cancha</p>
        </div>
      </div>
      <dl className="mt-6 space-y-2 text-lead">
        <ReceiptLine term="Jugador" value={receipt.name} />
        <ReceiptLine term="Cancha" value={receipt.courtName} />
        <ReceiptLine term="Horario" value={`${dayTitle(receipt.dateKey)}, ${receipt.time}`} />
        <ReceiptLine term="Valor" value={formatCop(receipt.amountCop)} />
        <ReceiptLine term="Método" value={METHOD_LABELS[receipt.method] ?? receipt.method} />
        <ReceiptLine term="Registrado" value={DATE_TIME.format(new Date(receipt.recordedAt))} />
        <ReceiptLine term="N.º de pago" value={receipt.paymentId} />
      </dl>
      <p className="mt-8 text-body">Gracias por jugar en el club.</p>
    </div>,
    document.body,
  );
}

function ReceiptLine({ term, value }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 font-bold">{term}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ReceiptSummary({ receipt }) {
  return (
    <dl className="space-y-2 rounded-xl bg-page p-4 text-body text-ink">
      <ReceiptLine term="Cancha" value={`${receipt.courtName}, ${receipt.time}`} />
      <ReceiptLine term="Valor" value={formatCop(receipt.amountCop)} />
      <ReceiptLine term="Método" value={METHOD_LABELS[receipt.method] ?? receipt.method} />
    </dl>
  );
}

// ---------------------------------------------------------------------------

function ChargePanel({
  reservation,
  courtName,
  dateKey,
  nextReservation,
  onPaid,
  onNext,
  onClose,
  onPrint,
}) {
  const [method, setMethod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const firstMethodRef = useRef(null);
  const name = reservation ? whoFor(reservation) : '';

  async function markPaid() {
    if (!method) {
      setError('Elige cómo pagó.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payment = await bookingClient.recordPayment(reservation.id, { method });
      const done = {
        paymentId: payment.paymentId,
        name,
        courtName,
        dateKey,
        time: timeRange(reservation),
        amountCop: payment.amountCop,
        method: payment.method,
        recordedAt: payment.recordedAt,
      };
      setReceipt(done);
      onPaid(reservation, payment, done);
    } catch (err) {
      setError(describeBookingError(err));
    } finally {
      setSaving(false);
    }
  }

  const title = receipt ? 'Pago registrado' : `Cobrar a ${name}`;

  return (
    <SlidePanel
      open={reservation != null}
      onClose={onClose}
      title={title}
      initialFocusRef={receipt ? undefined : firstMethodRef}
      footer={
        receipt ? (
          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              size="lg"
              icon={<PrinterIcon />}
              fullWidth
              onClick={() => onPrint(receipt)}
            >
              Imprimir recibo
            </Button>
            {nextReservation ? (
              <Button size="lg" fullWidth onClick={onNext}>
                Siguiente cobro
              </Button>
            ) : (
              <Button size="lg" fullWidth onClick={onClose}>
                Listo, no hay más cobros
              </Button>
            )}
          </div>
        ) : (
          <Button
            size="lg"
            fullWidth
            loading={saving}
            loadingText="Guardando pago…"
            onClick={markPaid}
          >
            Marcar como pagada
          </Button>
        )
      }
    >
      {reservation && !receipt && (
        <div className="space-y-6">
          <div>
            <p className="text-body text-ink-soft">
              {courtName} · {timeRange(reservation)}
            </p>
            {reservation.bookedByOther && (
              <p className="text-body text-ink">
                La reservó su acudiente
                {reservation.createdByName ? `, ${reservation.createdByName}` : ''}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-page p-5">
            <p className="text-body font-semibold text-ink-soft">Valor a cobrar</p>
            <p className="font-display text-stat font-bold text-ink">
              {formatCop(reservation.priceCop)}
            </p>
            <p className="mt-1 text-body-sm text-ink-soft">
              Es el precio que quedó guardado al reservar. No se puede cambiar aquí.
            </p>
          </div>
          <fieldset>
            <legend className="mb-3 text-lead font-bold text-ink">¿Cómo pagó?</legend>
            <div className="grid gap-3">
              {Object.entries(METHOD_LABELS).map(([value, label], i) => {
                const checked = method === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      'flex min-h-btn-lg cursor-pointer items-center gap-3 rounded-xl border-2 px-4 text-lead font-semibold',
                      'has-[:focus-visible]:shadow-focus',
                      checked
                        ? 'border-navy-500 bg-lime text-navy-500'
                        : 'border-line-strong bg-surface text-ink hover:bg-page',
                    )}
                  >
                    <input
                      ref={i === 0 ? firstMethodRef : undefined}
                      type="radio"
                      name="metodo-pago"
                      value={value}
                      checked={checked}
                      onChange={() => {
                        setMethod(value);
                        setError(null);
                      }}
                      className="h-6 w-6 accent-navy-500"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-status-overdue-bg p-3 text-body font-semibold text-status-overdue-fg"
            >
              {error}
            </p>
          )}
        </div>
      )}
      {receipt && (
        <div className="space-y-6 text-center">
          <AnimatedCheck label="Pago guardado" className="mx-auto" />
          <p className="text-lead text-ink">
            <strong>{receipt.name}</strong> quedó a paz y salvo por esta reserva.
          </p>
          <div className="text-left">
            <ReceiptSummary receipt={receipt} />
          </div>
        </div>
      )}
    </SlidePanel>
  );
}

// ---------------------------------------------------------------------------

export function PaymentsQueuePage() {
  const toast = useToast();
  const [date, setDate] = useState(clubTodayKey);
  const [tab, setTab] = useState('unpaid');
  const [chargingId, setChargingId] = useState(null);
  const [printing, setPrinting] = useState(null);

  const day = useAsync(
    () =>
      Promise.all([
        bookingClient.getSchedule(date),
        bookingClient.listPayments({ from: date, to: date }).catch(() => ({ payments: [] })),
      ]).then(([schedule, payments]) => ({ ...schedule, payments: payments.payments })),
    [date],
  );

  const courtName = useMemo(() => {
    const map = new Map((day.data?.courts ?? []).map((c) => [c.id, c.name]));
    return (r) => map.get(r.courtId) ?? 'Cancha';
  }, [day.data]);

  const sorted = (day.data?.reservations ?? [])
    .filter(isChargeable)
    .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));
  const unpaid = sorted.filter(isUnpaid);
  const paid = sorted.filter((r) => !isUnpaid(r));
  const paymentsById = new Map((day.data?.payments ?? []).map((p) => [p.id, p]));

  const charging = chargingId ? sorted.find((r) => r.id === chargingId) : null;
  const nextUnpaid = unpaid.find((r) => r.id !== chargingId && r.priceCop != null);

  function handlePaid(reservation, payment) {
    // Move the row locally (animated) -- no refetch needed for this change.
    day.setData((d) => ({
      ...d,
      reservations: d.reservations.map((r) =>
        r.id === reservation.id ? { ...r, paymentId: payment.paymentId } : r,
      ),
      payments: [
        {
          id: payment.paymentId,
          reservationId: reservation.id,
          amountCop: payment.amountCop,
          method: payment.method,
          recordedAt: payment.recordedAt,
        },
        ...d.payments,
      ],
    }));
    toast({
      title: 'Pago guardado',
      description: `${whoFor(reservation)} · ${formatCop(payment.amountCop)}`,
      tone: 'success',
    });
  }

  function print(receipt) {
    setPrinting(receipt);
    // Let React paint the printable copy before opening the print dialog.
    setTimeout(() => window.print(), 50);
  }

  function receiptFor(r, p) {
    return {
      paymentId: p.id,
      name: whoFor(r),
      courtName: courtName(r),
      dateKey: date,
      time: timeRange(r),
      amountCop: p.amountCop,
      method: p.method,
      recordedAt: p.recordedAt,
    };
  }

  const list = tab === 'unpaid' ? unpaid : paid;

  return (
    <div>
      <PageHeader
        title="Cobros"
        description="Reservas confirmadas del día. Cobra cuando el jugador llegue."
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <StaffDateNav value={date} onChange={setDate} label="Día de las reservas" />
        <SegmentedControl
          label="Mostrar"
          hideLabel
          value={tab}
          onChange={setTab}
          options={[
            { value: 'unpaid', label: `Sin pagar (${unpaid.length})` },
            { value: 'paid', label: `Pagadas (${paid.length})` },
          ]}
        />
      </div>

      <SectionCard
        title={`${tab === 'unpaid' ? 'Sin pagar' : 'Pagadas'} · ${dayTitle(date)}`}
        async={day}
        isEmpty={() => list.length === 0}
        empty={
          tab === 'unpaid'
            ? {
                title: 'No hay nada por cobrar este día',
                description: 'Todas las reservas confirmadas ya están pagadas.',
              }
            : { title: 'Todavía no hay pagos este día' }
        }
        errorTitle="No pudimos cargar las reservas del día"
      >
        {() => (
          <AnimatedList
            aria-label={tab === 'unpaid' ? 'Reservas sin pagar' : 'Reservas pagadas'}
            items={list}
            getKey={(r) => r.id}
            renderItem={(r) => (
              <ReservationRow
                reservation={r}
                courtName={courtName(r)}
                payment={paymentsById.get(r.paymentId)}
                onCharge={(res) => setChargingId(res.id)}
                onReceipt={(res, p) => print(receiptFor(res, p))}
              />
            )}
          />
        )}
      </SectionCard>

      <ChargePanel
        key={chargingId ?? 'none'}
        reservation={charging}
        courtName={charging ? courtName(charging) : ''}
        dateKey={date}
        nextReservation={nextUnpaid}
        onPaid={handlePaid}
        onNext={() => setChargingId(nextUnpaid?.id ?? null)}
        onClose={() => setChargingId(null)}
        onPrint={print}
      />
      <PrintableReceipt receipt={printing} />
    </div>
  );
}
