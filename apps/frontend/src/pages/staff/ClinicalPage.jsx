import { ROLE_CODES } from '@ctcj/shared';
import { useState } from 'react';

import { clinicalClient } from '../../api/clinicalClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { LockIcon } from '../../components/icons/LockIcon.jsx';
import { PlusIcon } from '../../components/icons/PlusIcon.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { cn } from '../../components/ui/cn.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { describeClinicalError } from '../../lib/clinicalErrorMessages.js';
import { clubTodayKey } from '../../lib/clubTime.js';
import { formatDayShort, formatTime } from '../../lib/format.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import { APPOINTMENT_STATUS_LABELS, SectionCard } from '../mictcj/shared.jsx';

import { clinicalRecordTabs, DISCIPLINE_LABELS, ReasonDialog } from './ClinicalPlayerRecord.jsx';
import { AdminPhysioNotes, FitnessStatusCard, PhysioSummaryCard } from './PhysioAccess.jsx';
import { PlayerPicker } from './PlayerPicker.jsx';
import { dayTitle, StaffDateNav, useSelectedPlayer } from './staffShared.jsx';

// Colombia is UTC-5 all year (no DST), the club's zone everywhere.
const BOGOTA_OFFSET = '-05:00';

const STATUS_STYLES = {
  SCHEDULED: 'bg-navy-50 text-navy-500',
  COMPLETED: 'bg-status-ok-bg text-status-ok-fg',
  CANCELLED: 'bg-status-suspended-bg text-status-suspended-fg',
  NO_SHOW: 'bg-status-overdue-bg text-status-overdue-fg',
};

function useClinicalRoles() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const has = (r) => roles.includes(r);
  const isPsych = has(ROLE_CODES.PSICOLOGO) || has(ROLE_CODES.NEUROPSICOLOGO);
  const isPhysio = has(ROLE_CODES.FISIOTERAPEUTA);
  const isPractitioner = isPsych || isPhysio;
  const disciplines = isPractitioner
    ? [...(isPsych ? ['PSYCHOLOGY'] : []), ...(isPhysio ? ['PHYSIOTHERAPY'] : [])]
    : ['PSYCHOLOGY', 'PHYSIOTHERAPY'];
  return {
    userId: user?.id,
    isPractitioner,
    isAdmin: has(ROLE_CODES.ADMINISTRADOR),
    // Recepción coordinates logistics but can't know whether a session happened.
    canMarkOutcome: isPractitioner || has(ROLE_CODES.ADMINISTRADOR),
    disciplines,
  };
}

