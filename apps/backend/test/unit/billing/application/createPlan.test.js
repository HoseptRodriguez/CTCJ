import { beforeEach, describe, expect, it } from 'vitest';

import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { createUpdatePlan } from '../../../../src/modules/billing/application/useCases/updatePlan.js';
import { createSetPlanActive } from '../../../../src/modules/billing/application/useCases/setPlanActive.js';
import { createEnrollPlayer } from '../../../../src/modules/billing/application/useCases/enrollPlayer.js';
import { PlanNameAlreadyExists } from '../../../../src/modules/billing/application/errors/PlanNameAlreadyExists.js';
import { PlanNotActive } from '../../../../src/modules/billing/application/errors/PlanNotActive.js';
import { PlanNotFound } from '../../../../src/modules/billing/application/errors/PlanNotFound.js';

import {
  createFakeAuditLog,
  createFakeMembershipRepository,
  createFakePlanRepository,
  createFakePlayerEligibilityProvider,
} from './fakes.js';

const CLUB_ID = 'club-1';
const ADMIN = { actorUserId: 'admin-1', actorRoles: ['ADMINISTRADOR'] };

describe('plan administration', () => {
  let planRepository;
  let auditLog;
  let createPlan;
  let updatePlan;
  let setPlanActive;

  beforeEach(() => {
    planRepository = createFakePlanRepository();
    auditLog = createFakeAuditLog();
    createPlan = createCreatePlan({ planRepository, auditLog, clubId: CLUB_ID });
    updatePlan = createUpdatePlan({ planRepository, auditLog, clubId: CLUB_ID });
    setPlanActive = createSetPlanActive({ planRepository, auditLog });
  });

  describe('createPlan', () => {
    it('generates the code from the name (the admin never types it) and starts active', async () => {
      const plan = await createPlan({ name: '  Iniciación Niños ', ...ADMIN });
      expect(plan).toMatchObject({
        code: 'INICIACION_NINOS',
        name: 'Iniciación Niños',
        isActive: true,
      });
      expect(auditLog.entries).toEqual([
        expect.objectContaining({
          action: 'PLAN_CREATED',
          entityId: plan.id,
          actorUserId: 'admin-1',
        }),
      ]);
    });

    it('ignores a code sent by the client', async () => {
      const plan = await createPlan({ name: 'Avanzado', code: 'HACK', ...ADMIN });
      expect(plan.code).toBe('AVANZADO');
    });

    it('rejects a name already used, ignoring case and spaces', async () => {
      await createPlan({ name: 'Iniciación', ...ADMIN });
      for (const name of [' iniciación ', 'INICIACIÓN']) {
        await expect(createPlan({ name, ...ADMIN })).rejects.toThrow(PlanNameAlreadyExists);
      }
    });
  });

  describe('updatePlan', () => {
    it('changes name and description, never the code, and logs before/after', async () => {
      const plan = await createPlan({ name: 'Iniciación', ...ADMIN });
      const updated = await updatePlan({
        planId: plan.id,
        name: 'Iniciación adultos',
        description: 'Martes y jueves',
        ...ADMIN,
      });
      expect(updated).toMatchObject({
        code: 'INICIACION',
        name: 'Iniciación adultos',
        description: 'Martes y jueves',
      });
      expect(auditLog.entries.at(-1)).toMatchObject({
        action: 'PLAN_UPDATED',
        before: { name: 'Iniciación', description: null },
        after: { name: 'Iniciación adultos', description: 'Martes y jueves' },
      });
    });

    it('rejects the name of another plan, but accepts keeping its own', async () => {
      await createPlan({ name: 'Avanzado', ...ADMIN });
      const plan = await createPlan({ name: 'Iniciación', ...ADMIN });
      await expect(updatePlan({ planId: plan.id, name: 'avanzado', ...ADMIN })).rejects.toThrow(
        PlanNameAlreadyExists,
      );
      await expect(
        updatePlan({ planId: plan.id, name: 'Iniciación', description: 'Nueva', ...ADMIN }),
      ).resolves.toMatchObject({ description: 'Nueva' });
    });

    it('logs nothing when nothing changed', async () => {
      const plan = await createPlan({ name: 'Iniciación', ...ADMIN });
      await updatePlan({ planId: plan.id, name: 'Iniciación', ...ADMIN });
      expect(auditLog.entries.map((e) => e.action)).toEqual(['PLAN_CREATED']);
    });

    it('throws PlanNotFound for an unknown plan', async () => {
      await expect(updatePlan({ planId: 'nope', name: 'X', ...ADMIN })).rejects.toThrow(
        PlanNotFound,
      );
    });
  });

  describe('setPlanActive', () => {
    it('a deactivated plan is not offered to new players; current ones keep it', async () => {
      const membershipRepository = createFakeMembershipRepository();
      const enrollPlayer = createEnrollPlayer({
        membershipRepository,
        planRepository,
        playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['p1', 'p2'])),
      });
      const plan = await createPlan({ name: 'Iniciación', ...ADMIN });
      const enrollment = { planId: plan.id, startDate: new Date('2026-03-01'), billingDay: 5 };
      await enrollPlayer({ playerId: 'p1', ...enrollment });

      await setPlanActive({ planId: plan.id, isActive: false, ...ADMIN });

      await expect(enrollPlayer({ playerId: 'p2', ...enrollment })).rejects.toThrow(PlanNotActive);
      expect(await membershipRepository.listActivePlayerIdsByPlan(plan.id)).toEqual(['p1']);
      expect(auditLog.entries.at(-1)).toMatchObject({ action: 'PLAN_DEACTIVATED' });

      await setPlanActive({ planId: plan.id, isActive: true, ...ADMIN });
      await expect(enrollPlayer({ playerId: 'p2', ...enrollment })).resolves.toBeDefined();
    });
  });
});
