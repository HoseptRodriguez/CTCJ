import { useEffect, useState } from 'react';
import { ROLE_CODES, ROLE_DEFINITIONS } from '@ctcj/shared';

import { affiliationClient } from '../api/affiliationClient.js';
import { billingClient } from '../api/billingClient.js';
import { bookingClient } from '../api/bookingClient.js';
import { challengesClient } from '../api/challengesClient.js';
import { clinicalClient } from '../api/clinicalClient.js';
import { coachingClient } from '../api/coachingClient.js';
import { competitionClient } from '../api/competitionClient.js';
import { goalsClient } from '../api/goalsClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { tournamentClient } from '../api/tournamentClient.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { PerformanceLineChart } from '../components/ui/PerformanceLineChart.jsx';
import { PerformanceRadarChart } from '../components/ui/PerformanceRadarChart.jsx';
import { Section } from '../components/ui/Section.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeChallengesError } from '../lib/challengesErrorMessages.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';
import {
  MEMBERSHIP_STATUS_DISPLAY,
  describeMembershipStatus,
} from '../lib/membershipStatusLabels.js';
import { describePlayerMembershipStatus } from '../lib/playerMembershipStatusLabels.js';
import { describeInvoiceStatus } from '../lib/invoiceStatusLabels.js';
import { describeArea, describeRatingBand } from '../lib/performanceRatingLabels.js';

import { bogotaTodayKey } from './reservation/DatePicker.jsx';

const PLAN_COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const INVOICE_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

const REQUEST_STATUS_LABELS = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

const NOTE_TYPE_LABELS = {
  TRAINING: 'Entrenamiento',
  TECHNICAL: 'Técnica',
  TACTICAL: 'Táctica',
  RECOMMENDATION: 'Recomendación',
};

const CLINICAL_NOTE_TYPE_LABELS = {
  FOLLOW_UP: 'Seguimiento',
  RECOMMENDATION: 'Recomendación',
  SESSION_NOTE: 'Nota de sesión',
  GENERAL: 'General',
};

