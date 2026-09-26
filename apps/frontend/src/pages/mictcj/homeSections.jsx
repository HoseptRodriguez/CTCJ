import { useState } from 'react';
import { Link } from 'react-router-dom';

import { affiliationClient } from '../../api/affiliationClient.js';
import { billingClient } from '../../api/billingClient.js';
import { bookingClient } from '../../api/bookingClient.js';
import { challengesClient } from '../../api/challengesClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { competitionClient } from '../../api/competitionClient.js';
import { goalsClient } from '../../api/goalsClient.js';
import { SkillRadar } from '../../components/charts/SkillRadar.jsx';
import { CalendarIcon } from '../../components/icons/CalendarIcon.jsx';
import { CheckIcon } from '../../components/icons/CheckIcon.jsx';
import { AnimatedCheck } from '../../components/motion/AnimatedCheck.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ClubPhoto } from '../../components/ui/ClubPhoto.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { TextAreaField } from '../../components/ui/Field.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { cn } from '../../components/ui/cn.js';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';
import { describeChallengesError } from '../../lib/challengesErrorMessages.js';
import { capitalize, CLUB_TIME_ZONE, formatCop, formatTime } from '../../lib/format.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { describePlayerMembershipStatus } from '../../lib/playerMembershipStatusLabels.js';
import { compareWithPast, highlights } from '../../lib/performance.js';
import { AREA_LABELS } from '../../lib/performanceRatingLabels.js';
import { useAsync } from '../../lib/useAsync.js';

import { useMyCtcj } from './MyCtcjContext.jsx';
import {
  CATEGORY_LABELS,
  DATE_MEDIUM,
  MODALITY_LABELS,
  NOTE_TYPE_LABELS,
  ProgressBar,
  REQUEST_STATUS_LABELS,
  SectionCard,
  invoiceBadge,
  personName,
} from './shared.jsx';

const WEEKDAY_DAY = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  timeZone: CLUB_TIME_ZONE,
});
const MONTH = new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: CLUB_TIME_ZONE });
const HOUR_MS = 60 * 60 * 1000;
export const MASTERS_TOP = 8; // apps/backend competition/domain/policies/standingsPolicy.js

/** Upcoming own reservations (shared by Inicio and Reservas). */
export function useMyReservations() {
  return useAsync(() => bookingClient.getMyReservations().then((d) => d.reservations), []);
}

export function upcoming(reservations, now = Date.now()) {
  return (reservations ?? []).filter((r) => new Date(r.periodEnd).getTime() > now);
}

/** Payment state of one reservation, as a badge. */
export function ReservationPayment({ reservation }) {
  if (reservation.status === 'HOLD')
    return <StatusBadge status="pendiente" label="Sin confirmar" />;
  if (reservation.paymentId) return <StatusBadge status="al-dia" label="Pagada" />;
  return (
    <StatusBadge
      status="pendiente"
      label={`Pagas en recepción · ${formatCop(reservation.priceCop)}`}
    />
  );
}

