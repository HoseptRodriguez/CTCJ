import { forwardRef, useId, useState } from 'react';

import { AlertTriangleIcon } from '../icons/AlertTriangleIcon.jsx';

import { cn } from './cn.js';

const CONTROL =
  'focus-ring block w-full rounded-lg border-2 bg-surface px-4 text-body text-ink ' +
  'placeholder:text-ink-soft/70 disabled:cursor-not-allowed disabled:bg-muted';

/**
 * Label ABOVE the control (never a placeholder-only label), optional hint
 * below it, and an error that says what to fix, tied to the control with
 * aria-describedby so screen readers read it too.
 */
function FieldShell({ id, label, hint, error, required, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-body font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-body-sm font-normal text-ink-soft">(obligatorio)</span>
        )}
      </label>
      {children({ describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined })}
      {hint && (
        <p id={hintId} className="mt-2 text-body-sm text-ink-soft">
          {hint}
        </p>
      )}
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
  );
}

/** Text input, 64px tall. */
export const TextField = forwardRef(function TextField(
  { label, hint, error, required, className, id: idProp, ...props },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ describedBy }) => (
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL,
            'min-h-btn-lg',
            error ? 'border-danger' : 'border-line-strong',
            className,
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
});

/** Password input with a visible "Mostrar"/"Ocultar" button. */
export const PasswordField = forwardRef(function PasswordField(
  { label = 'Contraseña', hint, error, required, className, id: idProp, ...props },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ describedBy }) => (
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              CONTROL,
              'min-h-btn-lg pr-28',
              error ? 'border-danger' : 'border-line-strong',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-controls={id}
            className="focus-ring absolute inset-y-2 right-2 min-w-btn rounded-md px-4 text-body-sm font-semibold text-navy-500 hover:bg-navy-50"
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      )}
    </FieldShell>
  );
});

/** Multi-line text, generous height. */
export const TextAreaField = forwardRef(function TextAreaField(
  { label, hint, error, required, className, id: idProp, rows = 5, ...props },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ describedBy }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL,
            'py-3 leading-relaxed',
            error ? 'border-danger' : 'border-line-strong',
            className,
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
});

/** Native select, 64px tall. `options`: [{ value, label }]. */
export const SelectField = forwardRef(function SelectField(
  { label, hint, error, required, options, className, id: idProp, ...props },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {({ describedBy }) => (
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL,
            'min-h-btn-lg',
            error ? 'border-danger' : 'border-line-strong',
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
});

/**
 * Large radio choice (whole card is the target, >= 64px). `options`:
 * [{ value, label, description? }]. A real radio group underneath.
 */
export function RadioCards({ legend, name, options, value, onChange, className }) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-body font-semibold text-ink">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                'flex min-h-btn-lg cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors duration-fast',
                'has-[:focus-visible]:shadow-focus',
                checked
                  ? 'border-navy-500 bg-lime/40'
                  : 'border-line-strong bg-surface hover:bg-page',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="mt-1 h-6 w-6 shrink-0 accent-navy-500"
              />
              <span>
                <span className="block text-body font-semibold text-ink">{o.label}</span>
                {o.description && (
                  <span className="block text-body-sm text-ink-soft">{o.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
