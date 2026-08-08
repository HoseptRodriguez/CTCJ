// Fixed catalog, computed live on every call from data that already exists
// elsewhere -- no persisted achievements table, no unlock-event write path,
// mirroring the Phase 1 dashboards decision to derive "recent activity"
// from existing timestamped rows instead of building a real audit log.
// Trade-off (disclosed in the Phase 2 plan): no "earned on this date"
// timestamp is possible this way -- badges are earned/not-earned only.
const CATALOG = [
  { code: 'FIRST_WIN', label: 'Primera victoria' },
  { code: 'TEN_WINS', label: '10 victorias' },
  { code: 'TOP_10_RANKING', label: 'Top 10 del ranking' },
  { code: 'OUTSTANDING_RATING', label: 'Evaluación sobresaliente' },
  { code: 'FULL_WEEK', label: 'Semana completa' },
];

/**
 * @param {{
 *   competitionProgressProvider: import('../ports/CompetitionProgressProvider.js').CompetitionProgressProvider,
 *   performanceProgressProvider: import('../ports/PerformanceProgressProvider.js').PerformanceProgressProvider,
 *   trainingFrequencyProvider: import('../ports/TrainingFrequencyProvider.js').TrainingFrequencyProvider,
 * }} deps
 */
export function createGetMyAchievements({
  competitionProgressProvider,
  performanceProgressProvider,
  trainingFrequencyProvider,
}) {
  /** @param {{ userId: string }} input */
  return async function getMyAchievements({ userId }) {
    const [competitionSummary, performance, trainingFrequency] = await Promise.all([
      competitionProgressProvider.getMySummary(userId),
      performanceProgressProvider.getMyPerformance(userId),
      trainingFrequencyProvider.getMyTrainingFrequency(userId, 7),
    ]);

    const totalWins = competitionSummary.categories.reduce((sum, c) => sum + c.wins, 0);
    const bestRank = competitionSummary.categories.reduce(
      (best, c) => (c.rank != null && (best == null || c.rank < best) ? c.rank : best),
      null,
    );
    const bestRating = Object.values(performance.summary.latestByArea).reduce(
      (max, rating) => Math.max(max, rating),
      0,
    );

    const earnedByCode = {
      FIRST_WIN: totalWins >= 1,
      TEN_WINS: totalWins >= 10,
      TOP_10_RANKING: bestRank != null && bestRank <= 10,
      OUTSTANDING_RATING: bestRating >= 8,
      FULL_WEEK: trainingFrequency.count >= 3,
    };

    return {
      badges: CATALOG.map((badge) => ({ ...badge, earned: earnedByCode[badge.code] })),
    };
  };
}
