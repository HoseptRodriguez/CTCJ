import { beforeEach, describe, expect, it } from 'vitest';

import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { PlanCodeAlreadyExists } from '../../../../src/modules/billing/application/errors/PlanCodeAlreadyExists.js';

import { createFakePlanRepository } from './fakes.js';

const CLUB_ID = 'club-1';

describe('createPlan', () => {
  let planRepository;
  let createPlan;

  beforeEach(() => {
    planRepository = createFakePlanRepository();
    createPlan = createCreatePlan({ planRepository, clubId: CLUB_ID });
  });

  it('creates a plan with valid input', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    expect(plan.code).toBe('INICIACION');
    expect(plan.name).toBe('Iniciación');
    expect(plan.isActive).toBe(true);
  });

  it('rejects a duplicate code within the same club', async () => {
    await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await expect(createPlan({ code: 'INICIACION', name: 'Otro nombre' })).rejects.toThrow(
      PlanCodeAlreadyExists,
    );
  });
});
