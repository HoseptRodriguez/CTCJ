import { useId, useRef } from 'react';

import { CheckIcon } from '../icons/CheckIcon.jsx';

import { cn } from './cn.js';

/**
 * Pick one of a few options that filter or change a view ("Hoy" / "Mañana" /
 * "Esta semana"). A radio group: it has a visible label, arrow keys move and
 * select, and the chosen option is lime + bold + a check mark.
 *
 * @param {{ label: string, options: {value: string, label: string}[], value: string,
 *   onChange: (value: string) => void, hideLabel?: boolean, fullWidth?: boolean, className?: string }} props
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
  fullWidth = false,
  className,
}) {
  const labelId = useId();
  const refs = useRef({});

  function onKeyDown(event) {
    const index = options.findIndex((o) => o.value === value);
    const last = options.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowDown: index === last ? 0 : index + 1,
      ArrowLeft: index <= 0 ? last : index - 1,
      ArrowUp: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const nextValue = options[next].value;
    onChange(nextValue);
    refs.current[nextValue]?.focus();
  }

  return (
    <div className={className}>
      <p
        id={labelId}
        className={cn('mb-2 text-body font-semibold text-ink', hideLabel && 'sr-only')}
      >
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className={cn(
          'inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1',
          fullWidth && 'flex w-full flex-nowrap',
        )}
      >
        {options.map((option, i) => {
          const checked = option.value === value;
          // Roving tabindex: the checked option, or the first if none is.
          const focusable = checked || (!options.some((o) => o.value === value) && i === 0);
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[option.value] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={focusable ? 0 : -1}
              onClick={() => onChange(option.value)}
              className={cn(
                'focus-ring inline-flex min-h-btn items-center justify-center gap-2 rounded-lg px-5 text-body transition-colors duration-fast',
                fullWidth && 'flex-1 px-2',
                checked
                  ? 'bg-lime font-bold text-navy-500 shadow-sm'
                  : 'font-semibold text-ink-soft hover:bg-surface hover:text-ink',
              )}
            >
              {checked && <CheckIcon className="h-5 w-5" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
