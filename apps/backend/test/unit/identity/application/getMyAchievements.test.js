import { describe, expect, it } from 'vitest';

import { createGetMyAchievements } from '../../../../src/modules/identity/application/useCases/getMyAchievements.js';

import {
  createFakeCompetitionProgressProvider,
  createFakePerformanceProgressProvider,
  createFakeTrainingFrequencyProvider,
} from './fakes.js';

function badgeMap(result) {
  return Object.fromEntries(result.badges.map((b) => [b.code, b.earned]));
}

describe('getMyAchievements', () => {
  it('returns every badge as not-earned when there is no data', async () => {
    const getMyAchievements = createGetMyAchievements({
      competitionProgressProvider: createFakeCompetitionProgressProvider(),
      performanceProgressProvider: createFakePerformanceProgressProvider(),
      trainingFrequencyProvider: createFakeTrainingFrequencyProvider(0),
    });

    const result = await getMyAchievements({ userId: 'user-1' });

    expect(result.badges).toHaveLength(5);
    expect(result.badges.every((b) => b.earned === false)).toBe(true);
  });

  it('earns FIRST_WIN and TEN_WINS based on total wins across categories', async () => {
    const oneWin = createGetMyAchievements({
      competitionProgressProvider: createFakeCompetitionProgressProvider({
        hasSeason: true,
        categories: [{ category: 'CUARTA', modality: 'SINGLES', rank: 5, wins: 1 }],
      }),
      performanceProgressProvider: createFakePerformanceProgressProvider(),
      trainingFrequencyProvider: createFakeTrainingFrequencyProvider(0),
    });
    expect(badgeMap(await oneWin({ userId: 'user-1' }))).toMatchObject({
      FIRST_WIN: true,
      TEN_WINS: false,
    });

    const tenWins = createGetMyAchievements({
      competitionProgressProvider: createFakeCompetitionProgressProvider({
        hasSeason: true,
        categories: [
          { category: 'CUARTA', modality: 'SINGLES', rank: 5, wins: 6 },
          { category: 'CUARTA', modality: 'DOBLES', rank: 3, wins: 4 },
        ],
      }),
      performanceProgressProvider: createFakePerformanceProgressProvider(),
      trainingFrequencyProvider: createFakeTrainingFrequencyProvider(0),
    });
    expect(badgeMap(await tenWins({ userId: 'user-1' }))).toMatchObject({
      FIRST_WIN: true,
      TEN_WINS: true,
    });
  });

  it('earns TOP_10_RANKING when the best rank across categories is <= 10', async () => {
    const getMyAchievements = createGetMyAchievements({
      competitionProgressProvider: createFakeCompetitionProgressProvider({
        hasSeason: true,
        categories: [
          { category: 'CUARTA', modality: 'SINGLES', rank: 15, wins: 0 },
          { category: 'CUARTA', modality: 'DOBLES', rank: 8, wins: 0 },
        ],
      }),
      performanceProgressProvider: createFakePerformanceProgressProvider(),
      trainingFrequencyProvider: createFakeTrainingFrequencyProvider(0),
    });

    const result = await getMyAchievements({ userId: 'user-1' });

    expect(badgeMap(result).TOP_10_RANKING).toBe(true);
  });

  it('earns OUTSTANDING_RATING when any skill rating is 8 or higher', async () => {
    const getMyAchievements = createGetMyAchievements({
      competitionProgressProvider: createFakeCompetitionProgressProvider(),
      performanceProgressProvider: createFakePerformanceProgressProvider({ SERVE: 6, FOREHAND: 8 }),
      trainingFrequencyProvider: createFakeTrainingFrequencyProvider(0),
    });

    const result = await getMyAchievements({ userId: 'user-1' });

    expect(badgeMap(result).OUTSTANDING_RATING).toBe(true);
  });

  it('earns FULL_WEEK when training frequency is 3 or more sessions', async () => {
    const getMyAchievements = createGetMyAchievements({
      competitionProgressProvider: createFakeCompetitionProgressProvider(),
      performanceProgressProvider: createFakePerformanceProgressProvider(),
      trainingFrequencyProvider: createFakeTrainingFrequencyProvider(3),
    });

    const result = await getMyAchievements({ userId: 'user-1' });

    expect(badgeMap(result).FULL_WEEK).toBe(true);
  });
});
