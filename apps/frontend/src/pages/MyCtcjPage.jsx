import { useEffect, useState } from 'react';
import { ROLE_DEFINITIONS } from '@ctcj/shared';

import { bookingClient } from '../api/bookingClient.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

import { bogotaTodayKey } from './reservation/DatePicker.jsx';

// today + MAX_ADVANCE_DAYS (7 -- bookingPolicy.js): nothing can be booked
// further out, so this covers every reservation the user could possibly have.
const UPCOMING_DAYS = 8;

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Bogota',
});
const TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Bogota',
});

// Real features this platform doesn't have yet -- named specifically, not
// hidden and not claimed as one click away.
const UPCOMING_FEATURES = [
  'Historial de partidos y estadísticas',
  'Pagos y estado de cuenta',
  'Seguimiento de entrenamiento con tu equipo multidisciplinario',
  'Camino a tu Master en el ranking interno',
];

function addDaysToKey(baseKey, days) {
  const [year, month, day] = baseKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function MyCtcjPage() {
  useDocumentTitle('Mi CTCJ');
  const { user } = useAuth();
  const [reservations, setReservations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    const today = bogotaTodayKey();
    const dateKeys = Array.from({ length: UPCOMING_DAYS }, (_, i) => addDaysToKey(today, i));

    Promise.all(dateKeys.map((date) => bookingClient.getSchedule(date)))
      .then((schedules) => {
        if (cancelled) return;
        const mine = schedules
          .flatMap((schedule) => schedule.reservations)
          .filter((reservation) => reservation.holderUserId === user.id)
          .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));
        setReservations(mine);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const roleNames = (user?.roles ?? []).map(
    (code) => ROLE_DEFINITIONS.find((role) => role.code === code)?.name ?? code,
  );

  return (
    <Section
      heading={{
        eyebrow: 'Mi CTCJ',
        title: 'Bienvenido a tu panel',
        lede: roleNames.length > 0 ? `Cuenta con rol: ${roleNames.join(', ')}` : undefined,
      }}
    >
      <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h3 className="font-display text-lg font-semibold text-primary">Tus próximas reservas</h3>

          {error ? <p className="mt-4 text-error">No se pudieron cargar tus reservas.</p> : null}

          {!error && reservations === null ? (
            <p className="mt-4 text-secondary">Cargando tus reservas...</p>
          ) : null}

          {!error && reservations?.length === 0 ? (
            <p className="mt-4 text-secondary">
              No tienes reservas próximas.{' '}
              <Button to="/canchas" variant="ghost" className="px-2">
                Reserva una cancha
              </Button>
            </p>
          ) : null}

          {reservations && reservations.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {reservations.map((r) => (
                <li key={r.id} className="rounded-lg border border-neutral-200 p-4">
                  <p className="font-display font-semibold text-primary">
                    {DATE_FORMATTER.format(new Date(r.periodStart))}
                  </p>
                  <p className="text-sm text-secondary">
                    {TIME_FORMATTER.format(new Date(r.periodStart))} –{' '}
                    {TIME_FORMATTER.format(new Date(r.periodEnd))} ·{' '}
                    {r.status === 'HOLD' ? 'Retenida' : 'Confirmada'}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <h3 className="font-display text-lg font-semibold text-primary">Próximamente</h3>
          <ul className="mt-4 space-y-2">
            {UPCOMING_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-center justify-between gap-3 rounded-md bg-raised px-4 py-3"
              >
                <span className="text-sm text-secondary">{feature}</span>
                <Badge />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
