import { Button } from '../../components/ui/Button.jsx';
import { cn } from '../../components/ui/cn.js';

import { PlayerPicker } from './PlayerPicker.jsx';

/** Big numbered buttons (a radio group) instead of a number field. */
export function NumberChoice({ label, value, onChange, max }) {
  return (
    <fieldset>
      <legend className="mb-2 text-body font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max + 1 }, (_, n) => (
          <label
            key={n}
            className={cn(
              'flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-2 text-lead font-bold has-[:focus-visible]:shadow-focus',
              value === n
                ? 'border-navy-500 bg-lime text-navy-500'
                : 'border-line-strong bg-surface text-ink hover:bg-page',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={label}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            {n}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ParticipantSlot({ label, value, onChange, allowEmail }) {
  if (value) {
    return (
      <div>
        <p className="mb-2 text-body font-semibold text-ink">{label}</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-navy-500 bg-navy-50 p-3">
          <span className="text-body font-bold text-navy-500">
            {value.firstName} {value.lastName}
          </span>
          <Button variant="ghost" onClick={() => onChange(null)}>
            Cambiar
          </Button>
        </div>
      </div>
    );
  }
  return <PlayerPicker label={label} allowEmail={allowEmail} onSelect={onChange} />;
}
