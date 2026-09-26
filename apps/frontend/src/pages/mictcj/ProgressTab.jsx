import { useState } from 'react';

import { clinicalClient } from '../../api/clinicalClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { goalsClient } from '../../api/goalsClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { LockIcon } from '../../components/icons/LockIcon.jsx';
import { PlusIcon } from '../../components/icons/PlusIcon.jsx';
import { TrophyIcon } from '../../components/icons/TrophyIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { SelectField, TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PerformanceLineChart } from '../../components/ui/PerformanceLineChart.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { cn } from '../../components/ui/cn.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { describeGoalsError } from '../../lib/goalsErrorMessages.js';
import { AREA_LABELS } from '../../lib/performanceRatingLabels.js';
import { useAsync } from '../../lib/useAsync.js';

import { PerformanceCard, goalProgressLabel } from './homeSections.jsx';
import {
  APPOINTMENT_STATUS_LABELS,
  CATEGORY_LABELS,
  CLINICAL_NOTE_TYPE_LABELS,
  DATE_MEDIUM,
  DATE_TIME_MEDIUM,
  GOAL_METRIC_LABELS,
  GOAL_STATUS_LABELS,
  MEDICAL_HISTORY_STATUS_LABELS,
  MODALITY_LABELS,
  NOTE_TYPE_LABELS,
  ProgressBar,
  RECOVERY_PLAN_STATUS_LABELS,
  SectionCard,
} from './shared.jsx';

const GOAL_STATUS_BADGE = { ACTIVE: 'pendiente', ACHIEVED: 'al-dia', ABANDONED: 'suspendida' };
const APPOINTMENT_BADGE = {
  SCHEDULED: 'pendiente',
  COMPLETED: 'al-dia',
  CANCELLED: 'suspendida',
  NO_SHOW: 'vencida',
};
const PLAN_BADGE = { ACTIVE: 'pendiente', COMPLETED: 'al-dia', DISCONTINUED: 'suspendida' };

/** Mi CTCJ → Mi progreso. */
export function ProgressTab() {
  useDocumentTitle('Mi progreso');
  // One request feeds both the radar and the over-time chart.
  const perf = useAsync(() => coachingClient.getMyPerformance(), []);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi progreso"
        description="Tus metas, tu rendimiento, tus logros y tu salud, en un solo lugar."
        className="mb-0 md:mb-0"
      />
      <GoalsManager />
      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceCard perf={perf} />
        <PerformanceHistory perf={perf} />
      </div>
      <CoachNotesList />
      <Achievements />
      <HealthSection />
    </div>
  );
}