const APPOINTMENT_STATUS_LABELS = {
  SCHEDULED: 'Programada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

const APPOINTMENT_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const RECOVERY_PLAN_STATUS_LABELS = {
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  DISCONTINUED: 'Interrumpido',
};
const MEDICAL_HISTORY_STATUS_LABELS = {
  ACTIVE: 'Activo',
  RESOLVED: 'Resuelto',
};

const CATEGORY_LABELS = {
  SEGUNDA: 'Segunda categoría',
  TERCERA: 'Tercera categoría',
  CUARTA: 'Cuarta categoría',
  QUINTA: 'Quinta categoría',
};
const MODALITY_LABELS = { SINGLES: 'Singles', DOBLES: 'Dobles' };
const MATCH_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

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

function MyPlanSection() {
  const [memberships, setMemberships] = useState(null);
  const [invoices, setInvoices] = useState(null);

  useEffect(() => {
    let cancelled = false;
    billingClient
      .getMyMemberships()
      .then((data) => {
        if (!cancelled) setMemberships(data.memberships);
      })
      .catch(() => {
        if (!cancelled) setMemberships([]);
      });
    billingClient
      .getMyInvoices()
      .then((data) => {
        if (!cancelled) setInvoices(data.invoices);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!memberships || memberships.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Mi plan</h3>
      <ul className="mt-3 space-y-2">
        {memberships.map((m) => {
          const myInvoices = invoices?.filter((i) => i.membershipId === m.id) ?? [];
          return (
            <li key={m.id} className="rounded-md bg-raised px-4 py-2 text-sm">
              <span className="font-semibold text-primary">{m.planName}</span>{' '}
              {m.currentPriceCop != null ? `· ${PLAN_COP_FORMATTER.format(m.currentPriceCop)}` : ''}
              {' · '}
              <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                {describePlayerMembershipStatus(m.status)}
              </span>
              {myInvoices.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-neutral-200 pt-2">
                  {myInvoices.map((invoice) => (
                    <li key={invoice.id} className="text-secondary">
                      {PLAN_COP_FORMATTER.format(invoice.amountCop)} · vence{' '}
                      {INVOICE_DATE_FORMATTER.format(new Date(invoice.dueDate))}
                      {' · '}
                      <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                        {describeInvoiceStatus(invoice.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MyNotesSection() {
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    coachingClient
      .getMyNotes()
      .then((data) => {
        if (!cancelled) setNotes(data.notes);
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!notes || notes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Mis notas</h3>
      <p className="mt-1 text-sm text-secondary">
        Notas de entrenamiento y recomendaciones que tu entrenador ha compartido contigo.
      </p>
      <ul className="mt-3 space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="rounded-md bg-raised px-4 py-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
              {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType} ·{' '}
              {INVOICE_DATE_FORMATTER.format(new Date(note.createdAt))}
            </span>
            <p className="mt-1 text-secondary">{note.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MyAppointmentsSection() {
  const [appointments, setAppointments] = useState(null);

  useEffect(() => {
    let cancelled = false;
    clinicalClient
      .getMyAppointments()
      .then((data) => {
        if (!cancelled) setAppointments(data.appointments);
      })
      .catch(() => {
        if (!cancelled) setAppointments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!appointments || appointments.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Mis citas</h3>
      <p className="mt-1 text-sm text-secondary">
        Citas de psicología, neuropsicología y fisioterapia agendadas para ti.
      </p>
      <ul className="mt-3 space-y-2">
        {appointments.map((appointment) => (
          <li key={appointment.id} className="rounded-md bg-raised px-4 py-2 text-sm">
            <span className="font-semibold text-primary">
              {appointment.practitionerName ?? 'Profesional'}
            </span>{' '}
            · {APPOINTMENT_DATE_FORMATTER.format(new Date(appointment.periodStart))}
            {' · '}
            <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
              {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MyClinicalNotesSection() {
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    clinicalClient
      .getMyNotes()
      .then((data) => {
        if (!cancelled) setNotes(data.notes);
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!notes || notes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">
        Notas de psicología y fisioterapia
      </h3>
      <p className="mt-1 text-sm text-secondary">
        Notas de seguimiento y recomendaciones que tu equipo clínico ha compartido contigo.
      </p>
      <ul className="mt-3 space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="rounded-md bg-raised px-4 py-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
              {CLINICAL_NOTE_TYPE_LABELS[note.noteType] ?? note.noteType} ·{' '}
              {INVOICE_DATE_FORMATTER.format(new Date(note.createdAt))}
            </span>
            <p className="mt-1 text-secondary">{note.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MyRecoveryPlansSection() {
  const [plans, setPlans] = useState(null);

  useEffect(() => {
    let cancelled = false;
    clinicalClient
      .getMyRecoveryPlans()
      .then((data) => {
        if (!cancelled) setPlans(data.plans);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!plans || plans.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">
        Mis planes de recuperación
      </h3>
      <p className="mt-1 text-sm text-secondary">
        Planes de fisioterapia que tu fisioterapeuta ha compartido contigo.
      </p>
      <ul className="mt-3 space-y-2">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-md bg-raised px-4 py-2 text-sm">
            <span className="font-semibold text-primary">{plan.title}</span>{' '}
            <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
              {RECOVERY_PLAN_STATUS_LABELS[plan.status] ?? plan.status}
            </span>
            {plan.goal ? <p className="mt-1 text-secondary">{plan.goal}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MyMedicalHistorySection() {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let cancelled = false;
    clinicalClient
      .getMyMedicalHistory()
      .then((data) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Mi historial médico</h3>
      <p className="mt-1 text-sm text-secondary">
        Historial médico que tu fisioterapeuta ha compartido contigo.
      </p>
      <ul className="mt-3 space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-md bg-raised px-4 py-2 text-sm">
            <span className="font-semibold text-primary">{entry.condition}</span>{' '}
            <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
              {MEDICAL_HISTORY_STATUS_LABELS[entry.status] ?? entry.status}
            </span>
            {entry.description ? <p className="mt-1 text-secondary">{entry.description}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MyRankingSection({ matchLimit = 5 } = {}) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    competitionClient
      .getMyCompetitionSummary({ matchLimit })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary({ hasSeason: false, categories: [], recentMatches: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [matchLimit]);

  if (!summary || !summary.hasSeason || summary.categories.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Ranking interno</h3>
      <p className="mt-1 text-sm text-secondary">
        Tu posición y récord de la temporada actual, calculados a partir de tus partidos.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {summary.categories.map((c) => (
          <div key={`${c.category}-${c.modality}`} className="rounded-md bg-raised p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
              {CATEGORY_LABELS[c.category] ?? c.category} ·{' '}
              {MODALITY_LABELS[c.modality] ?? c.modality}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-primary">
              #{c.rank}
              {c.qualifiesForMasters ? (
                <span className="ml-2 rounded-full bg-action px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-on-action">
                  Clasifica al Masters
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-secondary">
              {c.wins}V - {c.losses}D · {c.winPercentage}% de victorias · {c.points} pts
            </p>
          </div>
        ))}
      </div>

      {summary.recentMatches.length > 0 ? (
        <div className="mt-6">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-secondary">
            Partidos recientes
          </h4>
          <ul className="mt-2 space-y-2">
            {summary.recentMatches.slice(0, matchLimit).map((match) => {
              const opponents = (match.won ? match.participantsB : match.participantsA)
                .map((p) => (p.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null))
                .filter(Boolean)
                .join(' / ');
              return (
                <li
                  key={match.id}
                  className="flex items-center justify-between rounded-md bg-raised px-4 py-2 text-sm"
                >
                  <span className="text-secondary">
                    vs. {opponents || 'Rival desconocido'} ·{' '}
                    {MATCH_DATE_FORMATTER.format(new Date(match.playedAt))}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      match.won ? 'bg-action text-on-action' : 'bg-neutral-200 text-secondary'
                    }`}
                  >
                    {match.won ? 'Victoria' : 'Derrota'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MyPerformanceSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    coachingClient
      .getMyPerformance()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            ratings: [],
            summary: { ratedAreas: [], latestByArea: {}, progressByArea: {} },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Mi rendimiento</h3>
      <p className="mt-1 text-sm text-secondary">
        Evaluaciones de tu entrenador sobre tus habilidades técnicas.
      </p>

      {data.ratings.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">Aún no tienes evaluaciones registradas.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <PerformanceRadarChart latestByArea={data.summary.latestByArea} />
            <ul className="space-y-2">
              {data.summary.ratedAreas.map((area) => (
                <li
                  key={area}
                  className="flex items-center justify-between rounded-md bg-raised px-4 py-2 text-sm"
                >
                  <span className="text-secondary">{describeArea(area)}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                    {describeRatingBand(data.summary.latestByArea[area])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {Object.keys(data.summary.progressByArea).length > 0 ? (
            <div className="mt-6">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-secondary">
                Tu progreso en el tiempo
              </h4>
              <PerformanceLineChart ratings={data.ratings} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

const GOAL_METRIC_LABELS = {
  SKILL_RATING: 'Habilidad',
  MATCH_WINS: 'Victorias',
  RANKING_POSITION: 'Ranking',
  TRAINING_FREQUENCY: 'Frecuencia de entrenamiento',
  CUSTOM: 'Meta personal',
};

/** Compact dashboard summary -- full create/list/abandon management lives
 * on PlayerProfilePage.jsx, matching the Dashboard's own "summary here,
 * full management on a dedicated page" split established for every other
 * section (e.g. staff shortcuts on AdminDashboard.jsx). */
function MyGoalsSection() {
  const [goals, setGoals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    goalsClient
      .getMyGoals()
      .then((data) => {
        if (!cancelled) setGoals(data.goals);
      })
      .catch(() => {
        if (!cancelled) setGoals([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (goals === null) {
    return null;
  }

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE').slice(0, 3);

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-primary">Mis metas</h3>
        <Button to="/mi-ctcj/perfil" variant="ghost" className="px-0 text-xs">
          Ver todas / Agregar meta
        </Button>
      </div>

      {activeGoals.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">
          Aún no tienes metas activas. Crea una para seguir tu progreso.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activeGoals.map((goal) => (
            <li key={goal.id} className="rounded-md bg-raised px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-primary">{goal.title}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                  {GOAL_METRIC_LABELS[goal.metricType] ?? goal.metricType}
                </span>
              </div>
              {goal.percentComplete != null ? (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-action"
                    style={{ width: `${goal.percentComplete}%` }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CHALLENGE_STATUS_LABELS = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
};

/** "Find practice partners" + "challenge other players" as one combined
 * flow (search -> challenge), not two separate systems -- see the Phase 3a
 * plan for why. */
function PlayerSearchAndChallenge({ onChallenged }) {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [challengingId, setChallengingId] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setPlayers([]);
      return undefined;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      membershipClient
        .searchPlayers(query.trim())
        .then((data) => {
          if (!cancelled) setPlayers(data.players);
        })
        .catch(() => {
          if (!cancelled) setPlayers([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  async function handleChallenge(opponentUserId) {
    setSubmitting(true);
    setError(null);
    try {
      await challengesClient.createChallenge({
        opponentUserId,
        message: message.trim() || undefined,
      });
      setChallengingId(null);
      setMessage('');
      setQuery('');
      setPlayers([]);
      await onChallenged();
    } catch (err) {
      setError(describeChallengesError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-primary" htmlFor="player-search">
        Buscar jugador
      </label>
      <input
        id="player-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nombre del jugador"
        className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm sm:w-72"
      />

      {players.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {players.map((player) => (
            <li key={player.id} className="rounded-md bg-raised px-4 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-primary">
                  {player.firstName} {player.lastName}
                </span>
                {challengingId === player.id ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1 text-xs"
                    onClick={() => setChallengingId(player.id)}
                  >
                    Retar
                  </Button>
                )}
              </div>
              {challengingId === player.id ? (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mensaje (opcional)"
                    className="w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm sm:w-56"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    className="px-3 py-1 text-xs"
                    disabled={submitting}
                    onClick={() => handleChallenge(player.id)}
                  >
                    {submitting ? 'Enviando...' : 'Enviar reto'}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </div>
  );
}

/** ACCEPTED challenges need a score entered by each player before they can
 * ever become a real match -- this form covers both the first entry and
 * editing/resubmitting your own prior one (submit() overwrites it
 * pre-confirmation, see submitMatchScore.js). */
function MatchScoreForm({ challenge, onSubmitted }) {
  const existing = challenge.matchResult?.mySubmission ?? null;
  const [category, setCategory] = useState(existing?.category ?? Object.keys(CATEGORY_LABELS)[0]);
  const [mySetsWon, setMySetsWon] = useState(existing?.mySetsWon ?? '');
  const [opponentSetsWon, setOpponentSetsWon] = useState(existing?.opponentSetsWon ?? '');
  const [playedAt, setPlayedAt] = useState(
    existing?.playedAt ? String(existing.playedAt).slice(0, 10) : bogotaTodayKey(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await challengesClient.submitMatchScore(challenge.id, {
        category,
        mySetsWon: Number(mySetsWon),
        opponentSetsWon: Number(opponentSetsWon),
        playedAt,
      });
      await onSubmitted();
    } catch (err) {
      setError(describeChallengesError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-xs text-secondary">
        Categoría
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-secondary">
        Sets que ganaste
        <input
          type="number"
          min="0"
          max="5"
          value={mySetsWon}
          onChange={(e) => setMySetsWon(e.target.value)}
          className="mt-1 block w-16 rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs text-secondary">
        Sets que ganó tu rival
        <input
          type="number"
          min="0"
          max="5"
          value={opponentSetsWon}
          onChange={(e) => setOpponentSetsWon(e.target.value)}
          className="mt-1 block w-16 rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs text-secondary">
        Fecha
        <input
          type="date"
          value={playedAt}
          onChange={(e) => setPlayedAt(e.target.value)}
          className="mt-1 block rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-sm"
        />
      </label>
      <Button
        type="button"
        variant="primary"
        className="px-3 py-1 text-xs"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'Enviando...' : existing ? 'Actualizar resultado' : 'Enviar resultado'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </div>
  );
}

function MyChallengesSection() {
  const [challenges, setChallenges] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return challengesClient
      .getMyChallenges()
      .then((data) => setChallenges(data.challenges))
      .catch((err) => setError(describeChallengesError(err)));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAction(actionFn, challengeId) {
    try {
      await actionFn(challengeId);
      await refetch();
    } catch (err) {
      setError(describeChallengesError(err));
    }
  }

  const received = (challenges ?? []).filter(
    (c) => c.role === 'OPPONENT' && c.status === 'PENDING',
  );
  // ACCEPTED challenges move to "Partidos por confirmar" below instead --
  // both roles, not just CHALLENGER, since either player can submit a score.
  const toConfirm = (challenges ?? []).filter((c) => c.status === 'ACCEPTED');
  const sent = (challenges ?? []).filter((c) => c.role === 'CHALLENGER' && c.status !== 'ACCEPTED');

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Retos</h3>
      <p className="mt-1 text-sm text-secondary">
        Busca un jugador para retarlo a un partido amistoso.
      </p>

      <div className="mt-4">
        <PlayerSearchAndChallenge onChallenged={refetch} />
      </div>

      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}

      {received.length > 0 ? (
        <div className="mt-6">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-secondary">
            Retos recibidos
          </h4>
          <ul className="mt-2 space-y-2">
            {received.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-raised px-4 py-2 text-sm"
              >
                <span className="text-secondary">
                  {c.otherParty ? `${c.otherParty.firstName} ${c.otherParty.lastName}` : 'Jugador'}
                  {c.message ? ` · "${c.message}"` : ''}
                </span>
                <span className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="px-3 py-1 text-xs"
                    onClick={() => handleAction(challengesClient.acceptChallenge, c.id)}
                  >
                    Aceptar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1 text-xs"
                    onClick={() => handleAction(challengesClient.rejectChallenge, c.id)}
                  >
                    Rechazar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {toConfirm.length > 0 ? (
        <div className="mt-6">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-secondary">
            Partidos por confirmar
          </h4>
          <ul className="mt-2 space-y-3">
            {toConfirm.map((c) => {
              const opponentLabel = c.otherParty
                ? `${c.otherParty.firstName} ${c.otherParty.lastName}`
                : 'Jugador';
              const mr = c.matchResult;
              return (
                <li key={c.id} className="rounded-md bg-raised px-4 py-3 text-sm">
                  <span className="font-semibold text-primary">vs. {opponentLabel}</span>

                  {mr?.mismatch ? (
                    <div className="mt-2 rounded-md bg-error/10 px-3 py-2 text-xs text-error">
                      Los resultados no coinciden. Revisa y vuelve a enviar el resultado.
                      <div className="mt-1 text-secondary">
                        Tu resultado: {mr.mySubmission.mySetsWon}-{mr.mySubmission.opponentSetsWon}{' '}
                        ({CATEGORY_LABELS[mr.mySubmission.category] ?? mr.mySubmission.category})
                        <br />
                        Resultado de {opponentLabel}: {mr.opponentSubmission.mySetsWon}-
                        {mr.opponentSubmission.opponentSetsWon} (
                        {CATEGORY_LABELS[mr.opponentSubmission.category] ??
                          mr.opponentSubmission.category}
                        )
                      </div>
                    </div>
                  ) : mr?.mySubmission && !mr?.opponentSubmission ? (
                    <p className="mt-1 text-xs text-secondary">
                      Esperando que {opponentLabel} registre el resultado.
                    </p>
                  ) : null}

                  <MatchScoreForm challenge={c} onSubmitted={refetch} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {sent.length > 0 ? (
        <div className="mt-6">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-secondary">
            Retos enviados
          </h4>
          <ul className="mt-2 space-y-2">
            {sent.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-raised px-4 py-2 text-sm"
              >
                <span className="text-secondary">
                  {c.otherParty ? `${c.otherParty.firstName} ${c.otherParty.lastName}` : 'Jugador'}
                  {' · '}
                  <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                    {CHALLENGE_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </span>
                {c.status === 'PENDING' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1 text-xs"
                    onClick={() => handleAction(challengesClient.cancelChallenge, c.id)}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const ACTIVITY_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

function playerLabel(participant) {
  return participant.firstName
    ? `${participant.firstName} ${participant.lastName ?? ''}`.trim()
    : null;
}

function participantsLabel(participants) {
  return participants.map(playerLabel).filter(Boolean).join(' / ') || 'Jugador';
}

/** "Follow club activity" (Phase 3b) -- club-wide, not per-player, so
 * there's nothing to fetch "for me" here; merges two already-public
 * sources client-side, same shape as AdminDashboard.jsx's
 * RecentActivitySection, since both sources are reachable directly with
 * zero new cross-module backend coupling. */
function ClubActivitySection() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([competitionClient.getRecentClubMatches(), tournamentClient.listTournaments()])
      .then(([matchesData, tournamentsData]) => {
        if (cancelled) return;
        const matchItems = matchesData.matches.map((m) => {
          const winners = m.winnerSide === 'A' ? m.participantsA : m.participantsB;
          const losers = m.winnerSide === 'A' ? m.participantsB : m.participantsA;
          return {
            id: `match-${m.id}`,
            at: m.playedAt,
            text: `Resultado: ${participantsLabel(winners)} venció a ${participantsLabel(losers)} · ${
              CATEGORY_LABELS[m.category] ?? m.category
            } / ${MODALITY_LABELS[m.modality] ?? m.modality}`,
          };
        });
        const tournamentItems = tournamentsData.tournaments
          .filter((t) => t.status === 'COMPLETED')
          .map((t) => ({
            id: `tournament-${t.id}`,
            at: t.completedAt,
            text: `Torneo finalizado: ${t.name}`,
          }));
        const feed = [...matchItems, ...tournamentItems]
          .sort((a, b) => new Date(b.at) - new Date(a.at))
          .slice(0, 15);
        setItems(feed);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-8 rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Actividad del club</h3>
      <p className="mt-1 text-sm text-secondary">
        Resultados recientes y torneos finalizados en el club.
      </p>

      {items === null ? <p className="mt-3 text-sm text-secondary">Cargando...</p> : null}
      {items?.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">Sin actividad reciente.</p>
      ) : null}
      {items?.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md bg-raised px-4 py-2 text-sm"
            >
              <span className="text-secondary">{item.text}</span>
              <span className="text-xs text-tertiary">
                {ACTIVITY_DATE_FORMATTER.format(new Date(item.at))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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
const UPCOMING_FEATURES = ['Pago en línea de tus facturas'];

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
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    membershipClient
      .getMyProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        // The welcome greeting falls back to a generic title -- not load-bearing.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
  const nextTraining = reservations?.find((r) => r.reservationType === 'CLASS') ?? null;

  return (
    <Section
      heading={{
        eyebrow: 'Mi CTCJ',
        title: profile?.firstName ? `Hola, ${profile.firstName}` : 'Bienvenido a tu panel',
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

      {isJugador ? (
        <Button to="/mi-ctcj/perfil" variant="ghost" className="mt-4 px-0">
          Ver mi perfil completo
        </Button>
      ) : null}

      {isJugador && nextTraining ? (
        <div className="mt-6 rounded-lg border border-action bg-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
            Tu próximo entrenamiento
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-primary">
            {DATE_FORMATTER.format(new Date(nextTraining.periodStart))} ·{' '}
            {TIME_FORMATTER.format(new Date(nextTraining.periodStart))} –{' '}
            {TIME_FORMATTER.format(new Date(nextTraining.periodEnd))}
          </p>
        </div>
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
      {isJugador ? <MyGoalsSection /> : null}
      {isJugador ? <MyChallengesSection /> : null}
      {isJugador ? <ClubActivitySection /> : null}
      {isJugador ? <MyRankingSection /> : null}
      {isJugador ? <MyPlanSection /> : null}
      {isJugador ? <MyNotesSection /> : null}
      {isJugador ? <MyPerformanceSection /> : null}
      {isJugador ? <MyAppointmentsSection /> : null}
      {isJugador ? <MyClinicalNotesSection /> : null}
      {isJugador ? <MyRecoveryPlansSection /> : null}
      {isJugador ? <MyMedicalHistorySection /> : null}
      <GuardianshipSection />
    </Section>
  );
}
