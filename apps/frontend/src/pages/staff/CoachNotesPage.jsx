import { useEffect, useState } from 'react';
import { ROLE_CODES } from '@ctcj/shared';

import { coachingClient } from '../../api/coachingClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeCoachingError } from '../../lib/coachingErrorMessages.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

const NOTE_TYPE_LABELS = {
  TRAINING: 'Entrenamiento',
  TECHNICAL: 'Técnica',
  TACTICAL: 'Táctica',
  RECOMMENDATION: 'Recomendación',
};

const VISIBILITY_LABELS = {
  PRIVATE: 'Privada',
  PLAYER_VISIBLE: 'Visible para el jugador',
};

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
        <label htmlFor="coach-lookup-email" className="block text-sm font-semibold text-primary">
          Correo del jugador
        </label>
        <input
          id="coach-lookup-email"
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

function CreateNoteForm({ playerId, onCreated }) {
  const [noteType, setNoteType] = useState('TRAINING');
  const [visibility, setVisibility] = useState('PRIVATE');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await coachingClient.createNote(playerId, { noteType, visibility, content: content.trim() });
      setContent('');
      await onCreated();
    } catch (err) {
      setError(describeCoachingError(err));
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

function NotesList({ playerId }) {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return coachingClient
      .listPlayerNotes(playerId)
      .then((data) => setNotes(data.notes))
      .catch((err) => setError(describeCoachingError(err)));
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

export function CoachNotesPage() {
  const [foundUser, setFoundUser] = useState(null);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Notas de jugadores</h1>
      <p className="mt-1 text-secondary">
        Registra notas de entrenamiento, observaciones técnicas/tácticas y recomendaciones. Las
        notas privadas nunca son visibles para el jugador.
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
            <NotesList key={foundUser.id} playerId={foundUser.id} />
          ) : (
            <p className="mt-3 text-sm text-error">Este usuario no tiene el rol Jugador.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
