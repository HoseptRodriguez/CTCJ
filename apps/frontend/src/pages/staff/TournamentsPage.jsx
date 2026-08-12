import { useEffect, useState } from 'react';
import { ROLE_CODES } from '@ctcj/shared';

import { membershipClient } from '../../api/membershipClient.js';
import { tournamentClient } from '../../api/tournamentClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { describeTournamentError } from '../../lib/tournamentErrorMessages.js';

const CATEGORIES = [
  { code: 'SEGUNDA', label: 'Segunda categoría' },
  { code: 'TERCERA', label: 'Tercera categoría' },
  { code: 'CUARTA', label: 'Cuarta categoría' },
  { code: 'QUINTA', label: 'Quinta categoría' },
];
const MODALITIES = [
  { code: 'SINGLES', label: 'Singles' },
  { code: 'DOBLES', label: 'Dobles' },
];
const STATUS_LABELS = {
  DRAFT: 'Inscripción',
  DRAW_GENERATED: 'En curso',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

function participantLabel(participant) {
  if (!participant) return null;
  const names = participant.members
    .map((m) => (m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : null))
    .filter(Boolean);
  return names.length > 0 ? names.join(' / ') : 'Jugador';
}

function CreateTournamentForm({ onCreated }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].code);
  const [modality, setModality] = useState(MODALITIES[0].code);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await tournamentClient.createTournament({ name: name.trim(), category, modality });
      setName('');
      await onCreated();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="tournament-name">
          Nombre
        </label>
        <input
          id="tournament-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Torneo Apertura"
          className="mt-1 w-56 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="tournament-category">
          Categoría
        </label>
        <select
          id="tournament-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="tournament-modality">
          Modalidad
        </label>
        <select
          id="tournament-modality"
          value={modality}
          onChange={(e) => setModality(e.target.value)}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        >
          {MODALITIES.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="primary" disabled={submitting || !name.trim()}>
        {submitting ? 'Creando...' : 'Crear torneo'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function ParticipantSlot({ id, label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="email"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="jugador@correo.com"
        className="mt-1 w-56 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
      />
    </div>
  );
}

function AddParticipantForm({ tournament, onAdded }) {
  const slotsNeeded = tournament.modality === 'SINGLES' ? 1 : 2;
  const [emails, setEmails] = useState(() => Array(slotsNeeded).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEmails(Array(slotsNeeded).fill(''));
  }, [slotsNeeded]);

  function updateEmail(index, value) {
    setEmails((prev) => prev.map((email, i) => (i === index ? value : email)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let playerIds;
    try {
      playerIds = await Promise.all(
        emails.map((email) => membershipClient.lookupUser(email.trim()).then((u) => u.id)),
      );
    } catch (err) {
      setError(describeIdentityError(err));
      setSubmitting(false);
      return;
    }

    try {
      await tournamentClient.addParticipant(tournament.id, playerIds);
      setEmails(Array(slotsNeeded).fill(''));
      await onAdded();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      {emails.map((email, i) => (
        <ParticipantSlot
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          id={`participant-${i}`}
          label={slotsNeeded === 1 ? 'Jugador' : `Jugador ${i + 1}`}
          value={email}
          onChange={(value) => updateEmail(i, value)}
        />
      ))}
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Agregando...' : 'Agregar participante'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function ParticipantsPanel({ tournament, participants, onChanged }) {
  const [error, setError] = useState(null);

  async function handleRemove(participantId) {
    setError(null);
    try {
      await tournamentClient.removeParticipant(tournament.id, participantId);
      await onChanged();
    } catch (err) {
      setError(describeTournamentError(err));
    }
  }

  return (
    <div className="mt-6">
      <h4 className="font-display font-semibold text-primary">Participantes</h4>
      {participants.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">Sin participantes todavía.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-raised px-3 py-2 text-sm"
            >
              <span className="text-primary">
                {participantLabel(p)}
                {p.seed ? (
                  <span className="ml-2 text-xs text-tertiary">Sembrado #{p.seed}</span>
                ) : null}
              </span>
              {tournament.status === 'DRAFT' ? (
                <Button variant="ghost" onClick={() => handleRemove(p.id)}>
                  Quitar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {tournament.status === 'DRAFT' ? (
        <AddParticipantForm tournament={tournament} onAdded={onChanged} />
      ) : null}
    </div>
  );
}

function RecordResultForm({ tournamentId, match, onRecorded }) {
  const [setsWonA, setSetsWonA] = useState('');
  const [setsWonB, setSetsWonB] = useState('');
  const [playedAt, setPlayedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const validScore = setsWonA !== '' && setsWonB !== '' && Number(setsWonA) !== Number(setsWonB);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const a = Number(setsWonA);
      const b = Number(setsWonB);
      await tournamentClient.recordMatchResult(tournamentId, match.id, {
        setsWonA: a,
        setsWonB: b,
        winnerSide: a > b ? 'A' : 'B',
        playedAt,
      });
      await onRecorded();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      {/* flex-wrap: this form lives inside a 180px-minimum bracket column
          (see BracketView's overflow-x-auto wrapper) -- three inputs side
          by side would otherwise overflow that column's own width. */}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="sr-only" htmlFor={`sets-a-${match.id}`}>
            Sets lado A
          </label>
          <input
            id={`sets-a-${match.id}`}
            type="number"
            min="0"
            max="5"
            required
            value={setsWonA}
            onChange={(e) => setSetsWonA(e.target.value)}
            className="w-16 rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-sm"
          />
        </div>
        <span className="text-sm text-secondary">-</span>
        <div>
          <label className="sr-only" htmlFor={`sets-b-${match.id}`}>
            Sets lado B
          </label>
          <input
            id={`sets-b-${match.id}`}
            type="number"
            min="0"
            max="5"
            required
            value={setsWonB}
            onChange={(e) => setSetsWonB(e.target.value)}
            className="w-16 rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={`played-at-${match.id}`}>
            Fecha
          </label>
          <input
            id={`played-at-${match.id}`}
            type="date"
            required
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-sm"
          />
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={submitting || !validScore}>
        {submitting ? 'Guardando...' : 'Registrar resultado'}
      </Button>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </form>
  );
}

function MatchCard({ tournamentId, match, participantById, onChanged }) {
  const participantA = participantById.get(match.participantAId) ?? null;
  const participantB = participantById.get(match.participantBId) ?? null;
  const isBye = match.winnerParticipantId != null && match.setsWonA == null;
  const isCompleted = match.winnerParticipantId != null;
  const isReady = match.participantAId && match.participantBId && !isCompleted;

  return (
    <div className="rounded-md border border-neutral-200 bg-canvas p-3 text-sm">
      <p
        className={
          match.winnerParticipantId === match.participantAId
            ? 'font-semibold text-primary'
            : 'text-secondary'
        }
      >
        {participantLabel(participantA) ?? 'Por definir'}
      </p>
      <p className="text-xs text-tertiary">vs</p>
      <p
        className={
          match.winnerParticipantId === match.participantBId
            ? 'font-semibold text-primary'
            : 'text-secondary'
        }
      >
        {participantLabel(participantB) ?? 'Por definir'}
      </p>
      {isBye ? <p className="mt-1 text-xs uppercase tracking-wide text-tertiary">Bye</p> : null}
      {isCompleted && !isBye ? (
        <p className="mt-1 text-xs text-tertiary">
          {match.setsWonA}-{match.setsWonB}
        </p>
      ) : null}
      {isReady ? (
        <RecordResultForm tournamentId={tournamentId} match={match} onRecorded={onChanged} />
      ) : null}
    </div>
  );
}

function BracketView({ tournamentId, participants, matches, onChanged }) {
  const participantById = new Map(participants.map((p) => [p.id, p]));
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="mt-6">
      <h4 className="font-display font-semibold text-primary">Cuadro</h4>
      {/* A bracket is inherently as wide as it has rounds -- minmax(180px, 1fr)
          per round means N rounds never fit a phone screen. Scroll it
          horizontally within its own container instead of letting it force
          the whole page to scroll (same pattern as BookingGrid.jsx's court
          grid), rather than shrinking columns into illegibility. */}
      <div className="mt-3 overflow-x-auto">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(180px, 1fr))` }}
        >
          {rounds.map((round) => (
            <div key={round}>
              <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                Ronda {round}
              </p>
              <div className="mt-2 space-y-3">
                {matches
                  .filter((m) => m.round === round)
                  .sort((a, b) => a.slot - b.slot)
                  .map((m) => (
                    <MatchCard
                      key={m.id}
                      tournamentId={tournamentId}
                      match={m}
                      participantById={participantById}
                      onChanged={onChanged}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GenerateDrawButton({ tournament, participantCount, onGenerated }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      await tournamentClient.generateDraw(tournament.id);
      await onGenerated();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <Button variant="primary" onClick={handleClick} disabled={submitting || participantCount < 2}>
        {submitting ? 'Generando...' : 'Generar sorteo'}
      </Button>
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  );
}

function CancelTournamentButton({ tournament, onCancelled }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      await tournamentClient.cancelTournament(tournament.id);
      await onCancelled();
    } catch (err) {
      setError(describeTournamentError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2">
      <Button variant="ghost" onClick={handleClick} disabled={submitting}>
        {submitting ? 'Cancelando...' : 'Cancelar torneo'}
      </Button>
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  );
}

function TournamentDetail({ tournamentId, isAdmin, onListChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return tournamentClient
      .getTournament(tournamentId)
      .then(setData)
      .catch((err) => setError(describeTournamentError(err)));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function handleChanged() {
    await refetch();
    await onListChanged();
  }

  if (error) {
    return <p className="mt-6 text-sm text-error">{error}</p>;
  }
  if (!data) {
    return <p className="mt-6 text-sm text-secondary">Cargando...</p>;
  }

  const { tournament, participants, matches } = data;

  return (
    <div className="mt-6 rounded-lg border border-neutral-200 bg-canvas p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-primary">{tournament.name}</h3>
          <p className="text-sm text-secondary">
            {CATEGORIES.find((c) => c.code === tournament.category)?.label} ·{' '}
            {MODALITIES.find((m) => m.code === tournament.modality)?.label}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
          {STATUS_LABELS[tournament.status] ?? tournament.status}
        </span>
      </div>

      {tournament.status === 'DRAFT' ? (
        <ParticipantsPanel
          tournament={tournament}
          participants={participants}
          onChanged={handleChanged}
        />
      ) : null}

      {tournament.status === 'DRAFT' && isAdmin ? (
        <GenerateDrawButton
          tournament={tournament}
          participantCount={participants.length}
          onGenerated={handleChanged}
        />
      ) : null}

      {tournament.status !== 'DRAFT' ? (
        <BracketView
          tournamentId={tournament.id}
          participants={participants}
          matches={matches}
          onChanged={handleChanged}
        />
      ) : null}

      {tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED' && isAdmin ? (
        <CancelTournamentButton tournament={tournament} onCancelled={handleChanged} />
      ) : null}
    </div>
  );
}

export function TournamentsPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles ?? []).includes(ROLE_CODES.ADMINISTRADOR);

  const [tournaments, setTournaments] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');

  function refetchList() {
    return tournamentClient
      .listTournaments()
      .then((data) => setTournaments(data.tournaments))
      .catch(() => setTournaments([]));
  }

  useEffect(() => {
    refetchList();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Torneos</h1>
      <p className="mt-1 text-secondary">
        Crea torneos, gestiona inscripciones y registra resultados del cuadro.
      </p>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-canvas p-6">
        <h3 className="font-display text-lg font-semibold text-primary">Torneos</h3>

        {tournaments === null ? <p className="mt-2 text-sm text-secondary">Cargando...</p> : null}
        {tournaments?.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">Todavía no hay ningún torneo.</p>
        ) : null}
        {tournaments?.length > 0 ? (
          <label
            className="mt-3 flex items-center gap-2 text-sm text-secondary"
            htmlFor="tournament-select"
          >
            Torneo
            <select
              id="tournament-select"
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="rounded-md border border-neutral-300 bg-canvas px-3 py-1.5 text-sm"
            >
              <option value="">Seleccionar...</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({STATUS_LABELS[t.status] ?? t.status})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isAdmin ? <CreateTournamentForm onCreated={refetchList} /> : null}
      </div>

      {selectedTournamentId ? (
        <TournamentDetail
          key={selectedTournamentId}
          tournamentId={selectedTournamentId}
          isAdmin={isAdmin}
          onListChanged={refetchList}
        />
      ) : null}
    </div>
  );
}
