import { beforeEach, describe, expect, it } from 'vitest';

import { createAbandonGoal } from '../../../../src/modules/goals/application/useCases/abandonGoal.js';
import { createCreateGoal } from '../../../../src/modules/goals/application/useCases/createGoal.js';
import { GoalNotFound } from '../../../../src/modules/goals/application/errors/GoalNotFound.js';
import { InvalidGoalState } from '../../../../src/modules/goals/domain/errors/InvalidGoalState.js';

import { createFakeGoalRepository, createFakeClock } from './fakes.js';

const NOW = new Date('2026-08-10T10:00:00Z');

function buildDeps() {
  const goalRepository = createFakeGoalRepository();
  const clock = createFakeClock(NOW);
  return { goalRepository, clock };
}

describe('abandonGoal', () => {
  let deps;
  let createGoal;
  let abandonGoal;

  beforeEach(() => {
    deps = buildDeps();
    createGoal = createCreateGoal(deps);
    abandonGoal = createAbandonGoal(deps);
  });

  it('transitions an owned ACTIVE goal to ABANDONED', async () => {
    const goal = await createGoal({ playerId: 'player-1', title: 'x', metricType: 'CUSTOM' });

    const result = await abandonGoal({ playerId: 'player-1', goalId: goal.id });

    expect(result.status).toBe('ABANDONED');
    expect(result.abandonedAt).toBe(NOW);
  });

  it('throws GoalNotFound for a goal that belongs to someone else', async () => {
    const goal = await createGoal({ playerId: 'player-1', title: 'x', metricType: 'CUSTOM' });

    await expect(abandonGoal({ playerId: 'someone-else', goalId: goal.id })).rejects.toThrow(
      GoalNotFound,
    );
  });

  it('throws GoalNotFound for a nonexistent goal id', async () => {
    await expect(abandonGoal({ playerId: 'player-1', goalId: 'does-not-exist' })).rejects.toThrow(
      GoalNotFound,
    );
  });

  it('throws InvalidGoalState when the goal is already terminal', async () => {
    const goal = await createGoal({ playerId: 'player-1', title: 'x', metricType: 'CUSTOM' });
    await abandonGoal({ playerId: 'player-1', goalId: goal.id });

    await expect(abandonGoal({ playerId: 'player-1', goalId: goal.id })).rejects.toThrow(
      InvalidGoalState,
    );
  });
});
