import { useEffect, useState } from 'react';

import { challengesClient } from '../../api/challengesClient.js';
import { competitionClient } from '../../api/competitionClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { tournamentClient } from '../../api/tournamentClient.js';
import { CheckIcon } from '../../components/icons/CheckIcon.jsx';
import { SearchIcon } from '../../components/icons/SearchIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { SelectField, TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { cn } from '../../components/ui/cn.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { describeChallengesError } from '../../lib/challengesErrorMessages.js';
import { clubTodayKey } from '../../lib/clubTime.js';
import { useAsync } from '../../lib/useAsync.js';

import { MASTERS_TOP } from './homeSections.jsx';
import { useMyCtcj } from './MyCtcjContext.jsx';
import {
  CATEGORY_LABELS,
  CHALLENGE_STATUS_LABELS,
  DATE_MEDIUM,
  MODALITY_LABELS,
  SectionCard,
  personName,
} from './shared.jsx';

/** Mi CTCJ → Ranking. */
export function RankingTab() {
  useDocumentTitle('Ranking');
  const summary = useAsync(() => competitionClient.getMyCompetitionSummary({ matchLimit: 10 }), []);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Ranking"
        description={`Tu posición, la tabla de la temporada y tus retos. Los ${MASTERS_TOP} primeros de cada categoría van al Masters.`}
        className="mb-0 md:mb-0"
      />
      <MyRankingSummary summary={summary} />
      <StandingsTable summary={summary} />
      <ChallengesSection />
      <ClubActivity />
    </div>
  );
}

