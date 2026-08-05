import { useEffect, useState } from 'react';
import { ROLE_CODES } from '@ctcj/shared';

import { competitionClient } from '../../api/competitionClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { describeCompetitionError } from '../../lib/competitionErrorMessages.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';

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

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

function CreateSeasonForm({ onCreated }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await competitionClient.createSeason({
        name: name.trim(),
        year: Number(year),
        seasonNumber: Number(seasonNumber),
        startDate,
      });
      setName('');
      setStartDate('');
      await onCreated();
    } catch (err) {
      setError(describeCompetitionError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="season-name">
          Nombre
        </label>
        <input
          id="season-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Temporada 1 · 2026"
          className="mt-1 w-56 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="season-year">
          Año
        </label>
        <input
          id="season-year"
          type="number"
          required
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="mt-1 w-24 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="season-number">
          Temporada del año
        </label>
        <select
          id="season-number"
          value={seasonNumber}
          onChange={(e) => setSeasonNumber(e.target.value)}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="season-start">
          Fecha de inicio
        </label>
        <input
          id="season-start"
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="primary" disabled={submitting || !name.trim() || !startDate}>
        {submitting ? 'Creando...' : 'Crear temporada'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function CloseSeasonButton({ season, onClosed }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleClose() {
    setSubmitting(true);
    setError(null);
    try {
      await competitionClient.closeSeason(season.id);
      await onClosed();
    } catch (err) {
      setError(describeCompetitionError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (season.status !== 'OPEN') {
    return null;
  }

  return (
    <div className="mt-3">
      <Button variant="ghost" onClick={handleClose} disabled={submitting}>
        {submitting ? 'Cerrando...' : 'Cerrar temporada'}
      </Button>
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  );
}

function SeasonPanel({ isAdmin, seasons, selectedSeasonId, onSelectSeason, onSeasonsChanged }) {
  const selectedSeason = seasons?.find((s) => s.id === selectedSeasonId) ?? null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-canvas p-6">
      <h3 className="font-display text-lg font-semibold text-primary">Temporadas</h3>

      {seasons === null ? <p className="mt-2 text-sm text-secondary">Cargando...</p> : null}
      {seasons?.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">Todavía no hay ninguna temporada.</p>
      ) : null}

      {seasons?.length > 0 ? (
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-secondary" htmlFor="season-select">
            Temporada activa en esta vista
            <select
              id="season-select"
              value={selectedSeasonId}
              onChange={(e) => onSelectSeason(e.target.value)}
              className="rounded-md border border-neutral-300 bg-canvas px-3 py-1.5 text-sm"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.status === 'CLOSED' ? '(cerrada)' : '(abierta)'}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {isAdmin ? (
        <>
          {selectedSeason ? (
            <CloseSeasonButton season={selectedSeason} onClosed={onSeasonsChanged} />
          ) : null}
          <CreateSeasonForm onCreated={onSeasonsChanged} />
        </>
      ) : null}
    </div>
  );
}

function CategoryModalitySelector({ category, modality, onCategoryChange, onModalityChange }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-2" role="tablist" aria-label="Modalidad">
        {MODALITIES.map((m) => (
          <button
            key={m.code}
            type="button"
            role="tab"
            aria-selected={modality.code === m.code}
            onClick={() => onModalityChange(m)}
            className={`rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide ${
              modality.code === m.code ? 'bg-navy-500 text-on-inverse' : 'bg-sunken text-secondary'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.code}
            type="button"
            onClick={() => onCategoryChange(cat)}
            aria-pressed={category.code === cat.code}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              category.code === cat.code
                ? 'border-navy-500 bg-navy-50 text-primary'
                : 'border-neutral-200 text-secondary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
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

function RecordMatchForm({ seasonId, category, modality, onRecorded }) {
  const slotsPerSide = modality.code === 'SINGLES' ? 1 : 2;
  const [emailsA, setEmailsA] = useState(() => Array(slotsPerSide).fill(''));
  const [emailsB, setEmailsB] = useState(() => Array(slotsPerSide).fill(''));
  const [setsWonA, setSetsWonA] = useState('');
  const [setsWonB, setSetsWonB] = useState('');
  const [playedAt, setPlayedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEmailsA(Array(slotsPerSide).fill(''));
    setEmailsB(Array(slotsPerSide).fill(''));
  }, [slotsPerSide]);

  function updateEmail(side, index, value) {
    const setter = side === 'A' ? setEmailsA : setEmailsB;
    setter((prev) => prev.map((email, i) => (i === index ? value : email)));
  }

  const validScore = setsWonA !== '' && setsWonB !== '' && Number(setsWonA) !== Number(setsWonB);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let participantsA;
    let participantsB;
    try {
      [participantsA, participantsB] = await Promise.all([
        Promise.all(
          emailsA.map((email) => membershipClient.lookupUser(email.trim()).then((u) => u.id)),
        ),
        Promise.all(
          emailsB.map((email) => membershipClient.lookupUser(email.trim()).then((u) => u.id)),
        ),
      ]);
    } catch (err) {
      setError(describeIdentityError(err));
      setSubmitting(false);
      return;
    }

    try {
      const a = Number(setsWonA);
      const b = Number(setsWonB);
      await competitionClient.recordMatch({
        seasonId,
        category: category.code,
        modality: modality.code,
        participantsA,
        participantsB,
        winnerSide: a > b ? 'A' : 'B',
        setsWonA: a,
        setsWonB: b,
        playedAt,
        notes: notes.trim() || undefined,
      });
      setEmailsA(Array(slotsPerSide).fill(''));
      setEmailsB(Array(slotsPerSide).fill(''));
      setSetsWonA('');
      setSetsWonB('');
      setPlayedAt('');
      setNotes('');
      await onRecorded();
    } catch (err) {
      setError(describeCompetitionError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <h4 className="font-display font-semibold text-primary">Registrar resultado</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Lado A</p>
          {emailsA.map((email, i) => (
            <ParticipantSlot
              // eslint-disable-next-line react/no-array-index-key
              key={`a-${i}`}
              id={`participant-a-${i}`}
              label={slotsPerSide === 1 ? 'Jugador' : `Jugador ${i + 1}`}
              value={email}
              onChange={(value) => updateEmail('A', i, value)}
            />
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Lado B</p>
          {emailsB.map((email, i) => (
            <ParticipantSlot
              // eslint-disable-next-line react/no-array-index-key
              key={`b-${i}`}
              id={`participant-b-${i}`}
              label={slotsPerSide === 1 ? 'Jugador' : `Jugador ${i + 1}`}
              value={email}
              onChange={(value) => updateEmail('B', i, value)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="sets-won-a">
            Sets ganados (A)
          </label>
          <input
            id="sets-won-a"
            type="number"
            min="0"
            max="5"
            required
            value={setsWonA}
            onChange={(e) => setSetsWonA(e.target.value)}
            className="mt-1 w-20 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="sets-won-b">
            Sets ganados (B)
          </label>
          <input
            id="sets-won-b"
            type="number"
            min="0"
            max="5"
            required
            value={setsWonB}
            onChange={(e) => setSetsWonB(e.target.value)}
            className="mt-1 w-20 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary" htmlFor="played-at">
            Fecha del partido
          </label>
          <input
            id="played-at"
            type="date"
            required
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary" htmlFor="match-notes">
          Notas (opcional)
        </label>
        <input
          id="match-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" variant="primary" disabled={submitting || !validScore || !playedAt}>
        {submitting ? 'Guardando...' : 'Registrar resultado'}
      </Button>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </form>
  );
}

function VoidMatchForm({ matchId, onVoided }) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await competitionClient.voidMatch(matchId, reason);
      setShowForm(false);
      setReason('');
      await onVoided();
    } catch (err) {
      setError(describeCompetitionError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!showForm) {
    return (
      <Button variant="ghost" onClick={() => setShowForm(true)}>
        Anular
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <div>
        <label className="sr-only" htmlFor={`void-reason-${matchId}`}>
          Motivo de anulación
        </label>
        <input
          id={`void-reason-${matchId}`}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo de anulación"
          className="w-64 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="danger" disabled={submitting}>
        {submitting ? 'Anulando...' : 'Confirmar anulación'}
      </Button>
      <Button variant="ghost" onClick={() => setShowForm(false)}>
        Cancelar
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function MatchHistoryList({ seasonId, category, modality, refreshToken }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  function refetch() {
    return competitionClient
      .listMatches({ seasonId, category: category.code, modality: modality.code })
      .then((data) => setMatches(data.matches))
      .catch((err) => setError(describeCompetitionError(err)));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, category, modality, refreshToken]);

  function sideLabel(participants) {
    return participants
      .map((p) => (p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : 'Jugador'))
      .join(' / ');
  }

  return (
    <div className="mt-8">
      <h4 className="font-display font-semibold text-primary">Historial de partidos</h4>

      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {!error && matches === null ? (
        <p className="mt-2 text-sm text-secondary">Cargando...</p>
      ) : null}
      {matches?.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">Sin partidos registrados todavía.</p>
      ) : null}

      {matches?.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {matches.map((match) => (
            <li key={match.id} className="rounded-md bg-raised px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-primary">
                  {`${sideLabel(match.participantsA)} vs ${sideLabel(match.participantsB)}`}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                  {DATE_FORMATTER.format(new Date(match.playedAt))}
                </span>
              </div>
              <p className="mt-1 text-secondary">
                {match.setsWonA}-{match.setsWonB} · gana lado {match.winnerSide}
                {match.status === 'VOID' ? (
                  <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-error">
                    Anulado
                  </span>
                ) : null}
              </p>
              {match.status !== 'VOID' ? (
                <div className="mt-2">
                  <VoidMatchForm matchId={match.id} onVoided={refetch} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CompetitionPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles ?? []).includes(ROLE_CODES.ADMINISTRADOR);

  const [seasons, setSeasons] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [modality, setModality] = useState(MODALITIES[0]);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);

  function refetchSeasons() {
    return competitionClient
      .listSeasons()
      .then((data) => {
        setSeasons(data.seasons);
        setSelectedSeasonId((current) => {
          if (current && data.seasons.some((s) => s.id === current)) return current;
          const defaultSeason = data.seasons.find((s) => s.status === 'OPEN') ?? data.seasons[0];
          return defaultSeason?.id ?? '';
        });
      })
      .catch(() => setSeasons([]));
  }

  useEffect(() => {
    refetchSeasons();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Competición</h1>
      <p className="mt-1 text-secondary">
        Gestiona temporadas y registra resultados de partidos para el ranking interno del club.
      </p>

      <div className="mt-6">
        <SeasonPanel
          isAdmin={isAdmin}
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onSelectSeason={setSelectedSeasonId}
          onSeasonsChanged={refetchSeasons}
        />
      </div>

      {selectedSeasonId ? (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-canvas p-6">
          <CategoryModalitySelector
            category={category}
            modality={modality}
            onCategoryChange={setCategory}
            onModalityChange={setModality}
          />
          <RecordMatchForm
            key={`${selectedSeasonId}-${category.code}-${modality.code}`}
            seasonId={selectedSeasonId}
            category={category}
            modality={modality}
            onRecorded={() => setHistoryRefreshToken((n) => n + 1)}
          />
          <MatchHistoryList
            seasonId={selectedSeasonId}
            category={category}
            modality={modality}
            refreshToken={historyRefreshToken}
          />
        </div>
      ) : null}
    </div>
  );
}
