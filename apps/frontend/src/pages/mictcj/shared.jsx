import { Card } from '../../components/ui/Card.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { Skeleton, SkeletonGroup, SkeletonText } from '../../components/ui/Skeleton.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { clubTodayKey } from '../../lib/clubTime.js';
import { CLUB_TIME_ZONE } from '../../lib/format.js';

export const REQUEST_STATUS_LABELS = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};
export const NOTE_TYPE_LABELS = {
  TRAINING: 'Entrenamiento',
  TECHNICAL: 'Técnica',
  TACTICAL: 'Táctica',
  RECOMMENDATION: 'Recomendación',
};
export const CLINICAL_NOTE_TYPE_LABELS = {
  FOLLOW_UP: 'Seguimiento',
  RECOMMENDATION: 'Recomendación',
  SESSION_NOTE: 'Nota de sesión',
  GENERAL: 'General',
};
export const APPOINTMENT_STATUS_LABELS = {
  SCHEDULED: 'Programada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};
export const RECOVERY_PLAN_STATUS_LABELS = {
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  DISCONTINUED: 'Interrumpido',
};
export const MEDICAL_HISTORY_STATUS_LABELS = { ACTIVE: 'Activo', RESOLVED: 'Resuelto' };
export const CATEGORY_LABELS = {
  SEGUNDA: 'Segunda categoría',
  TERCERA: 'Tercera categoría',
  CUARTA: 'Cuarta categoría',
  QUINTA: 'Quinta categoría',
};
export const MODALITY_LABELS = { SINGLES: 'Singles', DOBLES: 'Dobles' };
export const CHALLENGE_STATUS_LABELS = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
};
export const GOAL_METRIC_LABELS = {
  SKILL_RATING: 'Habilidad técnica',
  MATCH_WINS: 'Victorias',
  RANKING_POSITION: 'Posición en el ranking',
  TRAINING_FREQUENCY: 'Entrenamientos por semana',
  CUSTOM: 'Meta personal',
};
export const GOAL_STATUS_LABELS = {
  ACTIVE: 'Activa',
  ACHIEVED: 'Cumplida',
  ABANDONED: 'Abandonada',
};

export const DATE_MEDIUM = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeZone: CLUB_TIME_ZONE,
});
export const DATE_TIME_MEDIUM = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: CLUB_TIME_ZONE,
});

export function personName(person) {
  if (!person?.firstName) return null;
  return `${person.firstName} ${person.lastName ?? ''}`.trim();
}

/**
 * An invoice's state for the badge. The backend only has PENDING / PAID /
 * CANCELLED; a PENDING one past its due date is shown as "Vencida" -- a
 * display choice, it changes nothing on the server.
 */
export function invoiceBadge(invoice) {
  if (invoice.status === 'PAID') return { status: 'al-dia', label: 'Pagada' };
  if (invoice.status === 'CANCELLED') return { status: 'suspendida', label: 'Anulada' };
  const due = String(invoice.dueDate).slice(0, 10);
  return due < clubTodayKey()
    ? { status: 'vencida', label: 'Vencida' }
    : { status: 'pendiente', label: 'Pendiente' };
}

/** Membership badge for the greeting ("Sin membresía" when not enrolled). */
export function MembershipBadge({ status }) {
  if (status === undefined) return null;
  if (status === null) return <StatusBadge status="desconocido" label="Sin membresía" size="lg" />;
  return <StatusBadge status={status} size="lg" />;
}

/**
 * A dashboard section that loads on its own: skeleton while loading, an
 * error with "Intentar de nuevo", an empty state that says what to do, or
 * the content. `async` is a useAsync() result.
 */
export function SectionCard({
  title,
  description,
  actions,
  async,
  isEmpty = () => false,
  empty,
  errorTitle,
  className,
  children,
}) {
  let body;
  if (async.status === 'loading' || async.status === 'idle') {
    body = (
      <SkeletonGroup label={`Cargando ${title.toLowerCase()}…`}>
        <Skeleton className="mb-4 h-10 w-1/2" />
        <SkeletonText lines={3} />
      </SkeletonGroup>
    );
  } else if (async.status === 'error') {
    body = (
      <ErrorState
        title={errorTitle ?? `No pudimos cargar ${title.toLowerCase()}`}
        onRetry={async.reload}
      />
    );
  } else if (isEmpty(async.data)) {
    body = <EmptyState {...empty} className="border-0 px-0 py-4" />;
  } else {
    body = children(async.data);
  }
  return (
    <Card title={title} description={description} actions={actions} className={className}>
      {body}
    </Card>
  );
}

/** Progress bar with its text ("7 de 10"), never a bare bar. */
export function ProgressBar({ percent, label }) {
  const value = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={label}
        className="h-4 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-status-ok-fg" style={{ width: `${value}%` }} />
      </div>
      {label && <p className="mt-1 text-body-sm font-semibold text-ink">{label}</p>}
    </div>
  );
}
