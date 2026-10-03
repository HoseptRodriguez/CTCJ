import { useId } from 'react';

import { cn } from './cn.js';

/**
 * A big on/off switch (WAI-ARIA "switch"): a real button with
 * aria-checked, its visible label as accessible name, 48px tall touch
 * target, and the state also said in words ("Activado"/"Desactivado") so it
 * never depends on color alone.
 *
 * @param {{ label: string, checked: boolean, onChange: (next: boolean) => void,
 *   disabled?: boolean, description?: string, className?: string, groupLabelId?: string }} props
 *   `groupLabelId`: id of a heading that completes the name ("Resultados y notas, Correo").
 */
export function Switch({
  label,
  checked,
  onChange,
  disabled = false,
  description,
  className,
  groupLabelId,
}) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <span id={`${id}-label`} className="text-body font-semibold text-ink">
          {label}
        </span>
        {description && (
          <p id={descriptionId} className="text-body-sm text-ink-soft">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={groupLabelId ? `${groupLabelId} ${id}-label` : `${id}-label`}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'focus-ring group inline-flex min-h-btn shrink-0 items-center gap-3 rounded-full px-1 disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <span className="w-24 text-right text-body-sm font-semibold text-ink" aria-hidden="true">
          {checked ? 'Activado' : 'Desactivado'}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-flex h-8 w-14 items-center rounded-full border-2 transition-colors duration-fast motion-reduce:transition-none',
            checked ? 'border-navy-500 bg-navy-500' : 'border-line-strong bg-surface',
          )}
        >
          <span
            className={cn(
              'inline-block h-6 w-6 rounded-full shadow-sm transition-transform duration-fast motion-reduce:transition-none',
              checked ? 'translate-x-6 bg-lime' : 'translate-x-0.5 bg-line-strong',
            )}
          />
        </span>
      </button>
    </div>
  );
}
