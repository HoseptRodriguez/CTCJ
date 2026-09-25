import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { bookingClient } from '../../api/bookingClient.js';
import { ClockIcon } from '../../components/icons/ClockIcon.jsx';
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton.jsx';
import { freeHoursByCourt } from '../../lib/booking.js';
import {
  CLOSE_HOUR,
  addDaysToKey,
  clubCurrentHour,
  clubTodayKey,
  slotStartIso,
} from '../../lib/clubTime.js';
import { formatTime } from '../../lib/format.js';

/** "Libre hoy": the next free hours per court, each a shortcut into the booking grid. */
export function FreeTodayCard() {
  // After the last slot has started, today has nothing left: show tomorrow.
  const [dateKey] = useState(() => {
    const today = clubTodayKey();
    return clubCurrentHour() >= CLOSE_HOUR - 1 ? addDaysToKey(today, 1) : today;
  });
  const isToday = dateKey === clubTodayKey();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    bookingClient
      .getSchedule(dateKey)
      .then(
        (schedule) =>
          !cancelled && setState({ status: 'ready', rows: freeHoursByCourt(schedule, dateKey) }),
      )
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  return (
    <aside
      aria-labelledby="libre-hoy-title"
      className="w-full rounded-xl bg-surface p-5 text-ink shadow-lg md:p-6"
    >
      <div className="flex items-center gap-2">
        <ClockIcon className="h-6 w-6 text-clay-dark" />
        <h2 id="libre-hoy-title" className="font-display text-h3 font-bold">
          {isToday ? 'Libre hoy' : 'Libre mañana'}
        </h2>
      </div>
      <p className="mt-1 text-body-sm text-ink-soft">Toca una hora para reservarla.</p>

      {state.status === 'loading' && (
        <SkeletonGroup label="Buscando horas libres…" className="mt-4 space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </SkeletonGroup>
      )}

      {state.status === 'error' && (
        <p className="mt-4 text-body">
          No pudimos ver las horas libres.{' '}
          <Link to="/canchas" className="font-semibold text-navy-500 underline underline-offset-4">
            Ver todas las canchas
          </Link>
        </p>
      )}

      {state.status === 'ready' && (
        <ul className="mt-4 space-y-4">
          {state.rows.map(({ court, hours }) => (
            <li key={court.id}>
              <p className="text-body font-semibold">{court.name}</p>
              {hours.length === 0 ? (
                <p className="text-body-sm text-ink-soft">
                  Sin horas libres {isToday ? 'hoy' : 'mañana'}.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {hours.map((hour) => (
                    <Link
                      key={hour}
                      to={`/canchas?fecha=${dateKey}&cancha=${court.id}&hora=${hour}`}
                      className="focus-ring inline-flex min-h-btn items-center rounded-lg border-2 border-clay bg-clay-soft px-3 text-body font-semibold text-ink hover:bg-clay hover:text-white"
                    >
                      {formatTime(slotStartIso(dateKey, hour))}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/canchas"
        className="focus-ring mt-5 inline-flex min-h-btn items-center rounded-lg text-body font-semibold text-navy-500 underline underline-offset-4"
      >
        Ver todos los horarios →
      </Link>
    </aside>
  );
}
