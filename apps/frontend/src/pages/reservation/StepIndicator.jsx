import { CheckIcon } from '../../components/icons/CheckIcon.jsx';
import { cn } from '../../components/ui/cn.js';

/**
 * "1 Elige el día → 2 Toca una hora libre → 3 Confirma". The current step
 * is marked with aria-current and lime; finished steps get a check.
 * @param {{ steps: string[], current: number }} props -- current is 0-based.
 */
export function StepIndicator({ steps, current }) {
  return (
    <ol aria-label="Pasos para reservar" className="grid gap-3 sm:grid-cols-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex min-h-btn-lg items-center gap-3 rounded-xl border-2 px-4 py-2',
              active && 'border-navy-500 bg-lime',
              done && 'border-status-ok-fg bg-status-ok-bg',
              !active && !done && 'border-line bg-surface',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lead font-bold',
                active
                  ? 'bg-navy-500 text-white'
                  : done
                    ? 'bg-status-ok-fg text-white'
                    : 'bg-muted text-ink',
              )}
            >
              {done ? <CheckIcon className="h-5 w-5" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-body',
                active ? 'font-bold text-navy-500' : 'font-semibold text-ink',
              )}
            >
              {label}
              {done && <span className="sr-only"> (listo)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
