import { Link } from 'react-router-dom';

import { cn } from './cn.js';

const ACCENTS = {
  navy: 'border-t-navy-500',
  lime: 'border-t-lime',
  clay: 'border-t-clay',
  amber: 'border-t-amber',
};

/**
 * One number that matters, with a plain-language label ("Reservas de hoy").
 * With `to`, the whole card is a link to where that number can be acted on,
 * and `actionLabel` says where it goes ("Ver reservas").
 * With `emptyText`, the card says that instead of a bare "0" ("Aún no hay
 * reservas hoy") -- a zero with no context reads like an error.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  accent = 'navy',
  to,
  actionLabel,
  emptyText,
  className,
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-body font-semibold text-ink-soft">{label}</p>
        {icon && (
          <span className="h-7 w-7 shrink-0 text-navy-500 [&>svg]:h-full [&>svg]:w-full">
            {icon}
          </span>
        )}
      </div>
      {emptyText ? (
        <p className="mt-3 text-lead font-bold text-ink">{emptyText}</p>
      ) : (
        <p className="mt-2 font-display text-stat font-bold text-ink">
          {value}
          {unit && (
            <span className="ml-2 font-sans text-lead font-semibold text-ink-soft">{unit}</span>
          )}
        </p>
      )}
      {hint && <p className="mt-2 text-body-sm text-ink-soft">{hint}</p>}
      {to && actionLabel && (
        <p className="mt-4 text-body font-semibold text-navy-500 underline underline-offset-4">
          {actionLabel} →
        </p>
      )}
    </>
  );
  const classes = cn(
    'block rounded-xl border border-line border-t-4 bg-surface p-5 shadow-sm md:p-6',
    ACCENTS[accent],
    className,
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(classes, 'focus-ring transition-shadow duration-fast hover:shadow-md')}
      >
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
