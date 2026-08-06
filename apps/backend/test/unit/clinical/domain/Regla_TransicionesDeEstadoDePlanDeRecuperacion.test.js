import { describe, expect, it } from 'vitest';

import { RecoveryPlan } from '../../../../src/modules/clinical/domain/entities/RecoveryPlan.js';
import { InvalidRecoveryPlanState } from '../../../../src/modules/clinical/domain/errors/InvalidRecoveryPlanState.js';

function buildPlan() {
  return RecoveryPlan.create({
    id: 'plan-1',
    playerId: 'player-1',
    practitionerId: 'physio-1',
    title: 'Rehabilitación de rodilla',
    goal: 'Recuperar rango de movimiento completo',
    visibility: 'PRIVATE',
    now: new Date('2026-02-20'),
  });
}

describe('Regla: transiciones de estado de plan de recuperación', () => {
  it('a new plan starts ACTIVE', () => {
    const plan = buildPlan();
    expect(plan.status).toBe('ACTIVE');
  });

  it('complete() is legal from ACTIVE', () => {
    const plan = buildPlan();
    const now = new Date('2026-03-01');
    plan.complete({ resolvedBy: 'physio-1', now });
    expect(plan.status).toBe('COMPLETED');
    expect(plan.resolvedAt).toBe(now);
    expect(plan.resolvedBy).toBe('physio-1');
  });

  it('discontinue() is legal from ACTIVE and records a reason', () => {
    const plan = buildPlan();
    const now = new Date('2026-03-01');
    plan.discontinue({ reason: 'jugador abandonó el club', resolvedBy: 'physio-1', now });
    expect(plan.status).toBe('DISCONTINUED');
    expect(plan.resolvedAt).toBe(now);
    expect(plan.discontinueReason).toBe('jugador abandonó el club');
  });

  it('complete() throws once already COMPLETED', () => {
    const plan = buildPlan();
    plan.complete({ resolvedBy: 'physio-1', now: new Date() });
    expect(() => plan.complete({ resolvedBy: 'physio-1', now: new Date() })).toThrow(
      InvalidRecoveryPlanState,
    );
  });

  it('discontinue() throws once already DISCONTINUED', () => {
    const plan = buildPlan();
    plan.discontinue({ reason: 'x', resolvedBy: 'physio-1', now: new Date() });
    expect(() =>
      plan.discontinue({ reason: 'y', resolvedBy: 'physio-1', now: new Date() }),
    ).toThrow(InvalidRecoveryPlanState);
  });

  it('complete() throws once already DISCONTINUED', () => {
    const plan = buildPlan();
    plan.discontinue({ reason: 'x', resolvedBy: 'physio-1', now: new Date() });
    expect(() => plan.complete({ resolvedBy: 'physio-1', now: new Date() })).toThrow(
      InvalidRecoveryPlanState,
    );
  });
});
