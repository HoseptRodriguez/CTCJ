import { useState } from 'react';

import { clinicalClient } from '../../api/clinicalClient.js';
import { LockIcon } from '../../components/icons/LockIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { cn } from '../../components/ui/cn.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { RadioCards, TextField } from '../../components/ui/Field.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeClinicalError } from '../../lib/clinicalErrorMessages.js';
import { clubTodayKey } from '../../lib/clubTime.js';
import { formatDayShort, formatTime } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  APPOINTMENT_STATUS_LABELS,
  CLINICAL_NOTE_TYPE_LABELS,
  DATE_MEDIUM,
  SectionCard,
} from '../mictcj/shared.jsx';

import { FormAlert } from './staffShared.jsx';

// "15 de enero de 2099": clearer than 15/01/2099. A date-only key is read at
// noon UTC so it never shifts a day.
const LONG_DATE = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateOnly = (key) => LONG_DATE.format(new Date(`${key}T12:00:00Z`));

/** "Apto para jugar" / "No apto para jugar hasta 10 oct 2026". */
export function FitnessBadge({ fitness }) {
  if (!fitness) return <StatusBadge status="suspendida" label="Sin evaluación de fisioterapia" />;
  if (fitness.status === 'FIT') return <StatusBadge status="al-dia" label="Apto para jugar" />;
  return (
    <StatusBadge
      status="vencida"
      label={
        fitness.unfitUntil
          ? `No apto para jugar hasta el ${dateOnly(fitness.unfitUntil)}`
          : 'No apto para jugar hasta nuevo aviso'
      }
    />
  );
}

/**
 * Operational summary of a player's physiotherapy: no diagnosis, no plan
 * titles, no note text -- that is enforced by the server, which never
 * sends it here.
 */
