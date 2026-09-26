import { beforeEach, describe, expect, it } from 'vitest';

import { createListPhysioNotesForAdmin } from '../../../../src/modules/clinical/application/useCases/listPhysioNotesForAdmin.js';
import { createClinicalConsentUseCases } from '../../../../src/modules/clinical/application/useCases/clinicalConsent.js';
import { createGetPhysioSummary } from '../../../../src/modules/clinical/application/useCases/getPhysioSummary.js';
import { createSetFitnessStatus } from '../../../../src/modules/clinical/application/useCases/setFitnessStatus.js';
import { ClinicalConsentRequired } from '../../../../src/modules/clinical/application/errors/ClinicalConsentRequired.js';
import { DisciplineMismatch } from '../../../../src/modules/clinical/application/errors/DisciplineMismatch.js';

import {
  createFakeAppointmentRepository,
  createFakeAuditLog,
  createFakeClock,
  createFakeConsentRepository,
  createFakeFitnessStatusRepository,
  createFakeNoteRepository,
  createFakePlayerDirectoryProvider,
  createFakePlayerEligibilityProvider,
  createFakePractitionerEligibilityProvider,
  createFakeRecoveryPlanRepository,
} from './fakes.js';

const ADMIN = { id: 'admin-1', roles: ['ADMINISTRADOR'] };

async function seedNotes(noteRepository) {
  const base = { playerId: 'player-1', noteType: 'SESSION_NOTE', visibility: 'PRIVATE' };
  await noteRepository.create({
    ...base,
    practitionerId: 'physio-1',
    discipline: 'PHYSIOTHERAPY',
    content: 'rodilla',
  });
  await noteRepository.create({
    ...base,
    practitionerId: 'psych-1',
    discipline: 'PSYCHOLOGY',
    content: 'ansiedad',
  });
}

describe('Administration reading physiotherapy notes (player authorization)', () => {
  let noteRepository;
  let consentRepository;
  let auditLog;
  let consent;
  let listPhysioNotesForAdmin;

  beforeEach(async () => {
    noteRepository = createFakeNoteRepository();
    consentRepository = createFakeConsentRepository();
    auditLog = createFakeAuditLog();
    consent = createClinicalConsentUseCases({ consentRepository, clock: createFakeClock() });
    listPhysioNotesForAdmin = createListPhysioNotesForAdmin({
      noteRepository,
      consentRepository,
      auditLog,
    });
    await seedNotes(noteRepository);
  });

  it('without the player authorization: refused, and nothing is logged', async () => {
    await expect(
      listPhysioNotesForAdmin({ playerId: 'player-1', actor: ADMIN }),
    ).rejects.toBeInstanceOf(ClinicalConsentRequired);
    expect(auditLog.reads).toEqual([]);
  });

  it('with authorization: only physiotherapy notes (never psychology), each read logged', async () => {
    await consent.grantMyPhysioConsent({ playerId: 'player-1' });
    const { notes } = await listPhysioNotesForAdmin({ playerId: 'player-1', actor: ADMIN });
    expect(notes.map((n) => n.content)).toEqual(['rodilla']);
    expect(auditLog.reads).toHaveLength(1);
    expect(auditLog.reads[0]).toMatchObject({
      actorUserId: 'admin-1',
      actorRoles: ['ADMINISTRADOR'],
      playerId: 'player-1',
      noteIds: [notes[0].id],
      via: 'ADMIN_WITH_PLAYER_CONSENT',
    });
  });

  it('after the player withdraws it: refused again', async () => {
    await consent.grantMyPhysioConsent({ playerId: 'player-1' });
    await listPhysioNotesForAdmin({ playerId: 'player-1', actor: ADMIN });
    await consent.revokeMyPhysioConsent({ playerId: 'player-1' });
    await expect(
      listPhysioNotesForAdmin({ playerId: 'player-1', actor: ADMIN }),
    ).rejects.toBeInstanceOf(ClinicalConsentRequired);
  });

  it('another player authorization never opens this player', async () => {
    await consent.grantMyPhysioConsent({ playerId: 'player-2' });
    await expect(
      listPhysioNotesForAdmin({ playerId: 'player-1', actor: ADMIN }),
    ).rejects.toBeInstanceOf(ClinicalConsentRequired);
  });

  it('if the read cannot be logged, the notes are not served', async () => {
    await consent.grantMyPhysioConsent({ playerId: 'player-1' });
    const failing = createListPhysioNotesForAdmin({
      noteRepository,
      consentRepository,
      auditLog: createFakeAuditLog({ fail: true }),
    });
    await expect(failing({ playerId: 'player-1', actor: ADMIN })).rejects.toThrow(
      'audit unavailable',
    );
  });
});