function MyRankingSummary({ summary }) {
  return (
    <SectionCard
      title="Ranking interno"
      description="Tu posición y récord de la temporada, calculados con tus partidos."
      async={summary}
      isEmpty={(s) => !s.hasSeason || s.categories.length === 0}
      empty={{
        title: 'Aún no apareces en el ranking',
        description:
          'Tu posición aparece cuando juegas tu primer partido de la temporada. Reta a alguien más abajo.',
      }}
    >
      {(s) => (
        <div className="space-y-6">
          <ul className="grid gap-4 sm:grid-cols-2">
            {s.categories.map((c) => (
              <li key={`${c.category}-${c.modality}`} className="rounded-xl bg-page p-4">
                <p className="text-body font-semibold text-ink-soft">
                  {CATEGORY_LABELS[c.category] ?? c.category} ·{' '}
                  {MODALITY_LABELS[c.modality] ?? c.modality}
                </p>
                <p className="font-display text-[3rem] font-bold leading-none text-navy-500">
                  <span className="sr-only">Puesto </span>#{c.rank}
                </p>
                <p className="mt-2 text-body text-ink">
                  {c.wins} ganados · {c.losses} perdidos · {c.points} puntos
                </p>
                {c.qualifiesForMasters && (
                  <p className="mt-2">
                    <StatusBadge status="al-dia" label="Clasifica al Masters" />
                  </p>
                )}
              </li>
            ))}
          </ul>
          {s.recentMatches.length > 0 && (
            <div>
              <h3 className="font-display text-h3 font-bold text-ink">Tus partidos recientes</h3>
              <ul className="mt-3 space-y-2">
                {s.recentMatches.map((match) => {
                  const opponents = (match.won ? match.participantsB : match.participantsA)
                    .map(personName)
                    .filter(Boolean)
                    .join(' / ');
                  return (
                    <li
                      key={match.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-page p-3"
                    >
                      <span className="text-body text-ink">
                        vs. {opponents || 'Rival desconocido'} ·{' '}
                        {DATE_MEDIUM.format(new Date(match.playedAt))}
                      </span>
                      <StatusBadge
                        status={match.won ? 'al-dia' : 'suspendida'}
                        label={match.won ? 'Victoria' : 'Derrota'}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function StandingsTable({ summary }) {
  const { user } = useMyCtcj();
  const mine = summary.data?.categories?.[0];
  const [category, setCategory] = useState('TERCERA');
  const [modality, setModality] = useState('SINGLES');

  // Start on the player's own category once their summary arrives.
  useEffect(() => {
    if (mine) {
      setCategory(mine.category);
      setModality(mine.modality);
    }
  }, [mine?.category, mine?.modality]); // eslint-disable-line react-hooks/exhaustive-deps

  const standings = useAsync(
    () => competitionClient.getStandings({ category, modality }).then((d) => d.standings),
    [category, modality],
  );

  return (
    <SectionCard
      title="Tabla de la temporada"
      async={standings}
      actions={
        <div className="flex flex-wrap gap-4">
          <SelectField
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <SegmentedControl
            label="Modalidad"
            value={modality}
            onChange={setModality}
            options={Object.entries(MODALITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      }
      isEmpty={(rows) => rows.length === 0}
      empty={{
        title: 'Todavía no hay partidos en esta categoría',
        description: 'Elige otra categoría o modalidad.',
      }}
    >
      {(rows) => (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-separate border-spacing-y-1 text-left">
            <caption className="sr-only">
              Posiciones de {CATEGORY_LABELS[category]}, {MODALITY_LABELS[modality]}
            </caption>
            <thead>
              <tr className="text-body-sm text-ink-soft">
                <th scope="col" className="px-3 py-2">
                  Puesto
                </th>
                <th scope="col" className="px-3 py-2">
                  Jugador
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Puntos
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Partidos
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMe = row.playerId === user?.id;
                return (
                  <tr
                    key={row.playerId}
                    aria-current={isMe ? 'true' : undefined}
                    className={cn(
                      isMe
                        ? 'bg-lime font-bold'
                        : row.qualifiesForMasters
                          ? 'bg-status-ok-bg'
                          : 'bg-page',
                    )}
                  >
                    <td className="rounded-l-lg px-3 py-3 font-display text-h3 font-bold">
                      {row.rank}
                    </td>
                    <td className="px-3 py-3 text-body">
                      {row.playerName ?? 'Jugador'}
                      {isMe && ' (tú)'}
                      {row.qualifiesForMasters && (
                        <span className="ml-2 text-body-sm font-semibold text-status-ok-fg">
                          Masters
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-body font-semibold">{row.points}</td>
                    <td className="rounded-r-lg px-3 py-3 text-right text-body">
                      {row.matchesPlayed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function PlayerSearchAndChallenge({ onChallenged }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [challengingId, setChallengingId] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setPlayers([]);
      return undefined;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      membershipClient
        .searchPlayers(query.trim())
        .then((data) => !cancelled && setPlayers(data.players))
        .catch(() => !cancelled && setPlayers([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  async function handleChallenge(player) {
    setSubmitting(true);
    setError(null);
    try {
      await challengesClient.createChallenge({
        opponentUserId: player.id,
        message: message.trim() || undefined,
      });
      toast({ title: 'Reto enviado', description: `${personName(player)} recibirá tu reto.` });
      setChallengingId(null);
      setMessage('');
      setQuery('');
      setPlayers([]);
      await onChallenged();
    } catch (err) {
      setError(describeChallengesError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-page p-4">
      <TextField
        label="Buscar jugador"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Escribe al menos 2 letras del nombre"
        hint="Reta a un jugador del club a un partido amistoso."
      />
      {players.length > 0 && (
        <ul className="mt-4 space-y-3" aria-label="Jugadores encontrados">
          {players.map((player) => (
            <li key={player.id} className="rounded-lg bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body font-semibold text-ink">{personName(player)}</span>
                {challengingId !== player.id && (
                  <Button variant="secondary" onClick={() => setChallengingId(player.id)}>
                    Retar
                  </Button>
                )}
              </div>
              {challengingId === player.id && (
                <div className="mt-3 space-y-3">
                  <TextField
                    label="Mensaje (opcional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button
                    loading={submitting}
                    loadingText="Enviando…"
                    onClick={() => handleChallenge(player)}
                  >
                    Enviar reto
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 text-body font-semibold text-danger">
          {error}
        </p>
      )}
      {query.trim().length >= 2 && players.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-body-sm text-ink-soft">
          <SearchIcon className="h-4 w-4" /> Sin resultados por ahora.
        </p>
      )}
    </div>
  );
}

/**
 * ACCEPTED challenges need a score entered by each player before they
 * become a real match; this form covers the first entry and editing your
 * own prior one (submit() overwrites it before confirmation).
 */
function MatchScoreForm({ challenge, onSubmitted }) {
  const toast = useToast();
  const existing = challenge.matchResult?.mySubmission ?? null;
  const [category, setCategory] = useState(existing?.category ?? Object.keys(CATEGORY_LABELS)[0]);
  const [mySetsWon, setMySetsWon] = useState(existing?.mySetsWon ?? '');
  const [opponentSetsWon, setOpponentSetsWon] = useState(existing?.opponentSetsWon ?? '');
  const [playedAt, setPlayedAt] = useState(
    existing?.playedAt ? String(existing.playedAt).slice(0, 10) : clubTodayKey(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await challengesClient.submitMatchScore(challenge.id, {
        category,
        mySetsWon: Number(mySetsWon),
        opponentSetsWon: Number(opponentSetsWon),
        playedAt,
      });
      toast({ title: 'Resultado enviado' });
      await onSubmitted();
    } catch (err) {
      setError(describeChallengesError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField
        label="Categoría"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <TextField
        label="Sets que ganaste"
        type="number"
        inputMode="numeric"
        min="0"
        max="5"
        value={mySetsWon}
        onChange={(e) => setMySetsWon(e.target.value)}
      />
      <TextField
        label="Sets que ganó tu rival"
        type="number"
        inputMode="numeric"
        min="0"
        max="5"
        value={opponentSetsWon}
        onChange={(e) => setOpponentSetsWon(e.target.value)}
      />
      <TextField
        label="Fecha del partido"
        type="date"
        value={playedAt}
        onChange={(e) => setPlayedAt(e.target.value)}
      />
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" icon={<CheckIcon />} loading={submitting} loadingText="Enviando…">
          {existing ? 'Actualizar resultado' : 'Enviar resultado'}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-body font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function ChallengesSection() {
  const toast = useToast();
  const challenges = useAsync(
    () => challengesClient.getMyChallenges().then((d) => d.challenges),
    [],
  );
  const [cancelling, setCancelling] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function act(fn, id, title) {
    setBusyId(id);
    try {
      await fn(id);
      toast({ title });
      challenges.reload();
    } catch (err) {
      toast({
        title: 'No se pudo completar',
        description: describeChallengesError(err),
        tone: 'error',
      });
    } finally {
      setBusyId(null);
      setCancelling(null);
    }
  }

  return (
    <Card title="Retos" description="Busca un jugador para retarlo a un partido amistoso.">
      <PlayerSearchAndChallenge onChallenged={challenges.reload} />
      <SectionCardless async={challenges}>
        {(list) => {
          const received = list.filter((c) => c.role === 'OPPONENT' && c.status === 'PENDING');
          // ACCEPTED ones are for either player to score, whatever their role.
          const toConfirm = list.filter((c) => c.status === 'ACCEPTED');
          const sent = list.filter((c) => c.role === 'CHALLENGER' && c.status !== 'ACCEPTED');
          return (
            <div className="mt-6 space-y-8">
              {received.length > 0 && (
                <div>
                  <h3 className="font-display text-h3 font-bold text-ink">Retos recibidos</h3>
                  <ul className="mt-3 space-y-3">
                    {received.map((c) => (
                      <li key={c.id} className="rounded-lg bg-page p-4">
                        <p className="text-body font-semibold">
                          {personName(c.otherParty) ?? 'Jugador'}
                          {c.message ? (
                            <span className="font-normal text-ink-soft"> · “{c.message}”</span>
                          ) : null}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Button
                            icon={<CheckIcon />}
                            loading={busyId === c.id}
                            onClick={() =>
                              act(challengesClient.acceptChallenge, c.id, 'Reto aceptado')
                            }
                          >
                            Aceptar
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={busyId === c.id}
                            onClick={() =>
                              act(challengesClient.rejectChallenge, c.id, 'Reto rechazado')
                            }
                          >
                            Rechazar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {toConfirm.length > 0 && (
                <div>
                  <h3 className="font-display text-h3 font-bold text-ink">
                    Partidos por confirmar
                  </h3>
                  <ul className="mt-3 space-y-4">
                    {toConfirm.map((c) => {
                      const opponent = personName(c.otherParty) ?? 'Jugador';
                      const mr = c.matchResult;
                      return (
                        <li key={c.id} className="rounded-lg bg-page p-4">
                          <p className="text-body font-semibold">vs. {opponent}</p>
                          {mr?.mismatch ? (
                            <div
                              role="alert"
                              className="mt-2 rounded-lg border-2 border-danger bg-danger-soft p-3 text-body text-ink"
                            >
                              Los resultados no coinciden. Revisa y vuelve a enviar el resultado.
                              <p className="mt-1 text-body-sm">
                                Tu resultado: {mr.mySubmission.mySetsWon}-
                                {mr.mySubmission.opponentSetsWon} (
                                {CATEGORY_LABELS[mr.mySubmission.category] ??
                                  mr.mySubmission.category}
                                )
                                <br />
                                Resultado de {opponent}: {mr.opponentSubmission.mySetsWon}-
                                {mr.opponentSubmission.opponentSetsWon} (
                                {CATEGORY_LABELS[mr.opponentSubmission.category] ??
                                  mr.opponentSubmission.category}
                                )
                              </p>
                            </div>
                          ) : mr?.mySubmission && !mr?.opponentSubmission ? (
                            <p className="mt-1 text-body text-ink-soft">
                              Esperando que {opponent} registre el resultado.
                            </p>
                          ) : null}
                          <MatchScoreForm challenge={c} onSubmitted={challenges.reload} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {sent.length > 0 && (
                <div>
                  <h3 className="font-display text-h3 font-bold text-ink">Retos enviados</h3>
                  <ul className="mt-3 space-y-3">
                    {sent.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-page p-4"
                      >
                        <span className="text-body">
                          {personName(c.otherParty) ?? 'Jugador'} ·{' '}
                          <strong>{CHALLENGE_STATUS_LABELS[c.status] ?? c.status}</strong>
                        </span>
                        {c.status === 'PENDING' && (
                          <Button variant="ghost" onClick={() => setCancelling(c)}>
                            Cancelar reto
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {received.length + toConfirm.length + sent.length === 0 && (
                <p className="text-body text-ink-soft">
                  No tienes retos todavía. Busca un jugador arriba para retarlo.
                </p>
              )}
              <ConfirmDialog
                open={cancelling != null}
                title="¿Cancelar este reto?"
                description={
                  cancelling
                    ? `${personName(cancelling.otherParty) ?? 'El jugador'} ya no podrá aceptarlo.`
                    : ''
                }
                confirmLabel="Sí, cancelar reto"
                loading={busyId === cancelling?.id}
                onConfirm={() =>
                  act(challengesClient.cancelChallenge, cancelling.id, 'Reto cancelado')
                }
                onCancel={() => setCancelling(null)}
              />
            </div>
          );
        }}
      </SectionCardless>
    </Card>
  );
}

/** SectionCard's loading/error handling without its own card frame. */
function SectionCardless({ async, children }) {
  if (async.status === 'error') {
    return (
      <p role="alert" className="mt-6 text-body text-ink">
        No pudimos cargar tus retos.{' '}
        <button
          type="button"
          onClick={async.reload}
          className="focus-ring rounded font-semibold text-navy-500 underline"
        >
          Intentar de nuevo
        </button>
      </p>
    );
  }
  if (async.status !== 'ready')
    return <p className="mt-6 text-body text-ink-soft">Cargando tus retos…</p>;
  return children(async.data);
}

function ClubActivity() {
  const activity = useAsync(
    () =>
      Promise.all([
        competitionClient.getRecentClubMatches(),
        tournamentClient.listTournaments(),
      ]).then(([m, t]) => {
        const matches = m.matches.map((match) => {
          const winners = match.winnerSide === 'A' ? match.participantsA : match.participantsB;
          const losers = match.winnerSide === 'A' ? match.participantsB : match.participantsA;
          const names = (list) => list.map(personName).filter(Boolean).join(' / ') || 'Jugador';
          return {
            id: `match-${match.id}`,
            at: match.playedAt,
            text: `${names(winners)} venció a ${names(losers)} · ${CATEGORY_LABELS[match.category] ?? match.category} / ${MODALITY_LABELS[match.modality] ?? match.modality}`,
          };
        });
        const tournaments = t.tournaments
          .filter((x) => x.status === 'COMPLETED')
          .map((x) => ({
            id: `tournament-${x.id}`,
            at: x.completedAt,
            text: `Torneo finalizado: ${x.name}`,
          }));
        return [...matches, ...tournaments]
          .sort((a, b) => new Date(b.at) - new Date(a.at))
          .slice(0, 15);
      }),
    [],
  );
  return (
    <SectionCard
      title="Actividad del club"
      description="Resultados recientes y torneos finalizados."
      async={activity}
      isEmpty={(items) => items.length === 0}
      empty={{
        title: 'Sin actividad reciente',
        description: 'Cuando se registren partidos o terminen torneos, aparecerán aquí.',
      }}
    >
      {(items) => (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-page p-3"
            >
              <span className="text-body text-ink">{item.text}</span>
              <span className="text-body-sm text-ink-soft">
                {DATE_MEDIUM.format(new Date(item.at))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
