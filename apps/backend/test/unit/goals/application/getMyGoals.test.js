import { describe, expect, it } from 'vitest';

import { createGetMyGoals } from '../../../../src/modules/goals/application/useCases/getMyGoals.js';
import { createCreateGoal } from '../../../../src/modules/goals/application/useCases/createGoal.js';

import {
  createFakeGoalRepository,
  createFakeCompetitionProgressProvider,
  createFakePerformanceProgressProvider,
  createFakeTrainingFrequencyProvider,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-10T10:00:00Z');

function buildDeps(overrides = {}) {
  const goalRepository = createFakeGoalRepository();
  return {
    goalRepository,
    competitionProgressProvider: createFakeCompetitionProgressProvider(),
    performanceProgressProvider: createFakePerformanceProgressProvider(),
    trainingFrequencyProvider: createFakeTrainingFrequencyProvider(0),
    clock: createFakeClock(NOW),
    ...overrides,
  };
}

describe('getMyGoals', () => {
  it('returns an empty list when the player has no goals', async () => {
    const deps = buildDeps();
    const getMyGoals = createGetMyGoals(deps);

    const result = await getMyGoals({ playerId: 'player-1' });

    expect(result).toEqual({ goals: [] });
  });

  it('computes SKILL_RATING progress and does not auto-achieve when below target', async () => {
    const deps = buildDeps({
      performanceProgressProvider: createFakePerformanceProgressProvider({ SERVE: 6 }),
    });
    const createGoal = createCreateGoal(deps);
    await createGoal({
      playerId: 'player-1',
      title: 'Saque a 8',
      metricType: 'SKILL_RATING',
      targetArea: 'SERVE',
      targetValue: 8,
    });

    const result = await createGetMyGoals(deps)({ playerId: 'player-1' });

    expect(result.goals).toHaveLength(1);
    expect(result.goals[0]).toMatchObject({
      status: 'ACTIVE',
      currentProgress: 6,
      percentComplete: 75,
    });
  });

  it('auto-achieves a SKILL_RATING goal once the rating meets the target', async () => {
    const deps = buildDeps({
      performanceProgressProvider: createFakePerformanceProgressProvider({ SERVE: 8 }),
    });
    const createGoal = createCreateGoal(deps);
    await createGoal({
      playerId: 'player-1',
      title: 'Saque a 8',
      metricType: 'SKILL_RATING',
      targetArea: 'SERVE',
      targetValue: 8,
    });

    const result = await createGetMyGoals(deps)({ playerId: 'player-1' });

    expect(result.goals[0]).toMatchObject({ status: 'ACHIEVED', currentProgress: 8 });
    expect(result.goals[0].achievedAt).toBe(NOW);
    // Persisted, not just returned in-memory.
    const stored = await deps.goalRepository.findById(result.goals[0].id);
    expect(stored.status).toBe('ACHIEVED');
  });

  it('sums wins across categories for MATCH_WINS, scoped by targetCategory when set', async () => {
    const deps = buildDeps({
      competitionProgressProvider: createFakeCompetitionProgressProvider({
        hasSeason: true,
        categories: [
          { category: 'CUARTA', modality: 'SINGLES', rank: 3, wins: 4 },
          { category: 'CUARTA', modality: 'DOBLES', rank: 2, wins: 3 },
        ],
      }),
    });
    const createGoal = createCreateGoal(deps);
    await createGoal({
      playerId: 'player-1',
      title: 'Ganar 10',
      metricType: 'MATCH_WINS',
      targetValue: 10,
    });
    await createGoal({
      playerId: 'player-1',
      title: 'Ganar 3 en singles',
      metricType: 'MATCH_WINS',
      targetValue: 3,
      targetCategory: 'CUARTA',
      targetModality: 'SINGLES',
    });

    const result = await createGetMyGoals(deps)({ playerId: 'player-1' });

    const unscoped = result.goals.find((g) => g.title === 'Ganar 10');
    const scoped = result.goals.find((g) => g.title === 'Ganar 3 en singles');
    expect(unscoped).toMatchObject({ currentProgress: 7, status: 'ACTIVE' });
    expect(scoped).toMatchObject({ currentProgress: 4, status: 'ACHIEVED' });
  });

  it('achieves RANKING_POSITION when the best rank is <= target (lower is better)', async () => {
    const deps = buildDeps({
      competitionProgressProvider: createFakeCompetitionProgressProvider({
        hasSeason: true,
        categories: [
          { category: 'CUARTA', modality: 'SINGLES', rank: 15, wins: 0 },
          { category: 'CUARTA', modality: 'DOBLES', rank: 8, wins: 0 },
        ],
      }),
    });
    const createGoal = createCreateGoal(deps);
    await createGoal({
      playerId: 'player-1',
      title: 'Top 10',
      metricType: 'RANKING_POSITION',
      targetValue: 10,
    });

    const result = await createGetMyGoals(deps)({ playerId: 'player-1' });

    expect(result.goals[0]).toMatchObject({
      currentProgress: 8,
      status: 'ACHIEVED',
      percentComplete: null,
    });
  });

  it('achieves TRAINING_FREQUENCY once weekly session count meets target', async () => {
    const deps = buildDeps({ trainingFrequencyProvider: createFakeTrainingFrequencyProvider(3) });
    const createGoal = createCreateGoal(deps);
    await createGoal({
      playerId: 'player-1',
      title: 'Entrenar 3x/semana',
      metricType: 'TRAINING_FREQUENCY',
      targetValue: 3,
    });

    const result = await createGetMyGoals(deps)({ playerId: 'player-1' });

    expect(result.goals[0]).toMatchObject({ currentProgress: 3, status: 'ACHIEVED' });
  });

  it('never auto-tracks CUSTOM goals -- stays ACTIVE with null progress', async () => {
    const deps = buildDeps();
    const createGoal = createCreateGoal(deps);
    await createGoal({ playerId: 'player-1', title: 'Reach Category 2', metricType: 'CUSTOM' });

    const result = await createGetMyGoals(deps)({ playerId: 'player-1' });

    expect(result.goals[0]).toMatchObject({
      status: 'ACTIVE',
      currentProgress: null,
      percentComplete: null,
    });
  });

  it('does not recompute progress for already-terminal goals', async () => {
    const deps = buildDeps({
      performanceProgressProvider: createFakePerformanceProgressProvider({ SERVE: 9 }),
    });
    const createGoal = createCreateGoal(deps);
    const getMyGoals = createGetMyGoals(deps);
    await createGoal({
      playerId: 'player-1',
      title: 'Saque a 8',
      metricType: 'SKILL_RATING',
      targetArea: 'SERVE',
      targetValue: 8,
    });
    const first = await getMyGoals({ playerId: 'player-1' });
    expect(first.goals[0].status).toBe('ACHIEVED');

    const second = await getMyGoals({ playerId: 'player-1' });
    expect(second.goals[0]).toMatchObject({
      status: 'ACHIEVED',
      currentProgress: null,
      percentComplete: null,
    });
  });

  it('only fetches cross-module data for metric types actually present among ACTIVE goals', async () => {
    let competitionCalls = 0;
    const deps = buildDeps({
      competitionProgressProvider: {
        async getMySummary() {
          competitionCalls += 1;
          return { hasSeason: false, categories: [], recentMatches: [] };
        },
      },
    });
    const createGoal = createCreateGoal(deps);
    await createGoal({ playerId: 'player-1', title: 'Reach Category 2', metricType: 'CUSTOM' });

    await createGetMyGoals(deps)({ playerId: 'player-1' });

    expect(competitionCalls).toBe(0);
  });
});