describe('the player authorization keeps its dates', () => {
  it('grant stores the date; withdraw stores the withdrawal date; granting again starts a new one', async () => {
    const consentRepository = createFakeConsentRepository();
    const clock = createFakeClock(new Date('2026-09-01T10:00:00Z'));
    const consent = createClinicalConsentUseCases({ consentRepository, clock });

    expect(await consent.getMyPhysioConsent({ playerId: 'p' })).toEqual({
      authorized: false,
      grantedAt: null,
      revokedAt: null,
    });

    const granted = await consent.grantMyPhysioConsent({ playerId: 'p' });
    expect(granted).toEqual({
      authorized: true,
      grantedAt: new Date('2026-09-01T10:00:00Z'),
      revokedAt: null,
    });
    // Granting twice keeps the original date (idempotent).
    await consent.grantMyPhysioConsent({ playerId: 'p' });
    expect(consentRepository.rows).toHaveLength(1);

    clock.advanceMs?.(3600_000);
    const revoked = await consent.revokeMyPhysioConsent({ playerId: 'p' });
    expect(revoked.authorized).toBe(false);
    expect(revoked.grantedAt).toEqual(new Date('2026-09-01T10:00:00Z'));
    expect(revoked.revokedAt).toBeInstanceOf(Date);

    await consent.grantMyPhysioConsent({ playerId: 'p' });
    expect(consentRepository.rows).toHaveLength(2);
    expect((await consent.getMyPhysioConsent({ playerId: 'p' })).authorized).toBe(true);
  });
});

describe('"Apto / No apto" and the operational summary', () => {
  let deps;

  beforeEach(() => {
    deps = {
      appointmentRepository: createFakeAppointmentRepository(),
      recoveryPlanRepository: createFakeRecoveryPlanRepository(),
      fitnessStatusRepository: createFakeFitnessStatusRepository(),
      consentRepository: createFakeConsentRepository(),
      playerDirectoryProvider: createFakePlayerDirectoryProvider(
        new Map([['physio-1', { firstName: 'Pedro', lastName: 'Fisio' }]]),
      ),
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([
          ['physio-1', 'PHYSIOTHERAPY'],
          ['psych-1', 'PSYCHOLOGY'],
        ]),
      ),
      clock: createFakeClock(new Date('2026-09-26T12:00:00Z')),
    };
  });

  it('only a physiotherapist can set it', async () => {
    const setFitnessStatus = createSetFitnessStatus(deps);
    await expect(
      setFitnessStatus({ playerId: 'player-1', practitionerUserId: 'psych-1', status: 'FIT' }),
    ).rejects.toBeInstanceOf(DisciplineMismatch);
    const saved = await setFitnessStatus({
      playerId: 'player-1',
      practitionerUserId: 'physio-1',
      status: 'UNFIT',
      unfitUntil: '2026-10-10',
    });
    expect(saved).toMatchObject({ status: 'UNFIT', unfitUntil: '2026-10-10' });
  });

  it('the summary has attendance, active plan and fitness -- and no clinical text', async () => {
    const setFitnessStatus = createSetFitnessStatus(deps);
    await setFitnessStatus({
      playerId: 'player-1',
      practitionerUserId: 'physio-1',
      status: 'UNFIT',
      unfitUntil: '2026-10-10',
    });
    await deps.recoveryPlanRepository.create({
      id: 'plan-1',
      playerId: 'player-1',
      practitionerId: 'physio-1',
      title: 'Ruptura de ligamento',
      goal: 'secreto',
      status: 'ACTIVE',
      visibility: 'PRIVATE',
    });
    const summary = await createGetPhysioSummary(deps)({ playerId: 'player-1' });

    expect(summary.hasActiveRecoveryPlan).toBe(true);
    expect(summary.fitness).toMatchObject({ status: 'UNFIT', unfitUntil: '2026-10-10' });
    expect(summary.notesAccess).toEqual({ authorized: false, grantedAt: null });
    const text = JSON.stringify(summary);
    expect(text).not.toContain('Ruptura');
    expect(text).not.toContain('secreto');
  });

  it('an UNFIT status whose date already passed reads as FIT', async () => {
    const setFitnessStatus = createSetFitnessStatus(deps);
    await setFitnessStatus({
      playerId: 'player-1',
      practitionerUserId: 'physio-1',
      status: 'UNFIT',
      unfitUntil: '2026-09-20',
    });
    const summary = await createGetPhysioSummary(deps)({ playerId: 'player-1' });
    expect(summary.fitness).toMatchObject({
      status: 'FIT',
      recordedStatus: 'UNFIT',
      unfitUntil: '2026-09-20',
    });
  });
});
