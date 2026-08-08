import { useEffect, useState } from 'react';
import { ROLE_CODES } from '@ctcj/shared';

import { coachingClient } from '../../api/coachingClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { PerformanceLineChart } from '../../components/ui/PerformanceLineChart.jsx';
import { PerformanceRadarChart } from '../../components/ui/PerformanceRadarChart.jsx';
import { describeCoachingError } from '../../lib/coachingErrorMessages.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { AREA_LABELS, describeArea } from '../../lib/performanceRatingLabels.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });
const AREA_CODES = Object.keys(AREA_LABELS);

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
  const [area, setArea] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await coachingClient.createNote(playerId, {
        noteType,
        visibility,
        content: content.trim(),
        area: area || undefined,
      });
      setContent('');
      setArea('');
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
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="note-area">
            Habilidad (opcional)
          </label>
          <select
            id="note-area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          >
            <option value="">Sin habilidad específica</option>
            {AREA_CODES.map((code) => (
              <option key={code} value={code}>
                {AREA_LABELS[code]}
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
                  {note.area ? (
                    <>
                      {' · '}
                      <span className="rounded-full bg-action px-2 py-0.5 text-on-action">
                        {describeArea(note.area)}
                      </span>
                    </>
                  ) : null}
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

function RecordPerformanceForm({ playerId, onRecorded }) {
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const hasAnyValue = Object.values(values).some((v) => v !== '' && v != null);

  async function handleSubmit(e) {
    e.preventDefault();
    const ratings = Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v !== '' && v != null)
        .map(([area, v]) => [area, Number(v)]),
    );
    if (Object.keys(ratings).length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await coachingClient.recordPerformanceSnapshot(playerId, ratings);
      setValues({});
      await onRecorded();
    } catch (err) {
      setError(describeCoachingError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <p className="text-sm text-secondary">
        Completa solo las áreas que quieras registrar en esta evaluación.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AREA_CODES.map((area) => (
          <div key={area}>
            <label className="block text-sm font-semibold text-primary" htmlFor={`rating-${area}`}>
              {describeArea(area)}
            </label>
            <input
              id={`rating-${area}`}
              type="number"
              min="1"
              max="10"
              value={values[area] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [area]: e.target.value }))}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
      <Button
        type="submit"
        variant="primary"
        className="mt-3"
        disabled={submitting || !hasAnyValue}
      >
        {submitting ? 'Guardando...' : 'Registrar evaluación'}
      </Button>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </form>
  );
}

function PerformanceSection({ playerId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return coachingClient
      .listPlayerPerformance(playerId)
      .then(setData)
      .catch((err) => setError(describeCoachingError(err)));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  return (
    <div className="mt-6">
      <h3 className="font-display font-semibold text-primary">Rendimiento</h3>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {!error && data === null ? <p className="mt-2 text-sm text-secondary">Cargando...</p> : null}
      {data && data.ratings.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">Sin evaluaciones registradas todavía.</p>
      ) : null}

      {data && data.ratings.length > 0 ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <PerformanceRadarChart latestByArea={data.summary.latestByArea} />
          <PerformanceLineChart ratings={data.ratings} />
        </div>
      ) : null}

      <RecordPerformanceForm playerId={playerId} onRecorded={refetch} />
    </div>
  );
}

const TABS = [
  { id: 'notas', label: 'Notas' },
  { id: 'rendimiento', label: 'Rendimiento' },
];

function TabBar({ active, onChange }) {
  return (
    <div className="mt-4 flex gap-2 border-b border-neutral-200" role="tablist">
      {TABS.map((tab) => (
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

export function CoachNotesPage() {
  const [foundUser, setFoundUser] = useState(null);
  const [activeTab, setActiveTab] = useState('notas');

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Jugadores</h1>
      <p className="mt-1 text-secondary">
        Notas de entrenamiento, observaciones técnicas/tácticas, recomendaciones y evaluaciones de
        rendimiento. Las notas privadas nunca son visibles para el jugador.
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
              <TabBar active={activeTab} onChange={setActiveTab} />
              {activeTab === 'notas' ? (
                <NotesList key={`notas-${foundUser.id}`} playerId={foundUser.id} />
              ) : null}
              {activeTab === 'rendimiento' ? (
                <PerformanceSection key={`rendimiento-${foundUser.id}`} playerId={foundUser.id} />
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
