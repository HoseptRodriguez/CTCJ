import { useState } from 'react';

import { clinicalClient } from '../../api/clinicalClient.js';
import { InfoIcon } from '../../components/icons/InfoIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { cn } from '../../components/ui/cn.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { RadioCards, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeClinicalError } from '../../lib/clinicalErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  CLINICAL_NOTE_TYPE_LABELS,
  DATE_MEDIUM,
  MEDICAL_HISTORY_STATUS_LABELS,
  RECOVERY_PLAN_STATUS_LABELS,
  SectionCard,
} from '../mictcj/shared.jsx';

import { ReasonDialog as BaseReasonDialog } from './staffShared.jsx';

/** ReasonDialog with clinical error messages. */
export function ReasonDialog(props) {
  return <BaseReasonDialog describeError={describeClinicalError} {...props} />;
}

export const DISCIPLINE_LABELS = { PSYCHOLOGY: 'Psicología', PHYSIOTHERAPY: 'Fisioterapia' };

const visibilityOptions = (discipline) => [
  {
    value: 'PLAYER_VISIBLE',
    label: 'La ve el jugador',
    description: 'Aparece en Mi CTCJ del jugador.',
  },
  {
    value: 'PRIVATE',
    label: `Solo ${discipline === 'PHYSIOTHERAPY' ? 'fisioterapia' : 'psicología'}`,
    description: 'Nadie más la ve: ni el jugador, ni entrenadores, ni administración.',
  },
];
const VISIBILITY_SHORT = { PLAYER_VISIBLE: 'La ve el jugador', PRIVATE: 'Privada' };

function VisibilityPill({ value }) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-body-sm font-semibold',
        value === 'PRIVATE'
          ? 'bg-status-suspended-bg text-status-suspended-fg'
          : 'bg-status-ok-bg text-status-ok-fg',
      )}
    >
      {VISIBILITY_SHORT[value] ?? value}
    </span>
  );
}

function FormError({ error }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-status-overdue-bg p-3 text-body font-semibold text-status-overdue-fg"
    >
      {error}
    </p>
  );
}

function NoEditNotice({ children = 'Lo que guardes aquí no se puede editar después.' }) {
  return (
    <p className="flex items-start gap-3 rounded-lg bg-amber-soft p-4 text-body font-semibold text-amber-dark">
      <InfoIcon className="mt-0.5 h-6 w-6 shrink-0" />
      {children}
    </p>
  );
}

// --- Notes -----------------------------------------------------------------

