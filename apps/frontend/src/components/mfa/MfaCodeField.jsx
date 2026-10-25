import { forwardRef, useId } from 'react';

import { AlertTriangleIcon } from '../icons/AlertTriangleIcon.jsx';
import { cn } from '../ui/cn.js';

/**
 * The 6-digit code of the authenticator app: one big field (easy to read
 * and to type on a phone, and the phone can fill it from the app with
 * autocomplete="one-time-code"). The error is tied with aria-describedby.
 */
export const MfaCodeField = forwardRef(function MfaCodeField(
  { value, onChange, error, label = 'Código de 6 números', hint, id: idProp, autoFocus },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-body font-semibold text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        // Only on a step whose single task is this field.
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        className={cn(
          'focus-ring block min-h-btn-lg w-full max-w-xs rounded-lg border-2 bg-surface px-4 text-center font-display text-[2.25rem] font-bold tracking-[0.4em] text-ink',
          error ? 'border-danger' : 'border-line-strong',
        )}
      />
      {hint && (
        <p id={hintId} className="mt-2 text-body-sm text-ink-soft">
          {hint}
        </p>
      )}
      <div aria-live="polite">
        {error && (
          <p
            id={errorId}
            className="mt-2 flex items-start gap-2 text-body-sm font-semibold text-danger"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
});