function CreateGoalForm({ onCreated }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [metricType, setMetricType] = useState('CUSTOM');
  const [targetArea, setTargetArea] = useState('SERVE');
  const [targetValue, setTargetValue] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [targetModality, setTargetModality] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const needsTargetValue = metricType !== 'CUSTOM';
  const canScopeCategory = metricType === 'MATCH_WINS' || metricType === 'RANKING_POSITION';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Escribe un nombre para la meta, por ejemplo “Mejorar mi saque”.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await goalsClient.createGoal({
        title: title.trim(),
        metricType,
        targetArea: metricType === 'SKILL_RATING' ? targetArea : undefined,
        targetValue: targetValue !== '' ? Number(targetValue) : undefined,
        targetCategory: targetCategory || undefined,
        targetModality: targetModality || undefined,
      });
      setTitle('');
      setTargetValue('');
      setTargetCategory('');
      setTargetModality('');
      toast({ title: 'Meta creada' });
      await onCreated();
    } catch (err) {
      setError(describeGoalsError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-xl bg-page p-5">
      <h3 className="font-display text-h3 font-bold text-ink">Nueva meta</h3>
      <TextField
        label="Nombre de la meta"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ej: Mejorar mi saque"
        error={error}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Tipo de meta"
          value={metricType}
          onChange={(e) => setMetricType(e.target.value)}
          options={Object.entries(GOAL_METRIC_LABELS).map(([value, label]) => ({ value, label }))}
        />
        {metricType === 'SKILL_RATING' && (
          <SelectField
            label="Habilidad"
            value={targetArea}
            onChange={(e) => setTargetArea(e.target.value)}
            options={Object.entries(AREA_LABELS).map(([value, label]) => ({ value, label }))}
          />
        )}
        {needsTargetValue && (
          <TextField
            label={
              metricType === 'SKILL_RATING' ? 'Calificación objetivo (1 a 10)' : 'Cantidad objetivo'
            }
            type="number"
            inputMode="numeric"
            min="1"
            max={metricType === 'SKILL_RATING' ? 10 : 1000}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        )}
        {canScopeCategory && (
          <>
            <SelectField
              label="Categoría (opcional)"
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              options={[
                { value: '', label: 'Todas' },
                ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <SelectField
              label="Modalidad (opcional)"
              value={targetModality}
              onChange={(e) => setTargetModality(e.target.value)}
              options={[
                { value: '', label: 'Todas' },
                ...Object.entries(MODALITY_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </>
        )}
      </div>
      <Button type="submit" icon={<PlusIcon />} loading={submitting} loadingText="Creando…">
        Agregar meta
      </Button>
    </form>
  );
}

function GoalsManager() {
  const toast = useToast();
  const goals = useAsync(() => goalsClient.getMyGoals().then((d) => d.goals), []);
  const [abandoning, setAbandoning] = useState(null);
  const [busy, setBusy] = useState(false);

  async function confirmAbandon() {
    setBusy(true);
    try {
      await goalsClient.abandonGoal(abandoning.id);
      setAbandoning(null);
      toast({ title: 'Meta abandonada' });
      goals.reload();
    } catch (err) {
      setAbandoning(null);
      toast({
        title: 'No se pudo abandonar la meta',
        description: describeGoalsError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard
      title="Mis metas"
      description="Las metas conectadas a tus partidos, entrenamientos o evaluaciones se actualizan solas."
      async={goals}
    >
      {(list) => (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          {list.length === 0 ? (
            <p className="text-body text-ink-soft">
              Aún no tienes metas. Crea la primera con el formulario.
            </p>
          ) : (
            <ul className="space-y-4">
              {list.map((goal) => (
                <li key={goal.id} className="rounded-xl border-2 border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lead font-semibold text-ink">{goal.title}</p>
                      <p className="text-body-sm text-ink-soft">
                        {GOAL_METRIC_LABELS[goal.metricType] ?? goal.metricType}
                      </p>
                    </div>
                    <StatusBadge
                      status={GOAL_STATUS_BADGE[goal.status] ?? 'suspendida'}
                      label={GOAL_STATUS_LABELS[goal.status] ?? goal.status}
                    />
                  </div>
                  <div className="mt-3">
                    {goal.percentComplete != null ? (
                      <ProgressBar percent={goal.percentComplete} label={goalProgressLabel(goal)} />
                    ) : (
                      <p className="text-body-sm text-ink-soft">{goalProgressLabel(goal)}</p>
                    )}
                  </div>
                  {goal.status === 'ACTIVE' && (
                    <Button variant="ghost" className="mt-2" onClick={() => setAbandoning(goal)}>
                      Abandonar meta
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <CreateGoalForm onCreated={goals.reload} />
          <ConfirmDialog
            open={abandoning != null}
            title="¿Abandonar esta meta?"
            description={
              abandoning ? `“${abandoning.title}” dejará de seguirse. No se puede deshacer.` : ''
            }
            confirmLabel="Sí, abandonar meta"
            loading={busy}
            onConfirm={confirmAbandon}
            onCancel={() => setAbandoning(null)}
          />
        </div>
      )}
    </SectionCard>
  );
}

function PerformanceHistory({ perf }) {
  return (
    <SectionCard
      title="Tu progreso en el tiempo"
      async={perf}
      isEmpty={(d) => Object.keys(d.summary.progressByArea).length === 0}
      empty={{
        title: 'Todavía no hay una segunda evaluación',
        description:
          'Cuando tu entrenador te califique de nuevo una habilidad, verás aquí cómo cambió.',
      }}
    >
      {(d) => <PerformanceLineChart ratings={d.ratings} />}
    </SectionCard>
  );
}

function CoachNotesList() {
  const notes = useAsync(() => coachingClient.getMyNotes().then((d) => d.notes), []);
  return (
    <SectionCard
      title="Notas de tu entrenador"
      description="Notas de entrenamiento y recomendaciones que tu entrenador compartió contigo."
      async={notes}
      isEmpty={(list) => list.length === 0}
      empty={{
        title: 'Todavía no hay notas',
        description: 'Cuando tu entrenador comparta una nota, aparecerá aquí.',
      }}
    >
      {(list) => (
        <ul className="space-y-3">
          {[...list]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((note) => (
              <li key={note.id} className="rounded-lg border-l-8 border-lime bg-page p-4">
                <p className="text-body-sm font-semibold text-ink-soft">
                  {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType} ·{' '}
                  {DATE_MEDIUM.format(new Date(note.createdAt))}
                </p>
                <p className="mt-1 text-body text-ink">{note.content}</p>
              </li>
            ))}
        </ul>
      )}
    </SectionCard>
  );
}

function Achievements() {
  const badges = useAsync(() => membershipClient.getMyAchievements().then((d) => d.badges), []);
  return (
    <SectionCard
      title="Logros"
      async={badges}
      isEmpty={(list) => list.length === 0}
      empty={{ title: 'Sin logros por ahora' }}
    >
      {(list) => (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {list.map((badge) => (
            <li
              key={badge.code}
              className={cn(
                'flex min-h-[8rem] flex-col items-center justify-center rounded-xl border-2 p-4 text-center',
                badge.earned
                  ? 'border-status-ok-fg bg-status-ok-bg'
                  : 'border-dashed border-line-strong bg-surface',
              )}
            >
              <TrophyIcon
                className={cn('h-8 w-8', badge.earned ? 'text-status-ok-fg' : 'text-ink-soft')}
              />
              <p className="mt-2 text-body font-semibold text-ink">{badge.label}</p>
              <p className="text-body-sm text-ink-soft">
                {badge.earned ? 'Obtenido' : 'Pendiente'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function HealthSection() {
  const appointments = useAsync(
    () => clinicalClient.getMyAppointments().then((d) => d.appointments),
    [],
  );
  const notes = useAsync(() => clinicalClient.getMyNotes().then((d) => d.notes), []);
  const plans = useAsync(() => clinicalClient.getMyRecoveryPlans().then((d) => d.plans), []);
  const history = useAsync(() => clinicalClient.getMyMedicalHistory().then((d) => d.entries), []);

  return (
    <section aria-labelledby="salud-title" className="space-y-6">
      <div>
        <h2 id="salud-title" className="font-display text-h2 font-bold text-ink">
          Salud y bienestar
        </h2>
        <p className="mt-1 flex items-center gap-2 text-body text-ink-soft">
          <LockIcon className="h-5 w-5 shrink-0" /> Solo tú y tu equipo de salud ven esta
          información.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Mis citas"
          description="Psicología, neuropsicología y fisioterapia."
          async={appointments}
          isEmpty={(list) => list.length === 0}
          empty={{
            title: 'No tienes citas',
            description: 'Las citas que te agenden aparecerán aquí.',
          }}
        >
          {(list) => (
            <ul className="space-y-3">
              {list.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-page p-3"
                >
                  <span className="text-body text-ink">
                    <strong>{a.practitionerName ?? 'Profesional'}</strong> ·{' '}
                    {DATE_TIME_MEDIUM.format(new Date(a.periodStart))}
                  </span>
                  <StatusBadge
                    status={APPOINTMENT_BADGE[a.status] ?? 'suspendida'}
                    label={APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Notas de psicología y fisioterapia"
          async={notes}
          isEmpty={(list) => list.length === 0}
          empty={{
            title: 'Sin notas compartidas',
            description: 'Las notas que tu equipo de salud comparta contigo aparecerán aquí.',
          }}
        >
          {(list) => (
            <ul className="space-y-3">
              {list.map((n) => (
                <li key={n.id} className="rounded-lg bg-page p-3">
                  <p className="text-body-sm font-semibold text-ink-soft">
                    {CLINICAL_NOTE_TYPE_LABELS[n.noteType] ?? n.noteType} ·{' '}
                    {DATE_MEDIUM.format(new Date(n.createdAt))}
                  </p>
                  <p className="mt-1 text-body text-ink">{n.content}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Mis planes de recuperación"
          async={plans}
          isEmpty={(list) => list.length === 0}
          empty={{
            title: 'Sin planes de recuperación',
            description: 'Si tu fisioterapeuta te asigna uno, lo verás aquí.',
          }}
        >
          {(list) => (
            <ul className="space-y-3">
              {list.map((p) => (
                <li key={p.id} className="rounded-lg bg-page p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-body font-semibold text-ink">{p.title}</p>
                    <StatusBadge
                      status={PLAN_BADGE[p.status] ?? 'suspendida'}
                      label={RECOVERY_PLAN_STATUS_LABELS[p.status] ?? p.status}
                    />
                  </div>
                  {p.goal && <p className="mt-1 text-body text-ink-soft">{p.goal}</p>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Mi historial médico"
          async={history}
          isEmpty={(list) => list.length === 0}
          empty={{
            title: 'Sin historial registrado',
            description: 'Lo que tu fisioterapeuta registre aparecerá aquí.',
          }}
        >
          {(list) => (
            <ul className="space-y-3">
              {list.map((e) => (
                <li key={e.id} className="rounded-lg bg-page p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-body font-semibold text-ink">{e.condition}</p>
                    <StatusBadge
                      status={e.status === 'RESOLVED' ? 'al-dia' : 'pendiente'}
                      label={MEDICAL_HISTORY_STATUS_LABELS[e.status] ?? e.status}
                    />
                  </div>
                  {e.description && <p className="mt-1 text-body text-ink-soft">{e.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </section>
  );
}
