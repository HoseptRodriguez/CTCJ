import { COMPETITION_POINTS, MASTERS_QUALIFYING_SLOTS } from '../policies/standingsPolicy.js';

/**
 * Pure aggregation, mirrors coaching's derivePerformanceSummary shape:
 * standings are always computed fresh from raw match rows, never stored.
 * `matches` must already be filtered to one (seasonId, category, modality)
 * triple and exclude VOID rows -- this function doesn't filter, it aggregates.
 *
 * Both sides of a doubles match get individual credit -- a player's standing
 * reflects every match they played regardless of partner, matching "Sigue tu
 * posición" (track *your* position), not a persistent team identity.
 */
export function computeStandings(matches, playerNamesById = new Map()) {
  const byPlayer = new Map();

  function credit(playerId, won, setsWonBySelf, setsWonByOpponent) {
    if (!byPlayer.has(playerId)) {
      byPlayer.set(playerId, { points: 0, setsWon: 0, setsLost: 0, matchesPlayed: 0 });
    }
    const agg = byPlayer.get(playerId);
    agg.points += won ? COMPETITION_POINTS.WIN : COMPETITION_POINTS.LOSS;
    agg.setsWon += setsWonBySelf;
    agg.setsLost += setsWonByOpponent;
    agg.matchesPlayed += 1;
  }

  for (const match of matches) {
    const sideAWon = match.winnerSide === 'A';
    for (const playerId of match.participantsA) {
      credit(playerId, sideAWon, match.setsWonA, match.setsWonB);
    }
    for (const playerId of match.participantsB) {
      credit(playerId, !sideAWon, match.setsWonB, match.setsWonA);
    }
  }

  const rows = [...byPlayer.entries()].map(([playerId, agg]) => ({
    playerId,
    playerName: playerNamesById.get(playerId) ?? null,
    points: agg.points,
    setDiff: agg.setsWon - agg.setsLost,
    matchesPlayed: agg.matchesPlayed,
  }));

  // points desc -> setDiff desc -> playerName alphabetically -- a
  // deterministic final tiebreak, mirroring derivePerformanceSummary's own
  // numeric-diff-then-localeCompare pattern.
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    return (a.playerName ?? '').localeCompare(b.playerName ?? '');
  });

  // No artificial floor when a category has fewer than MASTERS_QUALIFYING_SLOTS
  // players -- everyone qualifies, which is intentional, not a bug.
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    qualifiesForMasters: index < MASTERS_QUALIFYING_SLOTS,
  }));
}
