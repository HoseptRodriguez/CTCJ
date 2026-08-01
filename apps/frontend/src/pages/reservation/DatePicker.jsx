import { cn } from '../../components/ui/cn.js';

// Mirrors the backend's MAX_ADVANCE_DAYS policy (bookingPolicy.js) -- today
// plus 7 more days, 8 choices total. The server is still the source of truth
// for what's actually valid; this just keeps the picker from offering dates
// that would fail.
const DAYS_AHEAD = 7;
const CLUB_TIME_ZONE = 'America/Bogota';

// All formatting/arithmetic here is pinned to the club's timezone, not the
// viewer's device timezone -- otherwise a visitor browsing from outside
// Bogotá could see "today" shifted by a day, or day labels off by one.
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' });
const DAY_FORMATTER = new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: 'UTC' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' });
const BOGOTA_TODAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLUB_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** date is a UTC-midnight-anchored Date used purely to carry a calendar day -- read its UTC fields, never local ones. */
function toDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's date, as a YYYY-MM-DD key, in the club's own timezone -- not the viewer's. */
function bogotaTodayKey() {
  return BOGOTA_TODAY_FORMATTER.format(new Date());
}

function buildDateOptions() {
  const [year, month, day] = bogotaTodayKey().split('-').map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day));
  return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() + i);
    return { key: toDateKey(date), date };
  });
}

export function DatePicker({ value, onChange }) {
  const options = buildDateOptions();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="Elige el día">
      {options.map(({ key, date }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={cn(
            'flex min-w-[64px] flex-col items-center rounded-md border px-3 py-2 transition-colors duration-fast',
            value === key
              ? 'border-navy-500 bg-navy-500 text-on-inverse'
              : 'border-neutral-200 bg-canvas text-secondary hover:border-navy-300',
          )}
        >
          <span className="text-xs uppercase tracking-wide">{WEEKDAY_FORMATTER.format(date)}</span>
          <span className="font-display text-lg font-semibold">{DAY_FORMATTER.format(date)}</span>
          <span className="text-xs uppercase tracking-wide">{MONTH_FORMATTER.format(date)}</span>
        </button>
      ))}
    </div>
  );
}

export { bogotaTodayKey };
