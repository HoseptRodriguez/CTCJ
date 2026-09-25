import { useRef } from 'react';

import { cn } from '../../components/ui/cn.js';
import { clubTodayKey, dateFromKey } from '../../lib/clubTime.js';
import { capitalize, CLUB_TIME_ZONE } from '../../lib/format.js';

const WEEKDAY = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: CLUB_TIME_ZONE });
const DAY = new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: CLUB_TIME_ZONE });
const MONTH = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: CLUB_TIME_ZONE });
const FULL = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: CLUB_TIME_ZONE,
});

function dayLabel(key, index) {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  return capitalize(WEEKDAY.format(dateFromKey(key)).replace('.', ''));
}

/**
 * Eight big day buttons (today + 7), a radio group: arrow keys move and
 * select. Each button's accessible name is the full date.
 * @param {{ days: string[], value: string, onChange: (key: string) => void }} props
 */
export function DayPicker({ days, value, onChange }) {
  const refs = useRef({});
  const today = clubTodayKey();

  function onKeyDown(event) {
    const i = days.indexOf(value);
    const next = {
      ArrowRight: i + 1,
      ArrowDown: i + 1,
      ArrowLeft: i - 1,
      ArrowUp: i - 1,
      Home: 0,
      End: days.length - 1,
    }[event.key];
    if (next === undefined || next < 0 || next >= days.length) return;
    event.preventDefault();
    onChange(days[next]);
    refs.current[days[next]]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Elige el día"
      onKeyDown={onKeyDown}
      className="grid grid-cols-4 gap-2 sm:grid-cols-8"
    >
      {days.map((key, i) => {
        const checked = key === value;
        const date = dateFromKey(key);
        return (
          <button
            key={key}
            ref={(el) => {
              refs.current[key] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${key === today ? 'Hoy, ' : ''}${FULL.format(date)}`}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(key)}
            className={cn(
              'focus-ring flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border-2 px-1 transition-colors duration-fast',
              checked
                ? 'border-navy-500 bg-lime text-navy-500'
                : 'border-line-strong bg-surface text-ink hover:border-navy-500',
            )}
          >
            <span className="text-body-sm font-semibold">{dayLabel(key, i)}</span>
            <span className="font-display text-h2 font-bold leading-none">{DAY.format(date)}</span>
            <span className="text-body-sm">{MONTH.format(date).replace('.', '')}</span>
          </button>
        );
      })}
    </div>
  );
}