function NoteForm({ playerId, discipline, onSaved }) {
  const toast = useToast();
  const [noteType, setNoteType] = useState('SESSION_NOTE');
  const [visibility, setVisibility] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return setError('Escribe la nota.');
    if (!visibility) return setError('Elige quién puede ver la nota.');
    setSaving(true);
    setError(null);
    try {
      const note = await clinicalClient.createNote(playerId, {
        noteType,
        visibility,
        content: content.trim(),
      });
      setContent('');
      setVisibility(null);
      toast({ title: 'Nota guardada', tone: 'success' });
      onSaved(note);
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset>
        <legend className="mb-2 text-body font-semibold text-ink">Tipo de nota</legend>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(CLINICAL_NOTE_TYPE_LABELS).map(([value, label]) => {
            const checked = noteType === value;
            return (
              <label
                key={value}
                className={cn(
                  'flex min-h-btn-lg cursor-pointer items-center justify-center rounded-lg border-2 px-3 text-center text-body font-semibold has-[:focus-visible]:shadow-focus',
                  checked
                    ? 'border-navy-500 bg-lime text-navy-500'
                    : 'border-line-strong bg-surface text-ink hover:bg-page',
                )}
              >
                <input
                  type="radio"
                  name="tipo-nota-clinica"
                  value={value}
                  checked={checked}
                  onChange={() => setNoteType(value)}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <TextAreaField
        label="Nota"
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={5000}
      />
      <RadioCards
        legend="¿Quién la puede ver?"
        name="visibilidad-clinica"
        options={visibilityOptions(discipline)}
        value={visibility}
        onChange={setVisibility}
      />
      <NoEditNotice>Las notas no se pueden editar después de guardarlas.</NoEditNotice>
      <FormError error={error} />
      <Button type="submit" size="lg" loading={saving} loadingText="Guardando nota…">
        Guardar nota
      </Button>
    </form>
  );
}

function NotesTab({ playerId, discipline }) {
  const notes = useAsync(
    () => clinicalClient.listPlayerNotes(playerId).then((d) => d.notes),
    [playerId],
  );
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Nueva nota" headingLevel={3}>
        <NoteForm
          playerId={playerId}
          discipline={discipline}
          onSaved={(n) => (n?.id ? notes.setData((l) => [n, ...(l ?? [])]) : notes.reload())}
        />
      </Card>
      <SectionCard
        title="Notas anteriores"
        async={notes}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'Todavía no hay notas de tu disciplina' }}
      >
        {(list) => (
          <ul className="space-y-3">
            {[...list]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((n) => (
                <li key={n.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-navy-50 px-3 py-1 text-body-sm font-bold text-navy-500">
                      {CLINICAL_NOTE_TYPE_LABELS[n.noteType] ?? n.noteType}
                    </span>
                    <VisibilityPill value={n.visibility} />
                    <span className="ml-auto text-body-sm text-ink-soft">
                      {DATE_MEDIUM.format(new Date(n.createdAt))}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-body text-ink">{n.content}</p>
                </li>
              ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

// --- Recovery plans (physiotherapy) ----------------------------------------

function PlanForm({ playerId, onSaved }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [visibility, setVisibility] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return setError('Escribe el nombre del plan.');
    if (!visibility) return setError('Elige quién puede ver el plan.');
    setSaving(true);
    setError(null);
    try {
      await clinicalClient.createRecoveryPlan(playerId, {
        title: title.trim(),
        goal: goal.trim() || undefined,
        visibility,
      });
      setTitle('');
      setGoal('');
      setVisibility(null);
      toast({ title: 'Plan creado', tone: 'success' });
      onSaved();
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <TextField
        label="Nombre del plan"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        hint="Ejemplo: Recuperación de tobillo derecho"
      />
      <TextAreaField
        label="Objetivo (opcional)"
        rows={3}
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        maxLength={2000}
      />
      <RadioCards
        legend="¿Quién lo puede ver?"
        name="visibilidad-plan"
        options={visibilityOptions('PHYSIOTHERAPY')}
        value={visibility}
        onChange={setVisibility}
      />
      <FormError error={error} />
      <Button type="submit" size="lg" loading={saving} loadingText="Creando plan…">
        Crear plan
      </Button>
    </form>
  );
}

function PlansTab({ playerId }) {
  const toast = useToast();
  const plans = useAsync(
    () => clinicalClient.listRecoveryPlans(playerId).then((d) => d.plans),
    [playerId],
  );
  const [confirming, setConfirming] = useState(null); // { plan, action: 'complete'|'discontinue' }
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);
    try {
      await clinicalClient.completeRecoveryPlan(confirming.plan.id);
      toast({ title: 'Plan completado', tone: 'success' });
      setConfirming(null);
      plans.reload();
    } catch (err) {
      toast({
        title: 'No pudimos completar el plan',
        description: describeClinicalError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Nuevo plan de recuperación" headingLevel={3}>
        <PlanForm playerId={playerId} onSaved={plans.reload} />
      </Card>
      <SectionCard
        title="Planes"
        async={plans}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'Sin planes de recuperación' }}
      >
        {(list) => (
          <ul className="space-y-3">
            {list.map((p) => (
              <li key={p.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lead font-bold text-ink">{p.title}</p>
                  <span className="rounded-full bg-navy-50 px-3 py-1 text-body-sm font-bold text-navy-500">
                    {RECOVERY_PLAN_STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  <VisibilityPill value={p.visibility} />
                </div>
                {p.goal && <p className="mt-2 text-body text-ink">{p.goal}</p>}
                {p.discontinueReason && (
                  <p className="mt-2 text-body text-ink-soft">Motivo: {p.discontinueReason}</p>
                )}
                {p.status === 'ACTIVE' && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirming({ plan: p, action: 'complete' })}
                    >
                      Marcar completado
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirming({ plan: p, action: 'discontinue' })}
                    >
                      Interrumpir
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <ConfirmDialog
        open={confirming?.action === 'complete'}
        tone="primary"
        title="¿Marcar el plan como completado?"
        description={`“${confirming?.plan.title ?? ''}” quedará cerrado y no se podrá reabrir.`}
        confirmLabel="Sí, completar plan"
        loading={busy}
        onConfirm={complete}
        onCancel={() => setConfirming(null)}
      />
      <ReasonDialog
        open={confirming?.action === 'discontinue'}
        title="¿Interrumpir el plan?"
        description={`“${confirming?.plan.title ?? ''}” quedará interrumpido y no se podrá reabrir.`}
        confirmLabel="Sí, interrumpir plan"
        onConfirm={async (reason) => {
          await clinicalClient.discontinueRecoveryPlan(confirming.plan.id, reason);
          toast({ title: 'Plan interrumpido', tone: 'success' });
          setConfirming(null);
          plans.reload();
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

// --- Medical history (physiotherapy) ---------------------------------------

function HistoryForm({ playerId, onSaved }) {
  const toast = useToast();
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [visibility, setVisibility] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!condition.trim()) return setError('Escribe la condición.');
    if (!visibility) return setError('Elige quién puede ver el registro.');
    setSaving(true);
    setError(null);
    try {
      await clinicalClient.createMedicalHistoryEntry(playerId, {
        condition: condition.trim(),
        description: description.trim() || undefined,
        visibility,
        occurredAt: occurredAt || undefined,
      });
      setCondition('');
      setDescription('');
      setOccurredAt('');
      setVisibility(null);
      toast({ title: 'Registro guardado', tone: 'success' });
      onSaved();
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <TextField
        label="Condición"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        maxLength={200}
        hint="Ejemplo: Esguince de tobillo"
      />
      <TextField
        label="Fecha (opcional)"
        type="date"
        value={occurredAt}
        onChange={(e) => setOccurredAt(e.target.value)}
      />
      <TextAreaField
        label="Descripción (opcional)"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
      />
      <RadioCards
        legend="¿Quién lo puede ver?"
        name="visibilidad-historial"
        options={visibilityOptions('PHYSIOTHERAPY')}
        value={visibility}
        onChange={setVisibility}
      />
      <FormError error={error} />
      <Button type="submit" size="lg" loading={saving} loadingText="Guardando…">
        Guardar registro
      </Button>
    </form>
  );
}

function HistoryTab({ playerId }) {
  const toast = useToast();
  const entries = useAsync(
    () => clinicalClient.listMedicalHistory(playerId).then((d) => d.entries),
    [playerId],
  );
  const [resolving, setResolving] = useState(null);
  const [busy, setBusy] = useState(false);

  async function resolve() {
    setBusy(true);
    try {
      await clinicalClient.resolveMedicalHistoryEntry(resolving.id);
      toast({ title: 'Marcado como resuelto', tone: 'success' });
      setResolving(null);
      entries.reload();
    } catch (err) {
      toast({
        title: 'No pudimos guardar el cambio',
        description: describeClinicalError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Nuevo registro" headingLevel={3}>
        <HistoryForm playerId={playerId} onSaved={entries.reload} />
      </Card>
      <SectionCard
        title="Historial"
        async={entries}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'Sin registros en el historial' }}
      >
        {(list) => (
          <ul className="space-y-3">
            {list.map((e) => (
              <li key={e.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lead font-bold text-ink">{e.condition}</p>
                  <span className="rounded-full bg-navy-50 px-3 py-1 text-body-sm font-bold text-navy-500">
                    {MEDICAL_HISTORY_STATUS_LABELS[e.status] ?? e.status}
                  </span>
                  <VisibilityPill value={e.visibility} />
                </div>
                {e.occurredAt && (
                  <p className="mt-1 text-body-sm text-ink-soft">
                    {DATE_MEDIUM.format(new Date(e.occurredAt))}
                  </p>
                )}
                {e.description && <p className="mt-2 text-body text-ink">{e.description}</p>}
                {e.status === 'ACTIVE' && (
                  <Button variant="secondary" className="mt-4" onClick={() => setResolving(e)}>
                    Marcar resuelto
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <ConfirmDialog
        open={resolving != null}
        tone="primary"
        title="¿Marcar como resuelto?"
        description={`“${resolving?.condition ?? ''}” pasará a resuelto. No se puede deshacer.`}
        confirmLabel="Sí, marcar resuelto"
        loading={busy}
        onConfirm={resolve}
        onCancel={() => setResolving(null)}
      />
    </div>
  );
}

/** Tabs for one player, for practitioners only (notes are never shown to admin/front desk). */
export function clinicalRecordTabs({ playerId, discipline, appointmentsTab }) {
  const tabs = [
    { id: 'citas', label: 'Citas', content: appointmentsTab },
    {
      id: 'notas',
      label: 'Notas',
      content: <NotesTab key={playerId} playerId={playerId} discipline={discipline} />,
    },
  ];
  if (discipline === 'PHYSIOTHERAPY') {
    tabs.push(
      {
        id: 'planes',
        label: 'Planes de recuperación',
        content: <PlansTab key={playerId} playerId={playerId} />,
      },
      {
        id: 'historial',
        label: 'Historial médico',
        content: <HistoryTab key={playerId} playerId={playerId} />,
      },
    );
  }
  return tabs;
}

export { NoEditNotice };