export function PhysioSummaryCard({ playerId, version = 0 }) {
  const summary = useAsync(() => clinicalClient.getPhysioSummary(playerId), [playerId, version]);
  return (
    <SectionCard
      title="Resumen de fisioterapia"
      description="Solo datos de agenda y del estado para jugar. Nunca diagnósticos ni notas."
      async={summary}
      errorTitle="No pudimos cargar el resumen de fisioterapia"
    >
      {(s) => (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <FitnessBadge fitness={s.fitness} />
            {s.fitness && (
              <span className="text-body-sm text-ink-soft">
                Marcado el {formatDayShort(s.fitness.recordedAt)}
              </span>
            )}
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-page p-4">
              <dt className="text-body-sm font-semibold text-ink-soft">Plan de recuperación</dt>
              <dd className="text-lead font-bold text-ink">
                {s.hasActiveRecoveryPlan ? 'Activo' : 'Ninguno activo'}
              </dd>
            </div>
            <div className="rounded-lg bg-page p-4">
              <dt className="text-body-sm font-semibold text-ink-soft">Asistencia</dt>
              <dd className="text-lead font-bold text-ink">
                {s.attendance.rate == null ? 'Sin sesiones aún' : `${s.attendance.rate} %`}
              </dd>
              <dd className="text-body-sm text-ink-soft">
                {s.attendance.completed} asistió · {s.attendance.noShow} no asistió
              </dd>
            </div>
            <div className="rounded-lg bg-page p-4">
              <dt className="text-body-sm font-semibold text-ink-soft">Próximas citas</dt>
              <dd className="text-lead font-bold text-ink">{s.upcoming.length}</dd>
            </div>
          </dl>
          {s.upcoming.length > 0 && (
            <ul className="space-y-2" aria-label="Próximas citas de fisioterapia">
              {s.upcoming.map((a) => (
                <li key={a.id} className="rounded-lg bg-page p-3 text-body text-ink">
                  {formatDayShort(a.periodStart)} · {formatTime(a.periodStart)}
                  {a.practitionerName ? ` · con ${a.practitionerName}` : ''}
                </li>
              ))}
            </ul>
          )}
          {s.recent.length > 0 && (
            <ul className="space-y-2" aria-label="Últimas sesiones de fisioterapia">
              {s.recent.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap justify-between gap-2 rounded-lg bg-page p-3 text-body"
                >
                  <span className="text-ink">
                    {formatDayShort(a.periodStart)} · {formatTime(a.periodStart)}
                  </span>
                  <span className="font-semibold text-ink">
                    {APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Administration: the player's physiotherapy notes, only if the player has
 * authorized it from Mi CTCJ. The server checks the authorization on every
 * request (403 otherwise) and writes each read to the audit log.
 */
export function AdminPhysioNotes({ playerId }) {
  const summary = useAsync(() => clinicalClient.getPhysioSummary(playerId), [playerId]);
  const [notes, setNotes] = useState({ status: 'idle' });
  const authorized = summary.data?.notesAccess.authorized;

  async function load() {
    setNotes({ status: 'loading' });
    try {
      const d = await clinicalClient.listPhysioNotesForAdmin(playerId);
      setNotes({ status: 'ready', data: d.notes });
    } catch (err) {
      setNotes({
        status: err?.status === 403 ? 'denied' : 'error',
        message: describeClinicalError(err),
      });
    }
  }

  return (
    <Card title="Notas de fisioterapia" headingLevel={2}>
      {summary.status !== 'ready' ? (
        <p className="text-body text-ink-soft">Revisando la autorización del jugador…</p>
      ) : !authorized || notes.status === 'denied' ? (
        <p className="flex items-start gap-3 rounded-lg bg-page p-4 text-body text-ink">
          <LockIcon className="mt-0.5 h-6 w-6 shrink-0 text-navy-500" />
          El jugador no ha autorizado a la administración a ver sus notas de fisioterapia. Solo él
          puede hacerlo, desde Mi CTCJ → Mi perfil.
        </p>
      ) : notes.status === 'ready' ? (
        notes.data.length === 0 ? (
          <p className="text-body text-ink-soft">No hay notas de fisioterapia.</p>
        ) : (
          <ul className="space-y-3">
            {notes.data.map((n) => (
              <li key={n.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-navy-50 px-3 py-1 text-body-sm font-bold text-navy-500">
                    {CLINICAL_NOTE_TYPE_LABELS[n.noteType] ?? n.noteType}
                  </span>
                  <span className="ml-auto text-body-sm text-ink-soft">
                    {DATE_MEDIUM.format(new Date(n.createdAt))}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line text-body text-ink">{n.content}</p>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          <p className="text-body text-ink">
            El jugador autorizó el acceso el {formatDayShort(summary.data.notesAccess.grantedAt)}.
            Cada vez que abras sus notas queda registrado quién las leyó y cuándo.
          </p>
          {notes.status === 'error' && <FormAlert>{notes.message}</FormAlert>}
          <Button loading={notes.status === 'loading'} loadingText="Abriendo notas…" onClick={load}>
            Ver notas de fisioterapia
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Physiotherapist: mark the player "Apto" or "No apto hasta [fecha]". */
export function FitnessStatusCard({ playerId }) {
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState(null);
  const [until, setUntil] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function review() {
    if (!status) return setError('Elige Apto o No apto.');
    if (status === 'UNFIT' && until && until < clubTodayKey())
      return setError('La fecha no puede ser anterior a hoy.');
    setError(null);
    setConfirming(true);
  }

  async function save() {
    setSaving(true);
    try {
      await clinicalClient.setFitnessStatus(playerId, {
        status,
        ...(status === 'UNFIT' && until ? { unfitUntil: until } : {}),
      });
      toast({ title: 'Estado para jugar guardado', tone: 'success' });
      setStatus(null);
      setUntil('');
      setVersion((v) => v + 1);
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  const label =
    status === 'FIT'
      ? 'Apto para jugar'
      : until
        ? `No apto para jugar hasta el ${dateOnly(until)}`
        : 'No apto para jugar hasta nuevo aviso';

  return (
    <div className="space-y-6">
      <PhysioSummaryCard playerId={playerId} version={version} />
      <Card
        title="Estado para jugar"
        headingLevel={3}
        description="Lo ve la administración del club. No incluye el diagnóstico."
      >
        <div className="space-y-5">
          <RadioCards
            legend="¿Puede jugar?"
            name="apto"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setError(null);
            }}
            options={[
              { value: 'FIT', label: 'Apto', description: 'Puede entrenar y jugar.' },
              { value: 'UNFIT', label: 'No apto', description: 'No debe jugar por ahora.' },
            ]}
          />
          <div className={cn(status !== 'UNFIT' && 'hidden')}>
            <TextField
              label="No apto hasta (opcional)"
              type="date"
              value={until}
              min={clubTodayKey()}
              onChange={(e) => setUntil(e.target.value)}
              hint="Déjalo vacío si es hasta nuevo aviso."
            />
          </div>
          <FormAlert>{error}</FormAlert>
          <Button onClick={review}>Guardar estado</Button>
        </div>
      </Card>
      <ConfirmDialog
        open={confirming}
        tone="primary"
        title="¿Guardar el estado para jugar?"
        description={`Quedará: ${label}. La administración lo verá en el resumen.`}
        confirmLabel="Sí, guardar"
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
