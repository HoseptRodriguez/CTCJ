import { computeStandings } from '../../domain/services/computeStandings.js';

/**
 * Player Dashboard support: "where do I stand" without the caller needing
 * to already know their own category/modality (unlike getStandings/
 * listMatches, which both require it as an input) -- discovers every
 * (category, modality) combo the player has actually played in this
 * season, and returns their own rank/points/win-loss for each, plus a
 * flat recent-matches feed across all of them.
 *
 * @param {{
 *   competitionMatchRepository: import('../ports/CompetitionMatchRepository.js').CompetitionMatchRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clubId: string,
 * }} deps
 */
export function createGetMyCompetitionSummary({
  competitionMatchRepository,
  playerDirectoryProvider,
  seasonRepository,
  clubId,
}) {
  /** @param {{ playerId: string, matchLimit?: number }} input */
  return async function getMyCompetitionSummary({ playerId, matchLimit = 10 }) {
    const season = await seasonRepository.findOpenByClub(clubId);
    if (!season) {
      return { hasSeason: false, categories: [], recentMatches: [] };
    }

    const myMatches = await competitionMatchRepository.listByPlayer(season.id, playerId);
    if (myMatches.length === 0) {
      return { hasSeason: true, categories: [], recentMatches: [] };
    }

    function wonMatch(match) {
      const onSideA = match.participantsA.includes(playerId);
      return (onSideA && match.winnerSide === 'A') || (!onSideA && match.winnerSide === 'B');
    }

    // Discover every (category, modality) combo the player has played --
    // never assumed, always derived from their real match history.
    const combos = new Map();
    for (const match of myMatches) {
      const key = `${match.category}::${match.modality}`;
      if (!combos.has(key)) combos.set(key, { category: match.category, modality: match.modality });
    }

    const categories = [];
    for (const { category, modality } of combos.values()) {
      const allMatchesInCombo = await competitionMatchRepository.list({
        seasonId: season.id,
        category,
        modality,
        includeVoid: false,
      });
      const standings = computeStandings(allMatchesInCombo);
      const myRow = standings.find((row) => row.playerId === playerId) ?? null;

      const myMatchesInCombo = myMatches.filter(
        (m) => m.category === category && m.modality === modality,
      );
      const wins = myMatchesInCombo.filter(wonMatch).length;
      const losses = myMatchesInCombo.length - wins;
      const winPercentage =
        myMatchesInCombo.length > 0 ? Math.round((wins / myMatchesInCombo.length) * 1000) / 10 : 0;

      categories.push({
        category,
        modality,
        rank: myRow?.rank ?? null,
        points: myRow?.points ?? 0,
        qualifiesForMasters: myRow?.qualifiesForMasters ?? false,
        wins,
        losses,
        matchesPlayed: myMatchesInCombo.length,
        winPercentage,
      });
    }

    const allIds = [...new Set(myMatches.flatMap((m) => [...m.participantsA, ...m.participantsB]))];
    const playerSummaries = await playerDirectoryProvider.getPlayerSummaries(allIds);
    function enrichSide(ids) {
      return ids.map((id) => {
        const p = playerSummaries.get(id) ?? null;
        return { playerId: id, firstName: p?.firstName ?? null, lastName: p?.lastName ?? null };
      });
    }

    const recentMatches = myMatches.slice(0, matchLimit).map((match) => ({
      ...match,
      participantsA: enrichSide(match.participantsA),
      participantsB: enrichSide(match.participantsB),
      won: wonMatch(match),
    }));

    return { hasSeason: true, categories, recentMatches };
  };
}
