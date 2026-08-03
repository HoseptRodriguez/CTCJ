import { useEffect, useState } from 'react';
import { ROLE_CODES, ROLE_DEFINITIONS } from '@ctcj/shared';

import { affiliationClient } from '../api/affiliationClient.js';
import { bookingClient } from '../api/bookingClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';
import {
  MEMBERSHIP_STATUS_DISPLAY,
  describeMembershipStatus,
} from '../lib/membershipStatusLabels.js';

import { bogotaTodayKey } from './reservation/DatePicker.jsx';

const REQUEST_STATUS_LABELS = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

function AffiliationSection() {
  const [requests, setRequests] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function refetch() {
    return affiliationClient
      .getMyRequests()
      .then((data) => setRequests(data.requests))
      .catch(() => setRequests([]));
  }

  useEffect(() => {
    refetch();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await affiliationClient.submitRequest({ notes: notes.trim() || undefined });
      setNotes('');
      await refetch();
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (requests === null) {
    return null;
  }

  const latest = requests[0];
  const canRequest = !latest || latest.status === 'REJECTED';

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Afiliación a la academia</h3>
      <p className="mt-1 text-sm text-secondary">
        Solicita convertirte en Jugador para acceder a los servicios de la academia.
      </p>

      {latest ? (
        <p className="mt-3 text-sm text-secondary">
          Estado de tu última solicitud:{' '}
          <strong>{REQUEST_STATUS_LABELS[latest.status] ?? latest.status}</strong>
        </p>
      ) : null}

      {canRequest ? (
        <form onSubmit={handleSubmit} className="mt-4">
          <label className="block text-sm font-semibold text-primary" htmlFor="affiliation-notes">
            Cuéntanos por qué quieres unirte (opcional)
          </label>
          <textarea
            id="affiliation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
          <Button type="submit" variant="primary" className="mt-3" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Solicitar afiliación'}
          </Button>
          {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}

function GuardianshipSection() {
  const [guardianships, setGuardianships] = useState(null);
  const [minorEmail, setMinorEmail] = useState('');
  const [canBook, setCanBook] = useState(true);
  const [canPay, setCanPay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function refetch() {
    return guardianshipClient
      .listMine()
      .then((data) => setGuardianships(data.guardianships))
      .catch(() => setGuardianships([]));
  }

  useEffect(() => {
    refetch();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await guardianshipClient.requestGuardianship({
        minorEmail: minorEmail.trim(),
        canPay,
        canBook,
      });
      setMinorEmail('');
      await refetch();
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (guardianships === null) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Cuentas vinculadas</h3>
      <p className="mt-1 text-sm text-secondary">
        Vincúlate como tutor de un menor para reservar canchas en su nombre. La vinculación requiere
        aprobación de administración.
      </p>

      {guardianships.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {guardianships.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-md bg-raised px-4 py-2 text-sm"
            >
              <span className="text-secondary">{g.minorEmail}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                {REQUEST_STATUS_LABELS[g.status] ?? g.status}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="minor-email">
            Correo del menor
          </label>
          <input
            id="minor-email"
            type="email"
            required
            value={minorEmail}
            onChange={(e) => setMinorEmail(e.target.value)}
            placeholder="menor@correo.com"
            className="mt-1 w-64 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input type="checkbox" checked={canBook} onChange={(e) => setCanBook(e.target.checked)} />
          Reservar canchas
        </label>
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input type="checkbox" checked={canPay} onChange={(e) => setCanPay(e.target.checked)} />
          Pagar
        </label>
        <Button type="submit" variant="primary" disabled={submitting || !minorEmail}>
          {submitting ? 'Enviando...' : 'Solicitar vinculación'}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </div>
  );
}

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
  const [membershipStatus, setMembershipStatus] = useState(undefined);

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

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    membershipClient
      .getMyStatus()
      .then((data) => {
        if (!cancelled) setMembershipStatus(data.status);
      })
      .catch(() => {
        // Own-status display is a courtesy, not load-bearing -- fail silent
        // rather than blocking the rest of the panel on it.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const roleNames = (user?.roles ?? []).map(
    (code) => ROLE_DEFINITIONS.find((role) => role.code === code)?.name ?? code,
  );
  const isJugador = (user?.roles ?? []).includes(ROLE_CODES.JUGADOR);
  const membershipDisplay = MEMBERSHIP_STATUS_DISPLAY[membershipStatus];

  return (
    <Section
      heading={{
        eyebrow: 'Mi CTCJ',
        title: 'Bienvenido a tu panel',
        lede: roleNames.length > 0 ? `Cuenta con rol: ${roleNames.join(', ')}` : undefined,
      }}
    >
      {isJugador && membershipStatus !== undefined ? (
        <p className="mt-4 text-sm text-secondary">
          Estado de membresía:{' '}
          <span
            className={`ml-1 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              membershipDisplay
                ? membershipDisplay.className
                : 'border-neutral-200 bg-neutral-100 text-secondary'
            }`}
          >
            {describeMembershipStatus(membershipStatus)}
          </span>
        </p>
      ) : null}

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

      {!isJugador ? <AffiliationSection /> : null}
      <GuardianshipSection />
    </Section>
  );
}