/** "Cancelar reserva" with a confirmation that says what will happen. */
export function CancelReservationButton({ reservation, onCancelled, size }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hoursLeft = (new Date(reservation.periodStart).getTime() - Date.now()) / HOUR_MS;
  const late = hoursLeft < 12;

  async function confirm() {
    setBusy(true);
    try {
      await bookingClient.cancel(reservation.id);
      setOpen(false);
      toast({
        title: 'Reserva cancelada',
        description: 'La cancha quedó libre para otros jugadores.',
      });
      onCancelled?.();
    } catch (err) {
      setOpen(false);
      toast({
        title: 'No se pudo cancelar',
        description: describeBookingError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size={size} onClick={() => setOpen(true)}>
        Cancelar reserva
      </Button>
      <ConfirmDialog
        open={open}
        title="¿Cancelar esta reserva?"
        description={
          <>
            {reservation.courtName ?? 'Cancha'},{' '}
            {capitalize(WEEKDAY_DAY.format(new Date(reservation.periodStart)))} a las{' '}
            {formatTime(reservation.periodStart)}.{' '}
            {late
              ? 'Faltan menos de 12 horas: el club puede aplicar una penalidad por cancelar tarde.'
              : 'Faltan más de 12 horas: puedes cancelar sin penalidad.'}
          </>
        }
        confirmLabel="Sí, cancelar reserva"
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

/** Big hero card: the next own reservation (or training). */
export function NextMatchCard({ reservations }) {
  const { bookableMinors } = useMyCtcj();
  return (
    <SectionCard
      title="Tu próximo partido"
      async={reservations}
      isEmpty={(list) => upcoming(list).length === 0}
      empty={{
        title: 'No tienes reservas próximas',
        description: 'Reserva una cancha y aquí verás el día, la hora y si ya está pagada.',
        icon: <CalendarIcon />,
        action: (
          <Button to="/canchas" icon={<CalendarIcon />}>
            Reservar cancha
          </Button>
        ),
      }}
      className="overflow-hidden"
    >
      {(list) => {
        const next = upcoming(list)[0];
        const start = new Date(next.periodStart);
        const isClass = next.reservationType === 'CLASS';
        const minor = next.bookedForOther
          ? bookableMinors.find((m) => m.minorUserId === next.holderUserId)?.minorEmail
          : null;
        return (
          <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
            <div>
              {isClass && (
                <p className="text-lead font-semibold text-clay-dark">Tu próximo entrenamiento</p>
              )}
              <p className="font-display text-[2.75rem] font-bold leading-none text-ink md:text-[3.5rem]">
                {capitalize(WEEKDAY_DAY.format(start))}
              </p>
              <p className="mt-1 text-lead text-ink-soft">de {MONTH.format(start)}</p>
              <p className="mt-3 font-display text-stat font-bold text-navy-500">
                {formatTime(next.periodStart)}{' '}
                <span className="text-lead font-semibold text-ink-soft">
                  a {formatTime(next.periodEnd)}
                </span>
              </p>
              <p className="mt-2 text-lead font-semibold text-ink">{next.courtName}</p>
              {minor && <p className="text-body text-ink-soft">Reservada para {minor}</p>}
              <div className="mt-4">
                <ReservationPayment reservation={next} />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button to="/mi-ctcj/reservas" variant="secondary">
                  Ver mis reservas
                </Button>
                <CancelReservationButton reservation={next} onCancelled={reservations.reload} />
              </div>
            </div>
            <ClubPhoto
              name="jugador-saque-azul"
              alt=""
              sizes="16rem"
              className="hidden aspect-[3/4] rounded-xl md:block"
            />
          </div>
        );
      }}
    </SectionCard>
  );
}

/** Rank in the player's best category, with the road to the Masters Top 8. */
export function RankingCard() {
  const summary = useAsync(() => competitionClient.getMyCompetitionSummary({ matchLimit: 5 }), []);
  return (
    <SectionCard
      title="Mi ranking"
      async={summary}
      isEmpty={(s) => !s.hasSeason || s.categories.length === 0}
      empty={{
        title: 'Aún no apareces en el ranking',
        description:
          'Tu posición aparece cuando juegas tu primer partido de la temporada. Reta a alguien para empezar.',
        action: <Button to="/mi-ctcj/ranking">Ir a Ranking</Button>,
      }}
      actions={
        <Button variant="ghost" to="/mi-ctcj/ranking">
          Ver ranking
        </Button>
      }
    >
      {(s) => {
        const best = [...s.categories].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0];
        const inTop = best.rank != null && best.rank <= MASTERS_TOP;
        return (
          <div>
            <p className="text-body font-semibold text-ink-soft">
              {CATEGORY_LABELS[best.category] ?? best.category} ·{' '}
              {MODALITY_LABELS[best.modality] ?? best.modality}
            </p>
            <p className="font-display text-[4rem] font-bold leading-none text-navy-500">
              <span className="sr-only">Puesto </span>#{best.rank}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-page p-2">
                <dt className="text-body-sm text-ink-soft">Puntos</dt>
                <dd className="font-display text-h2 font-bold">{best.points}</dd>
              </div>
              <div className="rounded-lg bg-page p-2">
                <dt className="text-body-sm text-ink-soft">Ganados</dt>
                <dd className="font-display text-h2 font-bold">{best.wins}</dd>
              </div>
              <div className="rounded-lg bg-page p-2">
                <dt className="text-body-sm text-ink-soft">Perdidos</dt>
                <dd className="font-display text-h2 font-bold">{best.losses}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <ProgressBar
                percent={inTop ? 100 : (MASTERS_TOP / best.rank) * 100}
                label={
                  inTop
                    ? `¡Estás en el Top ${MASTERS_TOP}! Clasificas al Masters.`
                    : `Te faltan ${best.rank - MASTERS_TOP} puestos para el Top ${MASTERS_TOP} del Masters.`
                }
              />
            </div>
          </div>
        );
      }}
    </SectionCard>
  );
}

/** Challenges waiting for this player's answer, with big Aceptar / Rechazar. */
export function ChallengesCard() {
  const toast = useToast();
  const challenges = useAsync(
    () => challengesClient.getMyChallenges().then((d) => d.challenges),
    [],
  );
  const [busyId, setBusyId] = useState(null);

  async function act(fn, id, title) {
    setBusyId(id);
    try {
      await fn(id);
      toast({ title });
      challenges.reload();
    } catch (err) {
      toast({
        title: 'No se pudo responder el reto',
        description: describeChallengesError(err),
        tone: 'error',
      });
    } finally {
      setBusyId(null);
    }
  }

  const received = (list) => list.filter((c) => c.role === 'OPPONENT' && c.status === 'PENDING');

  return (
    <SectionCard
      title="Retos"
      async={challenges}
      isEmpty={(list) => received(list).length === 0}
      empty={{
        title: 'No tienes retos por responder',
        description: 'Reta a otro jugador a un partido amistoso desde Ranking.',
        action: (
          <Button variant="secondary" to="/mi-ctcj/ranking">
            Retar a alguien
          </Button>
        ),
      }}
      actions={
        <Button variant="ghost" to="/mi-ctcj/ranking">
          Ver todos
        </Button>
      }
    >
      {(list) => (
        <ul className="space-y-4">
          {received(list).map((c) => (
            <li key={c.id} className="rounded-lg bg-page p-4">
              <p className="text-body font-semibold text-ink">
                {personName(c.otherParty) ?? 'Un jugador'} te retó
              </p>
              {c.message && <p className="mt-1 text-body text-ink-soft">“{c.message}”</p>}
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  icon={<CheckIcon />}
                  loading={busyId === c.id}
                  onClick={() => act(challengesClient.acceptChallenge, c.id, 'Reto aceptado')}
                >
                  Aceptar
                </Button>
                <Button
                  variant="secondary"
                  disabled={busyId === c.id}
                  onClick={() => act(challengesClient.rejectChallenge, c.id, 'Reto rechazado')}
                >
                  Rechazar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/** "7 de 10" (or the ranking wording, where lower is better). */
export function goalProgressLabel(goal) {
  if (goal.percentComplete == null) return 'Meta personal: sin seguimiento automático.';
  if (goal.metricType === 'RANKING_POSITION') {
    return `${goal.currentProgress != null ? `Puesto ${goal.currentProgress}` : 'Sin puesto aún'} · meta: puesto ${goal.targetValue}`;
  }
  return `${goal.currentProgress ?? 0} de ${goal.targetValue}`;
}

export function GoalsCard() {
  const goals = useAsync(() => goalsClient.getMyGoals().then((d) => d.goals), []);
  const active = (list) => list.filter((g) => g.status === 'ACTIVE').slice(0, 3);
  return (
    <SectionCard
      title="Mis metas"
      async={goals}
      isEmpty={(list) => active(list).length === 0}
      empty={{
        title: 'Aún no tienes metas activas',
        description: 'Crea una meta y verás tu avance aquí, por ejemplo “Ganar 5 partidos”.',
        action: (
          <Button variant="secondary" to="/mi-ctcj/progreso">
            Crear una meta
          </Button>
        ),
      }}
      actions={
        <Button variant="ghost" to="/mi-ctcj/progreso">
          Ver todas
        </Button>
      }
    >
      {(list) => (
        <ul className="space-y-5">
          {active(list).map((goal) => (
            <li key={goal.id}>
              <p className="mb-2 text-body font-semibold text-ink">{goal.title}</p>
              {goal.percentComplete != null ? (
                <ProgressBar percent={goal.percentComplete} label={goalProgressLabel(goal)} />
              ) : (
                <p className="text-body-sm text-ink-soft">{goalProgressLabel(goal)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function CoachSaysCard() {
  const notes = useAsync(() => coachingClient.getMyNotes().then((d) => d.notes), []);
  return (
    <SectionCard
      title="Tu entrenador dice"
      async={notes}
      isEmpty={(list) => list.length === 0}
      empty={{
        title: 'Todavía no hay notas',
        description: 'Cuando tu entrenador comparta una nota contigo, la verás aquí.',
      }}
      actions={
        <Button variant="ghost" to="/mi-ctcj/progreso">
          Ver todas
        </Button>
      }
    >
      {(list) => {
        const latest = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        return (
          <blockquote className="border-l-8 border-lime pl-4">
            <p className="text-lead text-ink">“{latest.content}”</p>
            <footer className="mt-3 text-body-sm text-ink-soft">
              {NOTE_TYPE_LABELS[latest.noteType] ?? latest.noteType} ·{' '}
              {DATE_MEDIUM.format(new Date(latest.createdAt))}
            </footer>
          </blockquote>
        );
      }}
    </SectionCard>
  );
}

/** `perf`: an already-loaded useAsync() result to share (Mi progreso), else it loads its own. */
export function PerformanceCard({ perf: shared } = {}) {
  const own = useAsync(() => coachingClient.getMyPerformance(), [], { enabled: !shared });
  const perf = shared ?? own;
  return (
    <SectionCard
      title="Mi rendimiento"
      description="Tus 10 habilidades según tu entrenador: hoy y hace 3 meses."
      async={perf}
      isEmpty={(d) => d.ratings.length === 0}
      empty={{
        title: 'Aún no tienes evaluaciones registradas',
        description: 'Cuando tu entrenador califique tus habilidades, verás aquí cómo vas.',
      }}
    >
      {(d) => {
        const comparison = compareWithPast(d.ratings);
        const { mostImproved, toWorkOn } = highlights(comparison);
        return (
          <div>
            <SkillRadar comparison={comparison} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-status-ok-bg p-4">
                <p className="text-body-sm font-semibold text-status-ok-fg">Lo que más mejoró</p>
                <p className="font-display text-h3 font-bold text-ink">
                  {mostImproved ? AREA_LABELS[mostImproved.area] : 'Aún sin comparación'}
                </p>
              </div>
              <div className="rounded-lg bg-amber-soft p-4">
                <p className="text-body-sm font-semibold text-amber-dark">Para trabajar</p>
                <p className="font-display text-h3 font-bold text-ink">
                  {toWorkOn ? AREA_LABELS[toWorkOn.area] : '—'}
                </p>
              </div>
            </div>
          </div>
        );
      }}
    </SectionCard>
  );
}

export function MembershipCard() {
  const data = useAsync(
    () =>
      Promise.all([billingClient.getMyMemberships(), billingClient.getMyInvoices()]).then(
        ([m, i]) => ({
          memberships: m.memberships,
          invoices: i.invoices,
        }),
      ),
    [],
  );
  return (
    <SectionCard
      title="Membresía y pagos"
      async={data}
      isEmpty={(d) => d.memberships.length === 0}
      empty={{
        title: 'No tienes un plan activo',
        description: 'Pregunta en recepción por los planes de la academia.',
      }}
    >
      {(d) => (
        <div className="space-y-5">
          {d.memberships.map((m) => {
            const invoices = d.invoices.filter((inv) => inv.membershipId === m.id).slice(0, 4);
            return (
              <div key={m.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-h3 font-bold text-ink">{m.planName}</p>
                  <StatusBadge
                    status={m.status === 'ACTIVE' ? 'al-dia' : 'suspendida'}
                    label={`Plan ${describePlayerMembershipStatus(m.status).toLowerCase()}`}
                  />
                </div>
                {m.currentPriceCop != null && (
                  <p className="text-body text-ink-soft">{formatCop(m.currentPriceCop)} al mes</p>
                )}
                {invoices.length > 0 && (
                  <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                    {invoices.map((inv) => {
                      const badge = invoiceBadge(inv);
                      return (
                        <li
                          key={inv.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-3"
                        >
                          <span className="text-body text-ink">
                            <strong>{formatCop(inv.amountCop)}</strong> · vence{' '}
                            {DATE_MEDIUM.format(new Date(inv.dueDate))}
                          </span>
                          <StatusBadge status={badge.status} label={badge.label} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="rounded-lg bg-page p-3 text-body-sm text-ink-soft">
            <strong className="text-ink">Pago en línea — Próximamente.</strong> Por ahora pagas en
            recepción.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

const AFFILIATION_STEPS = ['Crea tu cuenta', 'Pide ser jugador', 'El club te aprueba'];

/**
 * USUARIO (not yet a player): the 3 steps and the request form. Step 1 is
 * always done (they have an account); step 2 is done once a request exists.
 */
export function AffiliationBlock() {
  const toast = useToast();
  const requests = useAsync(() => affiliationClient.getMyRequests().then((d) => d.requests), []);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await affiliationClient.submitRequest({ notes: notes.trim() || undefined });
      setNotes('');
      toast({ title: 'Solicitud enviada', description: 'El club la revisará y te avisaremos.' });
      requests.reload();
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      title="Hazte jugador del club"
      description="Como jugador puedes ver tu progreso, el ranking, los retos y la comunidad."
      async={requests}
    >
      {(list) => {
        const latest = list[0];
        const pending = latest?.status === 'PENDING';
        const canRequest = !latest || latest.status === 'REJECTED';
        const current = pending ? 2 : 1;
        return (
          <div>
            <ol aria-label="Pasos para ser jugador" className="grid gap-3 sm:grid-cols-3">
              {AFFILIATION_STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                return (
                  <li
                    key={step}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'flex min-h-btn-lg items-center gap-3 rounded-xl border-2 px-4 py-2 text-body font-semibold',
                      done && 'border-status-ok-fg bg-status-ok-bg text-ink',
                      active && 'border-navy-500 bg-lime text-navy-500',
                      !done && !active && 'border-line bg-surface text-ink',
                    )}
                  >
                    {done ? (
                      <AnimatedCheck label="Listo" size={32} />
                    ) : (
                      <span className="font-display text-h3">{i + 1}</span>
                    )}
                    {step}
                  </li>
                );
              })}
            </ol>
            {latest && (
              <p className="mt-5 text-body text-ink">
                Estado de tu solicitud:{' '}
                <strong>{REQUEST_STATUS_LABELS[latest.status] ?? latest.status}</strong>
                {latest.status === 'REJECTED' && '. Puedes enviar una nueva.'}
              </p>
            )}
            {canRequest && (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <TextAreaField
                  label="Cuéntanos por qué quieres unirte (opcional)"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  error={error}
                />
                <Button type="submit" size="lg" loading={submitting} loadingText="Enviando…">
                  Pedir ser jugador
                </Button>
              </form>
            )}
          </div>
        );
      }}
    </SectionCard>
  );
}

/** Guardians: big "Reservar para: Yo / {menor}" shortcut into the booking page. */
export function BookForSelector() {
  const { bookableMinors } = useMyCtcj();
  if (bookableMinors.length === 0) return null;
  return (
    <section aria-labelledby="reservar-para" className="rounded-xl bg-surface p-5 shadow-sm">
      <h2 id="reservar-para" className="font-display text-h3 font-bold text-ink">
        Reservar para:
      </h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button size="lg" to="/canchas" icon={<CalendarIcon />}>
          Yo
        </Button>
        {bookableMinors.map((m) => (
          <Button
            key={m.minorUserId}
            size="lg"
            variant="secondary"
            to={`/canchas?para=${m.minorUserId}`}
          >
            {m.minorEmail}
          </Button>
        ))}
      </div>
    </section>
  );
}

export function GreetingLink({ to, children }) {
  return (
    <Link
      to={to}
      className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
    >
      {children}
    </Link>
  );
}
