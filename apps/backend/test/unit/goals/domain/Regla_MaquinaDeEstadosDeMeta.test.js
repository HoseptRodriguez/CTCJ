import { describe, expect, it } from 'vitest';

import { Goal } from '../../../../src/modules/goals/domain/entities/Goal.js';
import { InvalidGoalState } from '../../../../src/modules/goals/domain/errors/InvalidGoalState.js';

const NOW = new Date('2026-08-10T10:00:00Z');

function buildActiveGoal() {
  return Goal.create({
    id: 'goal-1',
    playerId: 'player-1',
    title: 'Mejorar mi saque',
    metricType: 'SKILL_RATING',
    targetArea: 'SERVE',
    targetValue: 8,
    now: NOW,
  });
}

describe('Goal state machine', () => {
  it('starts ACTIVE with no achievedAt/abandonedAt', () => {
    const goal = buildActiveGoal();
    expect(goal.status).toBe('ACTIVE');
    expect(goal.achievedAt).toBeNull();
    expect(goal.abandonedAt).toBeNull();
  });

  it('achieve() transitions ACTIVE -> ACHIEVED and stamps achievedAt', () => {
    const goal = buildActiveGoal();
    const achievedAt = new Date('2026-08-15T10:00:00Z');

    goal.achieve(achievedAt);

    expect(goal.status).toBe('ACHIEVED');
    expect(goal.achievedAt).toBe(achievedAt);
  });

  it('abandon() transitions ACTIVE -> ABANDONED and stamps abandonedAt', () => {
    const goal = buildActiveGoal();
    const abandonedAt = new Date('2026-08-15T10:00:00Z');

    goal.abandon(abandonedAt);

    expect(goal.status).toBe('ABANDONED');
    expect(goal.abandonedAt).toBe(abandonedAt);
  });

  it('rejects achieve() from a terminal state', () => {
    const goal = buildActiveGoal();
    goal.achieve(NOW);

    expect(() => goal.achieve(NOW)).toThrow(InvalidGoalState);
  });

  it('rejects abandon() from a terminal state', () => {
    const goal = buildActiveGoal();
    goal.abandon(NOW);

    expect(() => goal.abandon(NOW)).toThrow(InvalidGoalState);
  });

  it('rejects abandon() on an already-achieved goal', () => {
    const goal = buildActiveGoal();
    goal.achieve(NOW);

    expect(() => goal.abandon(NOW)).toThrow(InvalidGoalState);
  });
});
