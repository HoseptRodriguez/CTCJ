import { PAYMENT_METHOD, RESERVATION_TYPE } from '@ctcj/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ChevronLeftIcon } from '../../components/icons/ChevronLeftIcon.jsx';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon.jsx';
import { cn } from '../../components/ui/cn.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { TextAreaField } from '../../components/ui/Field.jsx';
import { addDaysToKey, clubTodayKey, dateFromKey } from '../../lib/clubTime.js';
import { capitalize, formatDayLong, formatTime } from '../../lib/format.js';

export const METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Efectivo',
  [PAYMENT_METHOD.TRANSFER]: 'Transferencia',
  [PAYMENT_METHOD.CARD_IN_PERSON]: 'Tarjeta en el club',
};

export const RESERVATION_TYPE_LABELS = {
  [RESERVATION_TYPE.PRIVATE]: 'Reserva',
  [RESERVATION_TYPE.CLASS]: 'Clase',
  [RESERVATION_TYPE.TOURNAMENT]: 'Torneo',
  [RESERVATION_TYPE.MAINTENANCE]: 'Mantenimiento',
  [RESERVATION_TYPE.BLOCKED]: 'Bloqueada',
};

/** Reservation types that are a person's booking (charged at the desk). */
export const isCourtBooking = (r) =>
  (r.reservationType ?? RESERVATION_TYPE.PRIVATE) === RESERVATION_TYPE.PRIVATE;

export { isChargeable, isUnpaid } from '../../lib/booking.js';

/** "7:00 a. m. – 8:00 a. m." */
export function timeRange(r) {
  return `${formatTime(r.periodStart)} – ${formatTime(r.periodEnd)}`;
}

/** "Buenos días" / "Buenas tardes" / "Buenas noches" by the club's hour. */
export function greetingForHour(hour) {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "Sábado, 27 de septiembre" for a YYYY-MM-DD club day. */
export function dayTitle(dateKey) {
  return capitalize(formatDayLong(dateFromKey(dateKey)));
}

/**
 * Pick a day: big "Día anterior" / "Día siguiente" buttons, a native date
 * field (keyboard- and screen-reader-friendly) and a "Hoy" shortcut.
 * @param {{ value: string, onChange: (key: string) => void, label?: string, className?: string }} props
 */
export function StaffDateNav({ value, onChange, label = 'Día', className }) {
  const today = clubTodayKey();
  const btn =
    'focus-ring inline-flex min-h-btn items-center justify-center gap-1 rounded-lg border-2 border-navy-500 bg-surface px-3 text-body font-semibold text-navy-500 hover:bg-navy-50';
  return (
    <div className={cn('flex flex-wrap items-end gap-2', className)}>
      <button type="button" className={btn} onClick={() => onChange(addDaysToKey(value, -1))}>
        <ChevronLeftIcon className="h-5 w-5" />
        Día anterior
      </button>
      <label className="flex flex-col">
        <span className="text-body-sm font-semibold text-ink-soft">{label}</span>
        <input
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="focus-ring min-h-btn rounded-lg border-2 border-line-strong bg-surface px-3 text-body text-ink"
        />
      </label>
      <button type="button" className={btn} onClick={() => onChange(addDaysToKey(value, 1))}>
        Día siguiente
        <ChevronRightIcon className="h-5 w-5" />
      </button>
      {value !== today && (
        <button
          type="button"
          className={cn(btn, 'border-transparent underline underline-offset-4')}
          onClick={() => onChange(today)}
        >
          Volver a hoy
        </button>
      )}
    </div>
  );
}

/** The selected player lives in the URL (?jugador=&nombre=), so it can be linked to. */
export function useSelectedPlayer() {
  const [params, setParams] = useSearchParams();
  const id = params.get('jugador');
  const player = id ? { id, name: params.get('nombre') ?? 'Jugador' } : null;
  function select(p) {
    setParams(p ? { jugador: p.id, nombre: `${p.firstName} ${p.lastName}`.trim() } : {});
  }
  return [player, select];
}

/**
 * One big list row for the staff "list + side panel" pages (spec K):
 * what it is, a line of detail, an optional state badge, and the actions.
 */
export function StaffRow({ title, subtitle, meta, badge, actions, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center md:p-5',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lead font-bold text-ink">{title}</p>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-body text-ink">{subtitle}</p>}
        {meta && <p className="mt-1 text-body-sm text-ink-soft">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

/** Inline form error, announced when it appears. */
export function FormAlert({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-status-overdue-bg p-3 text-body font-semibold text-status-overdue-fg"
    >
      {children}
    </p>
  );
}

/** Irreversible step that needs a written reason ("Interrumpir plan"). */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  describeError = () => 'No pudimos guardar el cambio. Intenta de nuevo.',
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!reason.trim()) return setError('Escribe el motivo.');
    setSaving(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={title}
      confirmLabel={confirmLabel}
      loading={saving}
      onConfirm={confirm}
      onCancel={() => {
        setReason('');
        setError(null);
        onCancel();
      }}
      description={
        <div className="space-y-4">
          <p>{description}</p>
          <TextAreaField
            label="Motivo"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            error={error}
          />
        </div>
      }
    />
  );
}
