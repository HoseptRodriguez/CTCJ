import { useEffect, useState } from 'react';

import { bookingClient } from '../../api/bookingClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { describeArea } from '../../lib/performanceRatingLabels.js';
import { bogotaTodayKey } from '../reservation/DatePicker.jsx';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Bogota',
});

const NOTE_TYPE_LABELS = {
  TRAINING: 'Entrenamiento',
  TECHNICAL: 'Técnica',
  TACTICAL: 'Táctica',
  RECOMMENDATION: 'Recomendación',
};

// today + MAX_ADVANCE_DAYS (7 -- bookingPolicy.js): nothing can be booked
// further out than this, matching MyCtcjPage.jsx's own UPCOMING_DAYS window.
const UPCOMING_DAYS = 8;

const SHORTCUTS = [
  { to: '/staff/notas', label: 'Notas y evaluaciones' },
  { to: '/staff/competicion', label: 'Competición' },
  { to: '/staff/torneos', label: 'Torneos' },
];

function addDaysToKey(baseKey, days) {
  const [year, month, day] = baseKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function ActivityFeedSection() {
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    let cancelled = false;
    coachingClient
      .getRecentActivity({ limit: 15 })
      .then((data) => {
        if (!cancelled) setActivity(data.activity);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Actividad reciente</h3>
      <p className="mt-1 text-sm text-secondary">
        Notas y evaluaciones registradas por todo el equipo de entrenadores.
      </p>

      {activity === null ? <p className="mt-3 text-sm text-secondary">Cargando...</p> : null}
      {activity?.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">Sin actividad reciente.</p>
      ) : null}

      {activity?.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {activity.map((item) => (
            <li key={item.id} className="rounded-md bg-raised px-4 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-primary">{item.playerName ?? 'Jugador'}</span>
                <span className="text-xs text-tertiary">
                  {DATE_TIME_FORMATTER.format(new Date(item.at))}
                </span>
              </div>
              <p className="mt-1 text-secondary">
                {item.type === 'NOTE' ? (
                  <>
                    {NOTE_TYPE_LABELS[item.noteType] ?? item.noteType}
                    {item.area ? ` · ${describeArea(item.area)}` : ''}
                  </>
                ) : (
                  <>
                    Evaluación · {describeArea(item.area)} · {item.rating}/10
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function UpcomingClassesSection() {
  const [classes, setClasses] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const today = bogotaTodayKey();
    const dateKeys = Array.from({ length: UPCOMING_DAYS }, (_, i) => addDaysToKey(today, i));

    Promise.all(dateKeys.map((date) => bookingClient.getSchedule(date)))
      .then((schedules) => {
        if (cancelled) return;
        const upcoming = schedules
          .flatMap((schedule) => schedule.reservations)
          // CLASS reservations always render with this label to any viewer
          // (institutional info, not personal data -- reservationPrivacy.js),
          // so this works without needing staff-level reservation visibility.
          .filter((r) => r.label === 'Clase' || r.reservationType === 'CLASS')
          .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));
        setClasses(upcoming);
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Próximas clases</h3>
      <p className="mt-1 text-sm text-secondary">Clases programadas en todas las canchas.</p>

      {classes === null ? <p className="mt-3 text-sm text-secondary">Cargando...</p> : null}
      {classes?.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">Sin clases programadas próximamente.</p>
      ) : null}

      {classes?.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {classes.map((c, i) => (
            <li
              key={`${c.courtId}-${c.periodStart}-${i}`}
              className="flex items-center justify-between rounded-md bg-raised px-4 py-2 text-sm"
            >
              <span className="text-secondary">
                {DATE_TIME_FORMATTER.format(new Date(c.periodStart))} –{' '}
                {TIME_FORMATTER.format(new Date(c.periodEnd))}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                Cancha {c.courtId?.slice(0, 8) ?? ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function QuickLookupSection() {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setFound(null);
    try {
      const user = await membershipClient.lookupUser(email.trim());
      setFound(user);
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Buscar jugador</h3>
      <p className="mt-1 text-sm text-secondary">
        Encuentra rápidamente a un jugador para ver o registrar notas y evaluaciones.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="coach-dashboard-lookup-email"
            className="block text-sm font-semibold text-primary"
          >
            Correo del jugador
          </label>
          <input
            id="coach-dashboard-lookup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jugador@correo.com"
            className="mt-1 w-64 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" variant="primary" disabled={searching || !email}>
          {searching ? 'Buscando...' : 'Buscar'}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}

      {found ? (
        <div className="mt-4 flex items-center justify-between rounded-md bg-raised px-4 py-3">
          <div>
            <p className="font-semibold text-primary">
              {found.firstName} {found.lastName}
            </p>
            <p className="text-sm text-secondary">{found.email}</p>
          </div>
          <Button to="/staff/notas" variant="outline">
            Ver notas y evaluaciones
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ShortcutsSection() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Accesos rápidos</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        {SHORTCUTS.map((shortcut) => (
          <Button key={shortcut.to} to={shortcut.to} variant="outline">
            {shortcut.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function CoachDashboard() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Panel de entrenador</h1>
      <p className="mt-1 text-secondary">
        Actividad del equipo, próximas clases y acceso rápido a jugadores.
      </p>

      <div className="mt-6">
        <QuickLookupSection />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ActivityFeedSection />
        <UpcomingClassesSection />
      </div>

      <div className="mt-6">
        <ShortcutsSection />
      </div>
    </div>
  );
}
