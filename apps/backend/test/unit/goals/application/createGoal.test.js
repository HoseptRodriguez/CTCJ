import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateGoal } from '../../../../src/modules/goals/application/useCases/createGoal.js';
import { InvalidGoalTarget } from '../../../../src/modules/goals/domain/errors/InvalidGoalTarget.js';

import { createFakeGoalRepository, createFakeClock } from './fakes.js';

const NOW = new Date('2026-08-10T10:00:00Z');

describe('createGoal', () => {
  let goalRepository;
  let createGoal;

  beforeEach(() => {
    goalRepository = createFakeGoalRepository();
    createGoal = createCreateGoal({ goalRepository, clock: createFakeClock(NOW) });
  });

  it('creates an ACTIVE SKILL_RATING goal', async () => {
    const goal = await createGoal({
      playerId: 'player-1',
      title: '  Mejorar mi saque  ',
      metricType: 'SKILL_RATING',
      targetArea: 'SERVE',
      targetValue: 8,
    });

    expect(goal).toMatchObject({
      playerId: 'player-1',
      title: 'Mejorar mi saque',
      metricType: 'SKILL_RATING',
      targetArea: 'SERVE',
      targetValue: 8,
      status: 'ACTIVE',
    });
    expect(goal.createdAt).toBe(NOW);
  });

  it('creates a CUSTOM goal with only a title', async () => {
    const goal = await createGoal({
      playerId: 'player-1',
      title: 'Reach Category 2',
      metricType: 'CUSTOM',
    });

    expect(goal).toMatchObject({
      title: 'Reach Category 2',
      metricType: 'CUSTOM',
      status: 'ACTIVE',
    });
  });

  it('rejects an invalid target shape for the metric type', async () => {
    await expect(
      createGoal({ playerId: 'player-1', title: 'x', metricType: 'SKILL_RATING' }),
    ).rejects.toThrow(InvalidGoalTarget);
  });

  it('persists the goal via the repository', async () => {
    const goal = await createGoal({
      playerId: 'player-1',
      title: 'Ganar 10 partidos',
      metricType: 'MATCH_WINS',
      targetValue: 10,
    });

    const stored = await goalRepository.findById(goal.id);
    expect(stored).toMatchObject({ title: 'Ganar 10 partidos', metricType: 'MATCH_WINS' });
  });
});
