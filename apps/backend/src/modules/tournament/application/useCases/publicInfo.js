import { TOURNAMENT_STATUS } from '../../domain/entities/Tournament.js';
import { InvalidTournamentState } from '../../domain/errors/InvalidTournamentState.js';
import { MatchAlreadyRecorded } from '../errors/MatchAlreadyRecorded.js';
import { MatchNotFound } from '../errors/MatchNotFound.js';
import { TournamentNotFound } from '../errors/TournamentNotFound.js';
import { matchChanged, tournamentOpened } from '../events/tournamentEvents.js';

const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const asDate = (value) => (value ? new Date(`${value}T00:00:00Z`) : null);

/** "Final", "Semifinal", "Cuartos de final", "Octavos de final", "Ronda 1"... */
export function roundName(round, totalRounds) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Cuartos de final';
  if (fromEnd === 3) return 'Octavos de final';
  return `Ronda ${round}`;
}

/**
 * Public site (/torneos) and the notices tied to it.
 *
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   publicNameProvider: { displayNames: (playerIds: string[]) => Promise<Map<string, string>> },
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createPublicTournamentUseCases({
  tournamentRepository,
  publicNameProvider,
  clock,
  clubId,
}) {
  async function load(tournamentId) {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) throw new TournamentNotFound();
    return tournament;
  }

  function publicSummary(t) {
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      modality: t.modality,
      status: t.publicStatus,
      startsOn: ymd(t.startsOn),
      endsOn: ymd(t.endsOn),
    };
  }

  return {
    /**
     * Administración: dates, and "Publicar" (opens registration publicly
     * and tells whoever authorized "Nuevos torneos", once).
     * @param {{ tournamentId: string, startsOn?: string|null, endsOn?: string|null, publish?: boolean }} input
     */
    async setTournamentPublicInfo({ tournamentId, startsOn, endsOn, publish = false }) {
      const tournament = await load(tournamentId);
      if (publish && tournament.status !== TOURNAMENT_STATUS.DRAFT && !tournament.publishedAt) {
        // In progress already: it's public anyway, nothing to "open".
        publish = false;
      }
      const published = tournament.setPublicInfo({
        startsOn: startsOn === undefined ? undefined : asDate(startsOn),
        endsOn: endsOn === undefined ? undefined : asDate(endsOn),
        publish,
        now: clock.now(),
      });
      return tournamentRepository.update(tournament, {
        events: published ? [tournamentOpened(tournament)] : [],
      });
    },

    /**
     * Staff: when and where a match is played. Its players are told when
     * the time or the court changes.
     * @param {{ tournamentId: string, matchId: string, scheduledAt: string|null, courtName: string|null }} input
     */
    async scheduleMatch({ tournamentId, matchId, scheduledAt, courtName }) {
      const tournament = await load(tournamentId);
      tournament.assertDrawGenerated('scheduleMatch');
      const match = await tournamentRepository.findMatchById(matchId);
      if (!match || match.tournamentId !== tournamentId) throw new MatchNotFound();
      if (match.setsWonA != null) throw new MatchAlreadyRecorded();
      const when = scheduledAt ? new Date(scheduledAt) : null;
      const court = courtName?.trim() || null;
      const changes = [];
      if (
        (when?.getTime() ?? null) !==
        (match.scheduledAt ? new Date(match.scheduledAt).getTime() : null)
      ) {
        changes.push('HORA');
      }
      if (court !== (match.courtName ?? null)) changes.push('CANCHA');
      const updated = { ...match, scheduledAt: when, courtName: court };
      const participants = await tournamentRepository.listParticipants(tournamentId);
      const hasPlayers = match.participantAId || match.participantBId;
      return tournamentRepository.saveMatchSchedule({
        matchId,
        scheduledAt: when,
        courtName: court,
        events:
          changes.length && hasPlayers
            ? [matchChanged(tournament, participants, updated, changes)]
            : [],
      });
    },

    /** For notifications (announcements to "inscritos en un torneo"). */
    async getTournamentAudience({ tournamentId }) {
      const tournament = await tournamentRepository.findById(tournamentId);
      if (!tournament) return null;
      const participants = await tournamentRepository.listParticipants(tournamentId);
      return {
        name: tournament.name,
        playerIds: [...new Set(participants.flatMap((p) => p.playerIds))],
      };
    },

    /** /torneos: open, in progress and finished (never drafts or cancelled). */
    async listPublicTournaments() {
      const rows = await tournamentRepository.listPublic(clubId);
      return { tournaments: rows.map(publicSummary) };
    },

    /**
     * /torneos/:id -- dates, category, brackets and results. Players appear
     * only with their name (a minor: first name and initial, unless the
     * guardian authorized the full name); never contact data or ids.
     */
    async getPublicTournament({ tournamentId }) {
      const tournament = await tournamentRepository.findById(tournamentId);
      if (!tournament || tournament.clubId !== clubId || !tournament.publicStatus) {
        throw new TournamentNotFound();
      }
      const [participants, matches] = await Promise.all([
        tournamentRepository.listParticipants(tournamentId),
        tournamentRepository.listMatches(tournamentId),
      ]);
      const names = await publicNameProvider.displayNames([
        ...new Set(participants.flatMap((p) => p.playerIds)),
      ]);
      const entry = (participantId) => {
        const p = participants.find((x) => x.id === participantId);
        if (!p) return null;
        return {
          seed: p.seed ?? null,
          names: p.playerIds.map((id) => names.get(id) ?? 'Jugador del club'),
        };
      };
      const totalRounds = matches.reduce((max, m) => Math.max(max, m.round), 0);
      const rounds = [];
      for (let round = 1; round <= totalRounds; round += 1) {
        rounds.push({
          round,
          name: roundName(round, totalRounds),
          matches: matches
            .filter((m) => m.round === round)
            .map((m) => {
              const bye = m.winnerParticipantId != null && m.setsWonA == null;
              return {
                id: m.id,
                slot: m.slot,
                a: entry(m.participantAId),
                b: entry(m.participantBId),
                winner:
                  m.winnerParticipantId == null
                    ? null
                    : m.winnerParticipantId === m.participantAId
                      ? 'A'
                      : 'B',
                score: m.setsWonA == null ? null : `${m.setsWonA}-${m.setsWonB}`,
                bye,
                scheduledAt: m.scheduledAt ? new Date(m.scheduledAt).toISOString() : null,
                courtName: m.courtName ?? null,
                playedAt: ymd(m.playedAt),
              };
            }),
        });
      }
      const champion = tournament.championId ? entry(tournament.championId) : null;
      return {
        tournament: { ...publicSummary(tournament), champion },
        participants: participants
          .map((p) => entry(p.id))
          .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999)),
        rounds,
      };
    },
  };
}

export { InvalidTournamentState };
