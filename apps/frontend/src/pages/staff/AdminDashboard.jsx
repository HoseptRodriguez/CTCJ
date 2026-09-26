import { RESERVATION_TYPE, ROLE_CODES } from '@ctcj/shared';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { affiliationClient } from '../../api/affiliationClient.js';
import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { communityAdminClient } from '../../api/communityAdminClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { CalendarIcon } from '../../components/icons/CalendarIcon.jsx';
import { CheckCircleIcon } from '../../components/icons/CheckCircleIcon.jsx';
import { ClipboardIcon } from '../../components/icons/ClipboardIcon.jsx';
import { ShieldIcon } from '../../components/icons/ShieldIcon.jsx';
import { TrendingUpIcon } from '../../components/icons/TrendingUpIcon.jsx';
import { UsersIcon } from '../../components/icons/UsersIcon.jsx';
import { WalletIcon } from '../../components/icons/WalletIcon.jsx';
import { cn } from '../../components/ui/cn.js';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  addDaysToKey,
  CLOSE_HOUR,
  CLUB_UTC_OFFSET_HOURS,
  clubCurrentHour,
  clubTodayKey,
  HOURS,
  OPEN_HOUR,
} from '../../lib/clubTime.js';
import { formatCop, formatDayShort, formatTime } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { useMediaQuery } from '../../lib/useMediaQuery.js';
import { SectionCard } from '../mictcj/shared.jsx';

import { dayTitle, greetingForHour, isUnpaid, RESERVATION_TYPE_LABELS } from './staffShared.jsx';

const HOURS_PER_DAY = CLOSE_HOUR - OPEN_HOUR;

/** Club-local fractional hour of an ISO instant (Bogotá has no DST). */
function clubHourOf(iso) {
  const d = new Date(iso);
  return ((d.getUTCHours() + 24 - CLUB_UTC_OFFSET_HOURS) % 24) + d.getUTCMinutes() / 60;
}

// Timeline block colors: a person's booking is clay, a class is blue; the
// type is ALSO written on every block, never color alone.
const BLOCK_STYLES = {
  [RESERVATION_TYPE.PRIVATE]: 'bg-clay text-white',
  [RESERVATION_TYPE.CLASS]: 'bg-navy-400 text-white',
  [RESERVATION_TYPE.TOURNAMENT]: 'bg-navy-500 text-white',
};
const OTHER_BLOCK = 'bg-muted text-ink border border-line-strong';

/** 7 -> "7", 7.5 -> "7:30" (the axis above already says a. m. / p. m.). */
function shortHour(h) {
  const whole = Math.floor(h);
  const minutes = Math.round((h - whole) * 60);
  const hour = ((whole + 11) % 12) + 1;
  return minutes ? `${hour}:${String(minutes).padStart(2, '0')}` : String(hour);
}

function blockLabel(r) {
  const type = r.reservationType ?? RESERVATION_TYPE.PRIVATE;
  if (type === RESERVATION_TYPE.PRIVATE) return r.holderName ?? 'Reserva';
  return RESERVATION_TYPE_LABELS[type] ?? 'Ocupada';
}

// ---------------------------------------------------------------------------

function ActionCard({ count, title, doneText, to, action, icon: Icon, loading }) {
  const pending = count > 0;
  return (
    <li
      className={cn(
        'flex flex-col rounded-xl border-2 bg-surface p-5 shadow-sm md:p-6',
        pending ? 'border-amber' : 'border-line',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            pending ? 'bg-amber text-navy-500' : 'bg-status-ok-bg text-status-ok-fg',
          )}
        >
          {pending ? <Icon className="h-6 w-6" /> : <CheckCircleIcon className="h-6 w-6" />}
        </span>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-40" />
          ) : count == null ? (
            <p className="text-lead font-semibold text-ink">No pudimos contar</p>
          ) : pending ? (
            <p className="text-lead font-bold text-ink">
              <span className="font-display text-stat">{count}</span> {title(count)}
            </p>
          ) : (
            <p className="text-lead font-semibold text-ink">{doneText}</p>
          )}
        </div>
      </div>
      <Link
        to={to}
        className={cn(
          'focus-ring mt-5 inline-flex min-h-btn items-center justify-center rounded-lg px-5 text-body font-bold',
          pending
            ? 'bg-lime text-navy-500 hover:brightness-95'
            : 'border-2 border-navy-500 text-navy-500 hover:bg-navy-50',
        )}
      >
        {action}
      </Link>
    </li>
  );
}

