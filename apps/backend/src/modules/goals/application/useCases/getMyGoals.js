import { GOAL_METRIC_TYPE, GOAL_STATUS } from '@ctcj/shared';

function filterCategories(categories, targetCategory, targetModality) {
  return categories.filter(
    (c) =>
      (!targetCategory || c.category === targetCategory) &&
      (!targetModality || c.modality === targetModality),
  );
}

function computeProgress(goal, { competitionSummary, performance, trainingFrequency }) {
  switch (goal.metricType) {
    case GOAL_METRIC_TYPE.SKILL_RATING: {
      const currentProgress = performance.summary.latestByArea[goal.targetArea] ?? 0;
      return { currentProgress, achieved: currentProgress >= goal.targetValue };
    }
    case GOAL_METRIC_TYPE.MATCH_WINS: {
      const relevant = filterCategories(
        competitionSummary.categories,
        goal.targetCategory,
        goal.targetModality,
      );
      const currentProgress = relevant.reduce((sum, c) => sum + c.wins, 0);
      return { currentProgress, achieved: currentProgress >= goal.targetValue };
    }
    case GOAL_METRIC_TYPE.RANKING_POSITION: {
      const relevant = filterCategories(
        competitionSummary.categories,
        goal.targetCategory,
        goal.targetModality,
      );
      const bestRank = relevant.reduce(
        (best, c) => (c.rank != null && (best == null || c.rank < best) ? c.rank : best),
        null,
      );
      return {
        currentProgress: bestRank,
        achieved: bestRank != null && bestRank <= goal.targetValue,
      };
    }
    case GOAL_METRIC_TYPE.TRAINING_FREQUENCY: {
      const currentProgress = trainingFrequency.count;
      return { currentProgress, achieved: currentProgress >= goal.targetValue };
    }
    // CUSTOM is never auto-tracked -- the player marks it achieved themselves.
    case GOAL_METRIC_TYPE.CUSTOM:
    default:
      return { currentProgress: null, achieved: false };
  }
}

function percentFor(goal, currentProgress) {
  // RANKING_POSITION (lower is better) and CUSTOM (no numeric progress)
  // don't map onto a 0-100 completion bar the same way the others do.
  if (
    goal.metricType === GOAL_METRIC_TYPE.RANKING_POSITION ||
    goal.metricType === GOAL_METRIC_TYPE.CUSTOM ||
    currentProgress == null
  ) {
    return null;
  }
  return Math.min(100, Math.round((currentProgress / goal.targetValue) * 100));
}

/**
 * Self-service: the caller's own goals, with progress computed live from
 * competition/coaching/booking data on every read -- never stored/
 * duplicated on the goal row, matching how standings/rank are already
 * computed live elsewhere in this codebase. Auto-tracked goals that meet
 * their target are transitioned ACTIVE -> ACHIEVED as a side effect of this
 * read (no cron job needed), mirroring the codebase's existing preference
 * for computed-on-read over write-path-driven state.
 *
 * @param {{
 *   goalRepository: import('../ports/GoalRepository.js').GoalRepository,
 *   competitionProgressProvider: import('../ports/CompetitionProgressProvider.js').CompetitionProgressProvider,
 *   performanceProgressProvider: import('../ports/PerformanceProgressProvider.js').PerformanceProgressProvider,
 *   trainingFrequencyProvider: import('../ports/TrainingFrequencyProvider.js').TrainingFrequencyProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createGetMyGoals({
  goalRepository,
  competitionProgressProvider,
  performanceProgressProvider,
  trainingFrequencyProvider,
  clock,
}) {
  /** @param {{ playerId: string }} input */
  return async function getMyGoals({ playerId }) {
    const goals = await goalRepository.listByPlayer(playerId);
    if (goals.length === 0) {
      return { goals: [] };
    }

    const isActive = (g) => g.status === GOAL_STATUS.ACTIVE;
    const needsCompetition = goals.some(
      (g) =>
        isActive(g) &&
        (g.metricType === GOAL_METRIC_TYPE.MATCH_WINS ||
          g.metricType === GOAL_METRIC_TYPE.RANKING_POSITION),
    );
    const needsPerformance = goals.some(
      (g) => isActive(g) && g.metricType === GOAL_METRIC_TYPE.SKILL_RATING,
    );
    const needsTraining = goals.some(
      (g) => isActive(g) && g.metricType === GOAL_METRIC_TYPE.TRAINING_FREQUENCY,
    );

    const [competitionSummary, performance, trainingFrequency] = await Promise.all([
      needsCompetition ? competitionProgressProvider.getMySummary(playerId) : null,
      needsPerformance ? performanceProgressProvider.getMyPerformance(playerId) : null,
      needsTraining ? trainingFrequencyProvider.getMyTrainingFrequency(playerId, 7) : null,
    ]);

    const now = clock.now();
    const enrichedGoals = [];
    for (const goal of goals) {
      if (!isActive(goal) || goal.metricType === GOAL_METRIC_TYPE.CUSTOM) {
        enrichedGoals.push({ ...goal, currentProgress: null, percentComplete: null });
        continue;
      }

      const { currentProgress, achieved } = computeProgress(goal, {
        competitionSummary,
        performance,
        trainingFrequency,
      });
      if (achieved) {
        goal.achieve(now);
        await goalRepository.update(goal);
      }
      enrichedGoals.push({
        ...goal,
        currentProgress,
        percentComplete: percentFor(goal, currentProgress),
      });
    }

    return { goals: enrichedGoals };
  };
}
