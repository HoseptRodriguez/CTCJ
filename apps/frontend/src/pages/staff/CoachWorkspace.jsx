import { RESERVATION_TYPE } from '@ctcj/shared';
import { useState } from 'react';

import { bookingClient } from '../../api/bookingClient.js';
import { coachingClient } from '../../api/coachingClient.js';
import { SkillRadar } from '../../components/charts/SkillRadar.jsx';
import { InfoIcon } from '../../components/icons/InfoIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { cn } from '../../components/ui/cn.js';
import { RadioCards, SelectField, TextAreaField } from '../../components/ui/Field.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { clubTodayKey } from '../../lib/clubTime.js';
import { describeCoachingError } from '../../lib/coachingErrorMessages.js';
import { formatTime } from '../../lib/format.js';
import { compareWithPast, SKILL_AREAS } from '../../lib/performance.js';
import { AREA_LABELS, describeArea } from '../../lib/performanceRatingLabels.js';
import { useAsync } from '../../lib/useAsync.js';
import { DATE_MEDIUM, NOTE_TYPE_LABELS, SectionCard } from '../mictcj/shared.jsx';

import { PlayerPicker } from './PlayerPicker.jsx';
import { useSelectedPlayer } from './staffShared.jsx';

const VISIBILITY_OPTIONS = [
  {
    value: 'PLAYER_VISIBLE',
    label: 'La ve el jugador',
    description: 'Aparece en Mi CTCJ del jugador.',
  },
  { value: 'PRIVATE', label: 'Solo entrenadores', description: 'El jugador nunca la ve.' },
];
const VISIBILITY_LABELS = { PLAYER_VISIBLE: 'La ve el jugador', PRIVATE: 'Solo entrenadores' };

// ---------------------------------------------------------------------------