function TodoSection({ unpaidCount, scheduleLoading, isAdmin }) {
  const requests = useAsync(
    () =>
      Promise.all([affiliationClient.listRequests(), guardianshipClient.listGuardianships()]).then(
        ([a, g]) => a.requests.length + g.guardianships.length,
      ),
    [],
    { enabled: isAdmin },
  );
  const reports = useAsync(
    () => communityAdminClient.listReports().then((d) => d.reports.length),
    [],
  );

  return (
    <section aria-labelledby="para-hacer" className="mb-10">
      <h2 id="para-hacer" className="mb-4 font-display text-h2 font-bold text-ink">
        Para hacer hoy
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={WalletIcon}
          loading={scheduleLoading}
          count={unpaidCount}
          title={(n) => (n === 1 ? 'reserva sin pagar' : 'reservas sin pagar')}
          doneText="Todas las reservas de hoy están pagadas"
          to="/staff/pagos"
          action="Cobrar"
        />
        {isAdmin && (
          <ActionCard
            icon={ClipboardIcon}
            loading={requests.status === 'loading'}
            count={requests.status === 'ready' ? requests.data : null}
            title={(n) => (n === 1 ? 'solicitud por revisar' : 'solicitudes por revisar')}
            doneText="No hay solicitudes pendientes"
            to="/staff/solicitudes"
            action="Revisar"
          />
        )}
        <ActionCard
          icon={ShieldIcon}
          loading={reports.status === 'loading'}
          count={reports.status === 'ready' ? reports.data : null}
          title={(n) => (n === 1 ? 'publicación reportada' : 'publicaciones reportadas')}
          doneText="No hay reportes en la comunidad"
          to="/staff/comunidad"
          action="Moderar"
        />
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

function StatsSection({ schedule }) {
  const revenue = useAsync(
    () =>
      Promise.all([
        bookingClient.getMonthlyRevenue({ months: 1 }),
        billingClient.getMonthlyRevenue({ months: 1 }),
      ]).then(
        ([court, membership]) =>
          (court.months.at(-1)?.totalCop ?? 0) + (membership.months.at(-1)?.totalCop ?? 0),
      ),
    [],
  );
  const players = useAsync(() => membershipClient.getPlayerCounts(), []);

  const s = schedule.data;
  const bookings = s
    ? s.reservations.filter(
        (r) =>
          r.reservationType !== RESERVATION_TYPE.MAINTENANCE &&
          r.reservationType !== RESERVATION_TYPE.BLOCKED,
      )
    : [];
  const occupiedHours = bookings.reduce(
    (sum, r) => sum + (new Date(r.periodEnd) - new Date(r.periodStart)) / 3_600_000,
    0,
  );
  const capacity = (s?.courts.length ?? 0) * HOURS_PER_DAY;
  const occupancy = capacity > 0 ? Math.round((occupiedHours / capacity) * 100) : 0;
  const toCharge = s
    ? s.reservations.filter(isUnpaid).reduce((sum, r) => sum + (r.priceCop ?? 0), 0)
    : 0;

  const value = (async, render) =>
    async.status === 'ready' ? render(async.data) : async.status === 'error' ? '—' : '…';
  // A real zero gets a sentence instead of a bare "0" (only once loaded).
  const whenZero = (async, isZero, text) =>
    async.status === 'ready' && isZero(async.data) ? text : undefined;
  const p = players.data;
  const totalPlayers = p?.total ?? 0;

  return (
    <section
      aria-label="Cifras del club"
      className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Reservas hoy"
        icon={<CalendarIcon />}
        value={value(schedule, () => bookings.length)}
        emptyText={whenZero(schedule, () => bookings.length === 0, 'Aún no hay reservas hoy')}
        hint={
          schedule.status === 'ready' && bookings.length > 0
            ? `${occupancy} % de ocupación`
            : undefined
        }
        accent="clay"
      />
      <StatCard
        label="Por cobrar hoy"
        icon={<WalletIcon />}
        value={value(schedule, () => formatCop(toCharge))}
        emptyText={whenZero(schedule, () => toCharge === 0, 'Nada por cobrar hoy')}
        to="/staff/pagos"
        actionLabel="Ir a cobros"
        accent="amber"
      />
      <StatCard
        label="Ingresos del mes"
        icon={<TrendingUpIcon />}
        value={value(revenue, formatCop)}
        emptyText={whenZero(revenue, (total) => total === 0, 'Aún no hay ingresos este mes')}
        hint="Canchas y membresías"
        accent="lime"
      />
      {/* All JUGADOR accounts, split by membership state -- "al día" (ACTIVE)
          and "vencido" (OVERDUE) are separate states, so neither number
          contradicts the other. */}
      <StatCard
        label="Jugadores"
        icon={<UsersIcon />}
        value={value(players, () => totalPlayers)}
        emptyText={whenZero(players, () => totalPlayers === 0, 'Aún no hay jugadores registrados')}
        hint={
          players.status === 'ready' && totalPlayers > 0
            ? [
                `${p.ACTIVE ?? 0} al día`,
                `${p.OVERDUE ?? 0} con pago vencido`,
                p.NONE ? `${p.NONE} sin membresía` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        to="/staff/membresias"
        actionLabel="Ver membresías"
      />
    </section>
  );
}

// ---------------------------------------------------------------------------

function CourtTimeline({ schedule, isToday }) {
  const nowHour = isToday ? clubCurrentHour() + new Date().getMinutes() / 60 : null;
  const pct = (h) => `${((h - OPEN_HOUR) / HOURS_PER_DAY) * 100}%`;
  const showNow = nowHour != null && nowHour >= OPEN_HOUR && nowHour < CLOSE_HOUR;

  return (
    <div>
      <div className="grid grid-cols-[9rem_1fr] gap-x-3" aria-hidden="true">
        <span />
        <div className="relative h-8">
          {HOURS.filter((h) => h % 2 === 1).map((h) => (
            <span
              key={h}
              className="absolute -translate-x-1/2 text-body-sm text-ink-soft"
              style={{ left: pct(h) }}
            >
              {h > 12 ? h - 12 : h}
              {h >= 12 ? 'pm' : 'am'}
            </span>
          ))}
        </div>
      </div>
      <ul className="space-y-3">
        {schedule.courts.map((court) => {
          const items = schedule.reservations.filter((r) => r.courtId === court.id);
          return (
            <li key={court.id} className="grid grid-cols-[9rem_1fr] items-center gap-x-3">
              <span className="text-body font-semibold text-ink">{court.name}</span>
              <div className="relative h-16 rounded-lg bg-page ring-1 ring-line">
                {HOURS.slice(1).map((h) => (
                  <span
                    key={h}
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-line"
                    style={{ left: pct(h) }}
                  />
                ))}
                {items.length === 0 && <span className="sr-only">Libre todo el día</span>}
                <ul aria-label={`Ocupación de ${court.name}`}>
                  {items.map((r) => {
                    const start = Math.max(OPEN_HOUR, clubHourOf(r.periodStart));
                    const end = Math.min(CLOSE_HOUR, clubHourOf(r.periodEnd) || CLOSE_HOUR);
                    const type = r.reservationType ?? RESERVATION_TYPE.PRIVATE;
                    return (
                      <li
                        key={r.id ?? r.periodStart}
                        className={cn(
                          'absolute inset-y-1 overflow-hidden rounded-md px-1.5 py-1',
                          BLOCK_STYLES[type] ?? OTHER_BLOCK,
                        )}
                        style={{
                          left: pct(start),
                          width: `calc(${pct(end + OPEN_HOUR - start)} - 2px)`,
                        }}
                        title={`${formatTime(r.periodStart)} · ${blockLabel(r)}`}
                      >
                        <span className="sr-only">
                          {`${formatTime(r.periodStart)} a ${formatTime(r.periodEnd)}: ${blockLabel(r)}`}
                        </span>
                        {/* A 1-hour block is ~45px wide: only the hour fits.
                            Longer blocks also show who (or "Clase"). */}
                        <span
                          aria-hidden="true"
                          className="block truncate text-body-sm font-bold leading-tight"
                        >
                          {shortHour(start)}
                        </span>
                        {end - start >= 2 && (
                          <span
                            aria-hidden="true"
                            className="block truncate text-body-sm leading-tight"
                          >
                            {blockLabel(r)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {showNow && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 w-0.5 bg-danger"
                    style={{ left: pct(nowHour) }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Legend />
    </div>
  );
}

function CourtList({ schedule }) {
  return (
    <ul className="space-y-4">
      {schedule.courts.map((court) => {
        const items = schedule.reservations
          .filter((r) => r.courtId === court.id)
          .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));
        return (
          <li key={court.id}>
            <h3 className="mb-2 text-lead font-bold text-ink">{court.name}</h3>
            {items.length === 0 ? (
              <p className="text-body text-ink-soft">Libre todo el día</p>
            ) : (
              <ul className="space-y-2">
                {items.map((r) => {
                  const type = r.reservationType ?? RESERVATION_TYPE.PRIVATE;
                  return (
                    <li
                      key={r.id ?? r.periodStart}
                      className="flex items-center gap-3 rounded-lg bg-page p-3"
                    >
                      <span
                        className={cn(
                          'shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-body-sm font-bold',
                          BLOCK_STYLES[type] ?? OTHER_BLOCK,
                        )}
                      >
                        {formatTime(r.periodStart)}
                      </span>
                      <span className="min-w-0 text-body text-ink">
                        {RESERVATION_TYPE_LABELS[type] ?? 'Ocupada'}
                        {type === RESERVATION_TYPE.PRIVATE && r.holderName
                          ? ` · ${r.holderName}`
                          : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Legend() {
  const items = [
    ['bg-clay', 'Reserva'],
    ['bg-navy-400', 'Clase'],
    ['bg-navy-500', 'Torneo'],
    ['bg-muted border border-line-strong', 'Mantenimiento o bloqueo'],
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2" aria-label="Convenciones">
      {items.map(([color, text]) => (
        <li key={text} className="flex items-center gap-2 text-body text-ink-soft">
          <span aria-hidden="true" className={cn('h-4 w-6 rounded', color)} />
          {text}
        </li>
      ))}
    </ul>
  );
}

function CourtsTodaySection({ schedule }) {
  const wide = useMediaQuery('(min-width: 768px)');
  return (
    <SectionCard
      title="Canchas hoy"
      description={`De ${OPEN_HOUR}:00 a. m. a ${CLOSE_HOUR - 12}:00 p. m.`}
      async={schedule}
      isEmpty={(d) => d.courts.length === 0}
      empty={{ title: 'No hay canchas activas' }}
      className="mb-10"
    >
      {(data) => (wide ? <CourtTimeline schedule={data} isToday /> : <CourtList schedule={data} />)}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

const FEED_DOTS = {
  court: ['bg-clay', 'Pago de cancha'],
  membership: ['bg-status-ok-fg', 'Pago de membresía'],
  request: ['bg-amber', 'Solicitud'],
};

function RecentActivitySection({ isAdmin }) {
  const feed = useAsync(async () => {
    const today = clubTodayKey();
    const weekAgo = addDaysToKey(today, -7);
    const sources = [
      bookingClient.listPayments({ from: weekAgo, to: today }).then((d) =>
        d.payments.map((p) => ({
          id: `c-${p.id}`,
          kind: 'court',
          at: p.recordedAt,
          text: `Pago de cancha por ${formatCop(p.amountCop)}`,
        })),
      ),
      billingClient.listInvoicesClubWide({ status: 'PAID', from: weekAgo, to: today }).then((d) =>
        d.invoices.map((i) => ({
          id: `m-${i.id}`,
          kind: 'membership',
          at: i.paidAt,
          text: `${[i.playerFirstName, i.playerLastName].filter(Boolean).join(' ') || 'Un jugador'} pagó su membresía (${formatCop(i.amountCop)})`,
        })),
      ),
    ];
    if (isAdmin) {
      sources.push(
        affiliationClient.listRequests().then((d) =>
          d.requests.map((r) => ({
            id: `a-${r.id}`,
            kind: 'request',
            at: r.requestedAt,
            text: 'Nueva solicitud de afiliación',
          })),
        ),
        guardianshipClient.listGuardianships().then((d) =>
          d.guardianships.map((g) => ({
            id: `g-${g.id}`,
            kind: 'request',
            at: g.requestedAt,
            text: `Un acudiente pidió vincular a ${g.minorEmail}`,
          })),
        ),
      );
    }
    const results = await Promise.allSettled(sources);
    if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
    const since = Date.now() - 7 * 86_400_000;
    return results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .filter((item) => item.at && new Date(item.at).getTime() >= since)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);
  }, [isAdmin]);

  return (
    <SectionCard
      title="Últimos 7 días"
      description="Pagos y solicitudes recientes."
      async={feed}
      isEmpty={(d) => d.length === 0}
      empty={{ title: 'Sin movimientos esta semana' }}
    >
      {(items) => (
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const [dot, kindLabel] = FEED_DOTS[item.kind];
            return (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <span
                  aria-hidden="true"
                  className={cn('mt-2 h-3 w-3 shrink-0 rounded-full', dot)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body text-ink">
                    <span className="sr-only">{kindLabel}: </span>
                    {item.text}
                  </p>
                  <p className="text-body-sm text-ink-soft">
                    {formatDayShort(item.at)} · {formatTime(item.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

export function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = (user?.roles ?? []).includes(ROLE_CODES.ADMINISTRADOR);
  const today = clubTodayKey();
  const profile = useAsync(() => membershipClient.getMyProfile(), []);
  const schedule = useAsync(() => bookingClient.getSchedule(today), [today]);
  const unpaidCount = useMemo(
    () => (schedule.status === 'ready' ? schedule.data.reservations.filter(isUnpaid).length : null),
    [schedule.status, schedule.data],
  );
  const name = profile.data?.firstName;

  return (
    <div>
      <header className="mb-8">
        <p className="text-lead font-semibold text-clay-dark">{dayTitle(today)}</p>
        <h1 className="mt-1 font-display text-title font-bold text-ink md:text-title-lg">
          {greetingForHour(clubCurrentHour())}
          {name ? `, ${name}` : ''}
        </h1>
      </header>

      {schedule.status === 'error' && (
        <ErrorState
          className="mb-8"
          title="No pudimos cargar la agenda de hoy"
          description="Las reservas y los cobros de hoy no se ven por ahora."
          onRetry={schedule.reload}
        />
      )}

      <TodoSection
        unpaidCount={unpaidCount}
        scheduleLoading={schedule.status === 'loading'}
        isAdmin={isAdmin}
      />
      <StatsSection schedule={schedule} />
      {schedule.status !== 'error' && <CourtsTodaySection schedule={schedule} />}
      <RecentActivitySection isAdmin={isAdmin} />
    </div>
  );
}