function PrivacyNotice({ isPractitioner, isAdmin }) {
  let text;
  if (isPractitioner) {
    text =
      'Tus notas solo las ven los profesionales de tu disciplina. Entrenadores y recepción nunca las ven. La administración solo puede leer las de fisioterapia si el jugador lo autoriza, y cada lectura queda registrada. El jugador solo ve lo que marques como “La ve el jugador”.';
  } else if (isAdmin) {
    text =
      'Ves la agenda y, en fisioterapia, un resumen: asistencia, si hay plan de recuperación activo y si el jugador está apto para jugar. Las notas de fisioterapia solo si el jugador lo autorizó desde Mi CTCJ, y cada lectura queda registrada. Las de psicología nunca.';
  } else {
    text =
      'Aquí ves solo la agenda: quién tiene cita, cuándo y con quién. El contenido de las sesiones es privado del profesional y nunca se muestra en esta pantalla.';
  }
  return (
    <div className="mb-8 flex items-start gap-4 rounded-xl border-2 border-navy-500 bg-navy-50 p-5">
      <LockIcon className="mt-0.5 h-7 w-7 shrink-0 text-navy-500" />
      <div>
        <p className="text-lead font-bold text-navy-500">Información confidencial de salud</p>
        <p className="mt-1 text-body text-ink">{text}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AppointmentCard({ appt, showDate, canMarkOutcome, onOpenPlayer, onAction }) {
  const scheduled = appt.status === 'SCHEDULED';
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-lg bg-navy-500 px-3 py-2 text-center text-white">
          {showDate && (
            <p className="text-body-sm font-semibold">{formatDayShort(appt.periodStart)}</p>
          )}
          <p className="font-display text-h3 font-bold leading-tight">
            {formatTime(appt.periodStart)}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lead font-bold text-ink">{appt.playerName ?? 'Jugador'}</p>
          <p className="text-body text-ink-soft">
            Con {appt.practitionerName ?? 'el profesional'} · hasta {formatTime(appt.periodEnd)}
          </p>
          <span
            className={cn(
              'mt-2 inline-block rounded-full px-3 py-1 text-body-sm font-bold',
              STATUS_STYLES[appt.status],
            )}
          >
            {APPOINTMENT_STATUS_LABELS[appt.status] ?? appt.status}
          </span>
        </div>
      </div>
      {(scheduled || onOpenPlayer) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onOpenPlayer && (
            <Button variant="secondary" onClick={() => onOpenPlayer(appt)}>
              Abrir ficha
            </Button>
          )}
          {scheduled && canMarkOutcome && (
            <>
              <Button variant="secondary" onClick={() => onAction(appt, 'complete')}>
                Asistió
              </Button>
              <Button variant="secondary" onClick={() => onAction(appt, 'no-show')}>
                No asistió
              </Button>
            </>
          )}
          {scheduled && (
            <Button variant="ghost" onClick={() => onAction(appt, 'cancel')}>
              Cancelar cita
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Complete / no-show / cancel, each behind a confirmation. */
function useAppointmentActions(onDone) {
  const toast = useToast();
  const [pending, setPending] = useState(null); // { appt, action }
  const [busy, setBusy] = useState(false);

  async function confirmOutcome() {
    setBusy(true);
    try {
      if (pending.action === 'complete') await clinicalClient.markCompleted(pending.appt.id);
      else await clinicalClient.markNoShow(pending.appt.id);
      toast({
        title:
          pending.action === 'complete'
            ? 'Cita marcada como atendida'
            : 'Marcada como “No asistió”',
        tone: 'success',
      });
      setPending(null);
      onDone();
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

  const who = pending
    ? `${pending.appt.playerName ?? 'el jugador'}, ${formatDayShort(pending.appt.periodStart)} a las ${formatTime(pending.appt.periodStart)}`
    : '';
  const dialogs = (
    <>
      <ConfirmDialog
        open={pending?.action === 'complete' || pending?.action === 'no-show'}
        tone={pending?.action === 'no-show' ? 'danger' : 'primary'}
        title={pending?.action === 'complete' ? '¿Marcar que asistió?' : '¿Marcar que no asistió?'}
        description={`Cita de ${who}. Este cambio no se puede deshacer.`}
        confirmLabel={pending?.action === 'complete' ? 'Sí, asistió' : 'Sí, no asistió'}
        loading={busy}
        onConfirm={confirmOutcome}
        onCancel={() => setPending(null)}
      />
      <ReasonDialog
        open={pending?.action === 'cancel'}
        title="¿Cancelar la cita?"
        description={`Cita de ${who}. El jugador verá que se canceló.`}
        confirmLabel="Sí, cancelar cita"
        onConfirm={async (reason) => {
          await clinicalClient.cancelAppointment(pending.appt.id, reason);
          toast({ title: 'Cita cancelada', tone: 'success' });
          setPending(null);
          onDone();
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
  return { request: (appt, action) => setPending({ appt, action }), dialogs };
}

// ---------------------------------------------------------------------------

function NewAppointmentPanel({ open, onClose, onSaved, roles, initialPlayer }) {
  const toast = useToast();
  const [player, setPlayer] = useState(initialPlayer ?? null);
  const [practitionerEmail, setPractitionerEmail] = useState('');
  const [date, setDate] = useState(clubTodayKey);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (!player) return setError('Elige el jugador.');
    if (!roles.isPractitioner && !practitionerEmail.trim())
      return setError('Escribe el correo del profesional.');
    if (!date || !start || !end) return setError('Completa la fecha y las horas.');
    if (end <= start) return setError('La hora de fin debe ser después de la de inicio.');
    setSaving(true);
    setError(null);
    try {
      let practitionerId = roles.userId;
      if (!roles.isPractitioner) {
        try {
          practitionerId = (await membershipClient.lookupUser(practitionerEmail.trim())).id;
        } catch (err) {
          setError(describeIdentityError(err));
          return;
        }
      }
      await clinicalClient.scheduleAppointment({
        playerId: player.id,
        practitionerId,
        start: `${date}T${start}:00${BOGOTA_OFFSET}`,
        end: `${date}T${end}:00${BOGOTA_OFFSET}`,
      });
      toast({
        title: 'Cita agendada',
        description: `${player.firstName} ${player.lastName}, ${dayTitle(date)} a las ${start}`,
        tone: 'success',
      });
      onSaved(date);
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Nueva cita"
      footer={
        <Button size="lg" fullWidth loading={saving} loadingText="Agendando…" onClick={save}>
          Agendar cita
        </Button>
      }
    >
      <div className="space-y-6">
        {player ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-navy-500 p-4 text-white">
            <p className="text-lead font-bold">
              {player.firstName} {player.lastName}
            </p>
            <Button variant="secondary" tone="dark" onClick={() => setPlayer(null)}>
              Cambiar
            </Button>
          </div>
        ) : (
          <PlayerPicker label="Jugador" allowEmail={!roles.isPractitioner} onSelect={setPlayer} />
        )}
        {roles.isPractitioner ? (
          <p className="rounded-lg bg-page p-4 text-body text-ink">La cita queda contigo.</p>
        ) : (
          <TextField
            label="Correo del profesional"
            type="email"
            value={practitionerEmail}
            onChange={(e) => setPractitionerEmail(e.target.value)}
            hint="El psicólogo o fisioterapeuta que atenderá."
          />
        )}
        <TextField
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Hora de inicio"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <TextField
            label="Hora de fin"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-status-overdue-bg p-3 text-body font-semibold text-status-overdue-fg"
          >
            {error}
          </p>
        )}
      </div>
    </SlidePanel>
  );
}

// ---------------------------------------------------------------------------

function PlayerAppointments({ playerId, discipline, roles }) {
  const appts = useAsync(
    () => clinicalClient.listAppointments({ playerId }).then((d) => d.appointments),
    [playerId],
  );
  const actions = useAppointmentActions(appts.reload);
  const mine = (d) =>
    d
      .filter((a) => !discipline || a.discipline === discipline)
      .sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart));
  return (
    <>
      <SectionCard
        title="Citas del jugador"
        async={appts}
        isEmpty={(d) => mine(d).length === 0}
        empty={{ title: 'Sin citas registradas' }}
      >
        {(d) => (
          <ul className="space-y-3">
            {mine(d).map((a) => (
              <li key={a.id}>
                <AppointmentCard
                  appt={a}
                  showDate
                  canMarkOutcome={roles.canMarkOutcome}
                  onAction={actions.request}
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      {actions.dialogs}
    </>
  );
}

function DisciplineView({ discipline, roles }) {
  const [date, setDate] = useState(clubTodayKey);
  const [player, selectPlayer] = useSelectedPlayer();
  const [newOpen, setNewOpen] = useState(false);
  const agenda = useAsync(() => clinicalClient.listAppointments().then((d) => d.appointments), []);
  const actions = useAppointmentActions(agenda.reload);
  const [recordTab, setRecordTab] = useState('citas');

  const ofDay = (list) =>
    list
      .filter((a) => a.discipline === discipline && clubTodayKey(new Date(a.periodStart)) === date)
      .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));

  const openPlayer = (a) => {
    const [firstName, ...rest] = (a.playerName ?? 'Jugador').split(' ');
    selectPlayer({ id: a.playerId, firstName, lastName: rest.join(' ') });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
      <div className="space-y-4">
        <StaffDateNav value={date} onChange={setDate} label="Día de la agenda" />
        <SectionCard
          title="Agenda del día"
          description={dayTitle(date)}
          actions={
            <Button icon={<PlusIcon />} onClick={() => setNewOpen(true)}>
              Nueva cita
            </Button>
          }
          async={agenda}
          isEmpty={(d) => ofDay(d).length === 0}
          empty={{
            title: `No hay citas de ${DISCIPLINE_LABELS[discipline].toLowerCase()} este día`,
          }}
        >
          {(d) => (
            <ul
              className="space-y-3"
              aria-label={`Citas de ${DISCIPLINE_LABELS[discipline].toLowerCase()}`}
            >
              {ofDay(d).map((a) => (
                <li key={a.id}>
                  <AppointmentCard
                    appt={a}
                    canMarkOutcome={roles.canMarkOutcome}
                    onOpenPlayer={roles.isPractitioner ? openPlayer : undefined}
                    onAction={actions.request}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="min-w-0 space-y-6">
        {player ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy-500 p-5 text-white md:p-6">
              <div>
                <p className="text-body text-white/90">
                  {roles.isPractitioner ? 'Ficha de' : 'Citas de'}
                </p>
                <h2 className="font-display text-h2 font-bold">{player.name}</h2>
              </div>
              <Button variant="secondary" tone="dark" onClick={() => selectPlayer(null)}>
                Cambiar de jugador
              </Button>
            </div>
            {roles.isPractitioner ? (
              <Tabs
                label={`Ficha de ${player.name}`}
                value={recordTab}
                onChange={setRecordTab}
                tabs={clinicalRecordTabs({
                  playerId: player.id,
                  discipline,
                  appointmentsTab: (
                    <div className="space-y-6">
                      {discipline === 'PHYSIOTHERAPY' && (
                        <FitnessStatusCard key={`fit-${player.id}`} playerId={player.id} />
                      )}
                      <PlayerAppointments
                        key={player.id}
                        playerId={player.id}
                        discipline={discipline}
                        roles={roles}
                      />
                    </div>
                  ),
                })}
              />
            ) : (
              <>
                {/* Administration, physiotherapy: operational summary, and the
                    notes only with the player's own authorization. */}
                {roles.isAdmin && discipline === 'PHYSIOTHERAPY' && (
                  <>
                    <PhysioSummaryCard key={`sum-${player.id}`} playerId={player.id} />
                    <AdminPhysioNotes key={`notes-${player.id}`} playerId={player.id} />
                  </>
                )}
                <PlayerAppointments key={player.id} playerId={player.id} roles={roles} />
              </>
            )}
          </>
        ) : (
          <Card title={roles.isPractitioner ? 'Ficha de un jugador' : 'Citas de un jugador'}>
            <PlayerPicker
              label="Buscar jugador"
              allowEmail={!roles.isPractitioner}
              onSelect={selectPlayer}
            />
          </Card>
        )}
      </div>

      {actions.dialogs}
      <NewAppointmentPanel
        key={newOpen ? 'open' : 'closed'}
        open={newOpen}
        onClose={() => setNewOpen(false)}
        roles={roles}
        initialPlayer={player ? { id: player.id, firstName: player.name, lastName: '' } : null}
        onSaved={(d) => {
          setNewOpen(false);
          setDate(d);
          agenda.reload();
        }}
      />
    </div>
  );
}

export function ClinicalPage() {
  const roles = useClinicalRoles();
  const [tab, setTab] = useState(roles.disciplines[0]);

  return (
    <div>
      <PageHeader
        title="Salud y bienestar"
        description={
          roles.isPractitioner
            ? 'Tu agenda del día y la ficha de cada jugador.'
            : 'Agenda de psicología y fisioterapia: agenda, cancela y revisa citas.'
        }
      />
      <PrivacyNotice isPractitioner={roles.isPractitioner} isAdmin={roles.isAdmin} />
      {roles.disciplines.length > 1 ? (
        <Tabs
          label="Disciplina"
          value={tab}
          onChange={setTab}
          tabs={roles.disciplines.map((d) => ({
            id: d,
            label: DISCIPLINE_LABELS[d],
            content: <DisciplineView key={d} discipline={d} roles={roles} />,
          }))}
        />
      ) : (
        <DisciplineView discipline={roles.disciplines[0]} roles={roles} />
      )}
    </div>
  );
}