export function TodayClasses() {
  const today = clubTodayKey();
  const schedule = useAsync(() => bookingClient.getSchedule(today), [today]);
  const classes = (d) =>
    d.reservations
      .filter((r) => r.reservationType === RESERVATION_TYPE.CLASS || r.label === 'Clase')
      .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));
  const courtName = (d, id) => d.courts.find((c) => c.id === id)?.name ?? 'Cancha';

  return (
    <SectionCard
      title="Clases de hoy"
      async={schedule}
      isEmpty={(d) => classes(d).length === 0}
      empty={{ title: 'No hay clases programadas hoy' }}
    >
      {(d) => (
        <ul className="space-y-2">
          {classes(d).map((c, i) => (
            <li
              key={c.id ?? `${c.courtId}-${i}`}
              className="flex items-center gap-3 rounded-lg bg-page p-3"
            >
              <span className="rounded-md bg-navy-400 px-2 py-1 text-body-sm font-bold text-white">
                {formatTime(c.periodStart)}
              </span>
              <span className="text-body text-ink">
                {courtName(d, c.courtId)} · hasta {formatTime(c.periodEnd)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

function NoteItem({ note }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-navy-50 px-3 py-1 text-body-sm font-bold text-navy-500">
          {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType}
        </span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-body-sm font-semibold',
            note.visibility === 'PRIVATE'
              ? 'bg-status-suspended-bg text-status-suspended-fg'
              : 'bg-status-ok-bg text-status-ok-fg',
          )}
        >
          {VISIBILITY_LABELS[note.visibility] ?? note.visibility}
        </span>
        {note.area && (
          <span className="text-body-sm font-semibold text-ink-soft">
            {describeArea(note.area)}
          </span>
        )}
        <span className="ml-auto text-body-sm text-ink-soft">
          {DATE_MEDIUM.format(new Date(note.createdAt))}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-line text-body text-ink">{note.content}</p>
    </li>
  );
}

function NewNoteForm({ playerId, onSaved }) {
  const toast = useToast();
  const [noteType, setNoteType] = useState('TRAINING');
  const [visibility, setVisibility] = useState(null);
  const [area, setArea] = useState('');
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
      const note = await coachingClient.createNote(playerId, {
        noteType,
        visibility,
        content: content.trim(),
        area: area || undefined,
      });
      setContent('');
      setArea('');
      setVisibility(null);
      toast({ title: 'Nota guardada', tone: 'success' });
      onSaved(note);
    } catch (err) {
      setError(describeCoachingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset>
        <legend className="mb-2 text-body font-semibold text-ink">Tipo de nota</legend>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => {
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
                  name="tipo-nota"
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

      <SelectField
        label="Habilidad (opcional)"
        value={area}
        onChange={(e) => setArea(e.target.value)}
        options={[
          { value: '', label: 'Sin habilidad específica' },
          ...SKILL_AREAS.map((a) => ({ value: a, label: AREA_LABELS[a] })),
        ]}
      />

      <TextAreaField
        label="Nota"
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={5000}
        hint="Escribe con claridad: qué viste y qué debe trabajar."
      />

      <RadioCards
        legend="¿Quién la puede ver?"
        name="visibilidad"
        options={VISIBILITY_OPTIONS}
        value={visibility}
        onChange={setVisibility}
      />

      <p className="flex items-start gap-3 rounded-lg bg-amber-soft p-4 text-body font-semibold text-amber-dark">
        <InfoIcon className="mt-0.5 h-6 w-6 shrink-0" />
        Las notas no se pueden editar después de guardarlas.
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-status-overdue-bg p-3 text-body font-semibold text-status-overdue-fg"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={saving} loadingText="Guardando nota…">
        Guardar nota
      </Button>
    </form>
  );
}

function NotesTab({ playerId }) {
  const notes = useAsync(
    () => coachingClient.listPlayerNotes(playerId).then((d) => d.notes),
    [playerId],
  );
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Nueva nota" headingLevel={3}>
        <NewNoteForm
          playerId={playerId}
          onSaved={(note) =>
            note?.id ? notes.setData((list) => [note, ...(list ?? [])]) : notes.reload()
          }
        />
      </Card>
      <SectionCard
        title="Notas anteriores"
        async={notes}
        isEmpty={(d) => d.length === 0}
        empty={{
          title: 'Todavía no hay notas',
          description: 'La primera nota que guardes aparecerá aquí.',
        }}
      >
        {(list) => (
          <ul className="space-y-3">
            {[...list]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((n) => (
                <NoteItem key={n.id} note={n} />
              ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------

function RatingRow({ area, value, last, onChange }) {
  const labelId = `calif-${area}`;
  function onKeyDown(e) {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = Math.min(10, Math.max(1, (value ?? last ?? 5) + step));
    onChange(next);
    e.currentTarget.querySelector(`[data-n="${next}"]`)?.focus();
  }
  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0 lg:flex-row lg:items-center">
      <div className="lg:w-44">
        <p id={labelId} className="text-lead font-bold text-ink">
          {AREA_LABELS[area]}
        </p>
        <p className="text-body-sm text-ink-soft">
          {last != null ? `Última: ${last}` : 'Sin calificar'}
        </p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1.5"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const checked = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${n} de 10`}
              data-n={n}
              tabIndex={checked || (value == null && n === 1) ? 0 : -1}
              onClick={() => onChange(checked ? null : n)}
              className={cn(
                'focus-ring h-11 w-11 rounded-lg border-2 text-body font-bold',
                checked
                  ? 'border-navy-500 bg-lime text-navy-500'
                  : 'border-line-strong bg-surface text-ink hover:bg-page',
                !checked && last === n && 'border-navy-400 border-dashed',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PerformanceTab({ playerId }) {
  const toast = useToast();
  const perf = useAsync(() => coachingClient.listPlayerPerformance(playerId), [playerId]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const comparison = perf.data ? compareWithPast(perf.data.ratings) : null;
  const chosen = Object.entries(values).filter(([, v]) => v != null);

  async function save() {
    if (chosen.length === 0) return setError('Califica al menos una habilidad.');
    setSaving(true);
    setError(null);
    try {
      await coachingClient.recordPerformanceSnapshot(playerId, Object.fromEntries(chosen));
      setValues({});
      toast({
        title: 'Calificación guardada',
        description: `${chosen.length} de 10 habilidades.`,
        tone: 'success',
      });
      perf.reload();
    } catch (err) {
      setError(describeCoachingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <Card
        title="Calificar habilidades"
        headingLevel={3}
        description="De 1 a 10. Califica solo las que evaluaste hoy."
      >
        {SKILL_AREAS.map((area) => (
          <RatingRow
            key={area}
            area={area}
            value={values[area] ?? null}
            last={comparison?.[area]?.now ?? null}
            onChange={(v) => {
              setValues((prev) => ({ ...prev, [area]: v }));
              setError(null);
            }}
          />
        ))}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-status-overdue-bg p-3 text-body font-semibold text-status-overdue-fg"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button size="lg" loading={saving} loadingText="Guardando…" onClick={save}>
            Guardar calificación
          </Button>
          <p className="text-body text-ink-soft" aria-live="polite">
            {chosen.length === 0 ? 'Nada calificado todavía' : `${chosen.length} de 10 calificadas`}
          </p>
        </div>
      </Card>
      <SectionCard
        title="Cómo va"
        description="Hoy y hace 3 meses."
        async={perf}
        isEmpty={(d) => d.ratings.length === 0}
        empty={{ title: 'Sin calificaciones todavía' }}
      >
        {() => <SkillRadar comparison={comparison} />}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function PlayerWorkspace({ player, onClear }) {
  const [tab, setTab] = useState('notas');
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy-500 p-5 text-white md:p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white font-display text-h2 font-bold text-navy-500"
          >
            {player.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-body text-white/90">Jugador</p>
            <h2 className="font-display text-h2 font-bold">{player.name}</h2>
          </div>
        </div>
        <Button variant="secondary" tone="dark" onClick={onClear}>
          Cambiar de jugador
        </Button>
      </div>
      <Tabs
        label={`Seguimiento de ${player.name}`}
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'notas',
            label: 'Notas',
            content: <NotesTab key={player.id} playerId={player.id} />,
          },
          {
            id: 'rendimiento',
            label: 'Rendimiento',
            content: <PerformanceTab key={player.id} playerId={player.id} />,
          },
        ]}
      />
    </div>
  );
}

/**
 * Coach workspace (spec H): a side column with today's classes and the
 * player search; the chosen player's blue card with Notas / Rendimiento.
 */
export function CoachWorkspace({ aside, empty }) {
  const [player, select] = useSelectedPlayer();
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <aside className="space-y-6" aria-label="Clases y búsqueda">
        <Card title="Buscar jugador" headingLevel={2}>
          <PlayerPicker label="Nombre o correo del jugador" onSelect={select} />
        </Card>
        {aside}
      </aside>
      <div className="min-w-0">
        {player ? (
          <PlayerWorkspace key={player.id} player={player} onClear={() => select(null)} />
        ) : (
          empty
        )}
      </div>
    </div>
  );
}
