import { useEffect, useState } from 'react';
import { ROLE_CODES } from '@ctcj/shared';

import { clinicalClient } from '../../api/clinicalClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { describeClinicalError } from '../../lib/clinicalErrorMessages.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const NOTE_TYPE_LABELS = {
  FOLLOW_UP: 'Seguimiento',
  RECOMMENDATION: 'Recomendación',
  SESSION_NOTE: 'Nota de sesión',
  GENERAL: 'General',
};
const VISIBILITY_LABELS = {
  PRIVATE: 'Privada',
  PLAYER_VISIBLE: 'Visible para el jugador',
};
const STATUS_LABELS = {
  SCHEDULED: 'Programada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

// Colombia has a fixed UTC-5 offset year-round (no DST) -- matches the
// club's America/Bogota timezone assumption used elsewhere in this app.
const BOGOTA_OFFSET = '-05:00';

function LookupForm({ onFound }) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const user = await membershipClient.lookupUser(email.trim());
      onFound(user);
    } catch (err) {
      setError(describeIdentityError(err));
      onFound(null);
    } finally {
      setSearching(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="clinical-lookup-email" className="block text-sm font-semibold text-primary">
          Correo del jugador
        </label>
        <input
          id="clinical-lookup-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jugador@correo.com"
          className="mt-1 w-72 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="primary" disabled={searching || !email}>
        {searching ? 'Buscando...' : 'Buscar'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function ScheduleAppointmentForm({ playerId, onScheduled }) {
  const [practitionerEmail, setPractitionerEmail] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let practitioner;
    try {
      practitioner = await membershipClient.lookupUser(practitionerEmail.trim());
    } catch (err) {
      setError(describeIdentityError(err));
      setSubmitting(false);
      return;
    }

    try {
      await clinicalClient.scheduleAppointment({
        playerId,
        practitionerId: practitioner.id,
        start: `${date}T${startTime}:00${BOGOTA_OFFSET}`,
        end: `${date}T${endTime}:00${BOGOTA_OFFSET}`,
      });
      setPractitionerEmail('');
      setDate('');
      setStartTime('');
      setEndTime('');
      await onScheduled();
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="practitioner-email">
          Correo del profesional
        </label>
        <input
          id="practitioner-email"
          type="email"
          required
          value={practitionerEmail}
          onChange={(e) => setPractitionerEmail(e.target.value)}
          placeholder="psicologo@correo.com"
          className="mt-1 w-64 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="appt-date">
          Fecha
        </label>
        <input
          id="appt-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="appt-start">
          Hora inicio
        </label>
        <input
          id="appt-start"
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="appt-end">
          Hora fin
        </label>
        <input
          id="appt-end"
          type="time"
          required
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Agendando...' : 'Agendar cita'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function AppointmentRow({ appointment, canManageOutcome, onChanged }) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAction(action) {
    setSubmitting(true);
    setError(null);
    try {
      if (action === 'cancel') {
        const reason = window.prompt('Motivo de cancelación:');
        if (!reason) {
          setSubmitting(false);
          return;
        }
        await clinicalClient.cancelAppointment(appointment.id, reason);
      } else if (action === 'complete') {
        await clinicalClient.markCompleted(appointment.id);
      } else if (action === 'no-show') {
        await clinicalClient.markNoShow(appointment.id);
      }
      await onChanged();
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isScheduled = appointment.status === 'SCHEDULED';

  return (
    <li className="rounded-md bg-raised px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-primary">
          {appointment.practitionerName ?? 'Profesional'} ·{' '}
          {DATE_FORMATTER.format(new Date(appointment.periodStart))}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
          {STATUS_LABELS[appointment.status] ?? appointment.status}
        </span>
      </div>
      {isScheduled ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="ghost" disabled={submitting} onClick={() => handleAction('cancel')}>
            Cancelar
          </Button>
          {canManageOutcome ? (
            <>
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => handleAction('complete')}
              >
                Marcar completada
              </Button>
              <Button variant="ghost" disabled={submitting} onClick={() => handleAction('no-show')}>
                Marcar no asistió
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </li>
  );
}

function AppointmentsSection({ playerId, canManageOutcome }) {
  const [appointments, setAppointments] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return clinicalClient
      .listAppointments({ playerId })
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setError(describeClinicalError(err)));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  return (
    <div className="mt-6">
      <h3 className="font-display font-semibold text-primary">Citas</h3>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {!error && appointments === null ? (
        <p className="mt-2 text-sm text-secondary">Cargando...</p>
      ) : null}
      {appointments?.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">Sin citas todavía.</p>
      ) : null}

      {appointments?.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {appointments.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              canManageOutcome={canManageOutcome}
              onChanged={refetch}
            />
          ))}
        </ul>
      ) : null}

      <ScheduleAppointmentForm playerId={playerId} onScheduled={refetch} />
    </div>
  );
}

function CreateNoteForm({ playerId, onCreated }) {
  const [noteType, setNoteType] = useState('FOLLOW_UP');
  const [visibility, setVisibility] = useState('PRIVATE');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await clinicalClient.createNote(playerId, { noteType, visibility, content: content.trim() });
      setContent('');
      await onCreated();
    } catch (err) {
      setError(describeClinicalError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="note-type">
            Tipo
          </label>
          <select
            id="note-type"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          >
            {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="note-visibility">
            Visibilidad
          </label>
          <select
            id="note-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          >
            {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="note-content">
          Nota
        </label>
        <textarea
          id="note-content"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="primary" disabled={submitting || !content.trim()}>
        {submitting ? 'Guardando...' : 'Agregar nota'}
      </Button>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </form>
  );
}

function NotesSection({ playerId }) {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return clinicalClient
      .listPlayerNotes(playerId)
      .then((data) => setNotes(data.notes))
      .catch((err) => setError(describeClinicalError(err)));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  return (
    <div className="mt-6">
      <h3 className="font-display font-semibold text-primary">Notas</h3>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {!error && notes === null ? <p className="mt-2 text-sm text-secondary">Cargando...</p> : null}
      {notes?.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">Sin notas todavía.</p>
      ) : null}

      {notes?.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md bg-raised px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                  {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType} ·{' '}
                  {VISIBILITY_LABELS[note.visibility] ?? note.visibility}
                </span>
                <span className="text-xs text-tertiary">
                  {DATE_FORMATTER.format(new Date(note.createdAt))}
                </span>
              </div>
              <p className="mt-1 text-secondary">{note.content}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <CreateNoteForm playerId={playerId} onCreated={refetch} />
    </div>
  );
}

const TABS = [
  { id: 'citas', label: 'Citas' },
  { id: 'notas', label: 'Notas' },
];

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="mt-4 flex gap-2 border-b border-neutral-200" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide ${
            active === tab.id
              ? 'border-b-2 border-navy-500 text-primary'
              : 'text-tertiary hover:text-secondary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ClinicalPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes(ROLE_CODES.ADMINISTRADOR);
  const isPsicologo = roles.includes(ROLE_CODES.PSICOLOGO);
  const isNeuropsicologo = roles.includes(ROLE_CODES.NEUROPSICOLOGO);
  const canSeeNotes = isPsicologo || isNeuropsicologo;
  const canManageOutcome = isAdmin || canSeeNotes;

  const [foundUser, setFoundUser] = useState(null);
  const [activeTab, setActiveTab] = useState('citas');

  const visibleTabs = canSeeNotes ? TABS : TABS.filter((t) => t.id !== 'notas');

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Salud mental</h1>
      <p className="mt-1 text-secondary">
        Agenda citas con psicología/neuropsicología y, si tienes rol clínico, registra notas de
        seguimiento. Las notas privadas nunca son visibles para el jugador.
      </p>

      <div className="mt-6">
        <LookupForm onFound={setFoundUser} />
      </div>

      {foundUser ? (
        <div className="mt-6 rounded-md border border-neutral-200 bg-canvas p-4">
          <p className="font-display font-semibold text-primary">
            {foundUser.firstName} {foundUser.lastName}
          </p>
          <p className="text-sm text-secondary">{foundUser.email}</p>
          {foundUser.roleCodes.includes(ROLE_CODES.JUGADOR) ? (
            <>
              <TabBar tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />
              {activeTab === 'citas' ? (
                <AppointmentsSection
                  key={`citas-${foundUser.id}`}
                  playerId={foundUser.id}
                  canManageOutcome={canManageOutcome}
                />
              ) : null}
              {activeTab === 'notas' && canSeeNotes ? (
                <NotesSection key={`notas-${foundUser.id}`} playerId={foundUser.id} />
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-error">Este usuario no tiene el rol Jugador.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
