import { CheckIcon } from '../../components/icons/CheckIcon.jsx';
import { cn } from '../../components/ui/cn.js';
import { classifySlot, findReservation } from '../../lib/booking.js';
import { slotStartIso } from '../../lib/clubTime.js';
import { formatTime } from '../../lib/format.js';
import { useMediaQuery } from '../../lib/useMediaQuery.js';

/** Visible text + style of each cell state. Color is never the only cue. */
export const CELL_STATES = {
  free: {
    label: 'Libre',
    className: 'border-clay bg-clay-soft text-ink hover:bg-clay hover:text-white',
  },
  selected: { label: 'Tu elección', className: 'border-navy-500 bg-lime font-bold text-navy-500' },
  mine: { label: 'Tu reserva', className: 'border-status-ok-fg bg-status-ok-bg text-status-ok-fg' },
  occupied: { label: 'Ocupada', className: 'border-transparent bg-muted text-ink-soft' },
  class: { label: 'Clase', className: 'border-navy-500 bg-navy-500 text-white' },
  tournament: { label: 'Torneo', className: 'border-navy-500 bg-navy-500 text-white' },
  blocked: { label: 'Cerrada', className: 'border-transparent bg-muted text-ink-soft' },
  unavailable: {
    label: 'No disponible',
    className: 'border-dashed border-line-strong bg-surface text-ink-soft',
  },
};

export const LEGEND = ['free', 'selected', 'occupied', 'class', 'mine', 'unavailable'];

/** Legend of cell states, shown above the grid. */
export function GridLegend() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Qué significa cada color">
      {LEGEND.map((state) => (
        <li
          key={state}
          className={cn(
            'inline-flex min-h-btn items-center rounded-lg border-2 px-3 text-body-sm font-semibold',
            CELL_STATES[state].className,
          )}
        >
          {state === 'class' ? 'Clase o torneo' : CELL_STATES[state].label}
        </li>
      ))}
    </ul>
  );
}

function cellState(schedule, court, dateKey, hour, selected, now) {
  const start = slotStartIso(dateKey, hour);
  if (selected && selected.courtId === court.id && selected.start === start) return 'selected';
  return classifySlot(findReservation(schedule.reservations, court.id, start), start, now);
}

function Cell({ state, court, hour, dateKey, onSelect, compact }) {
  const { label, className } = CELL_STATES[state];
  const time = formatTime(slotStartIso(dateKey, hour));
  const base = cn(
    'flex min-h-btn-lg w-full items-center justify-center gap-2 rounded-lg border-2 px-2 text-body transition-colors duration-fast',
    className,
  );
  const content = (
    <>
      {state === 'selected' && <CheckIcon className="h-5 w-5 shrink-0" />}
      {compact ? (
        <span className="flex flex-col items-center leading-tight">
          <span className="font-bold">{time}</span>
          <span className="text-body-sm">{label}</span>
        </span>
      ) : (
        <span className={state === 'free' ? 'font-semibold' : undefined}>{label}</span>
      )}
    </>
  );

  if (state === 'free' || state === 'selected') {
    return (
      <button
        type="button"
        onClick={() => onSelect({ court, hour })}
        aria-pressed={state === 'selected'}
        aria-label={`${court.name}, ${time}: ${label}${state === 'free' ? '. Reservar' : ''}`}
        className={cn('focus-ring', base)}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={base}>
      <span className="sr-only">
        {court.name}, {time}:{' '}
      </span>
      {content}
    </div>
  );
}

/**
 * Hour × court grid for one day and one part of the day. Desktop: a real
 * table (hours down, courts across). Phones: one list per court.
 * Free cells are 64px buttons; everything else is plain text.
 */
export function CourtGrid({ schedule, dateKey, hours, selected, onSelect, now = new Date() }) {
  const wide = useMediaQuery('(min-width: 768px)');
  const nightNote = (court) =>
    !court.hasLighting && hours.some((h) => h >= 18) ? 'sin iluminación' : null;

  if (!wide) {
    return (
      <div className="space-y-8">
        {schedule.courts.map((court) => (
          <section key={court.id} aria-labelledby={`court-${court.id}`}>
            <h3 id={`court-${court.id}`} className="font-display text-h3 font-bold text-ink">
              {court.name}
              {nightNote(court) && (
                <span className="ml-2 text-body-sm font-normal text-ink-soft">
                  ({nightNote(court)})
                </span>
              )}
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
              {hours.map((hour) => (
                <li key={hour}>
                  <Cell
                    compact
                    state={cellState(schedule, court, dateKey, hour, selected, now)}
                    court={court}
                    hour={hour}
                    dateKey={dateKey}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <table className="w-full border-separate border-spacing-2">
      <caption className="sr-only">Horas y canchas del día elegido</caption>
      <thead>
        <tr>
          <th scope="col" className="w-28 text-left text-body font-semibold text-ink-soft">
            Hora
          </th>
          {schedule.courts.map((court) => (
            <th
              key={court.id}
              scope="col"
              className="text-left font-display text-h3 font-bold text-ink"
            >
              {court.name}
              {nightNote(court) && (
                <span className="block text-body-sm font-normal text-ink-soft">
                  {nightNote(court)}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hours.map((hour) => (
          <tr key={hour}>
            <th scope="row" className="whitespace-nowrap text-left text-body font-bold text-ink">
              {formatTime(slotStartIso(dateKey, hour))}
            </th>
            {schedule.courts.map((court) => (
              <td key={court.id}>
                <Cell
                  state={cellState(schedule, court, dateKey, hour, selected, now)}
                  court={court}
                  hour={hour}
                  dateKey={dateKey}
                  onSelect={onSelect}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
