import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateMedicalHistoryEntry } from '../../../../src/modules/clinical/application/useCases/createMedicalHistoryEntry.js';
import { DisciplineMismatch } from '../../../../src/modules/clinical/application/errors/DisciplineMismatch.js';
import { PlayerNotEligible } from '../../../../src/modules/clinical/application/errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../../../../src/modules/clinical/application/errors/PractitionerNotEligible.js';

import {
  createFakeClock,
  createFakeMedicalHistoryRepository,
  createFakePlayerEligibilityProvider,
  createFakePractitionerEligibilityProvider,
} from './fakes.js';

describe('createMedicalHistoryEntry', () => {
  let medicalHistoryRepository;
  let createMedicalHistoryEntry;

  beforeEach(() => {
    medicalHistoryRepository = createFakeMedicalHistoryRepository();
    createMedicalHistoryEntry = createCreateMedicalHistoryEntry({
      medicalHistoryRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([
          ['physio-1', 'PHYSIOTHERAPY'],
          ['psych-1', 'PSYCHOLOGY'],
        ]),
      ),
      clock: createFakeClock(new Date('2026-02-20')),
    });
  });

  it('creates an ACTIVE entry when both player and practitioner are eligible', async () => {
    const entry = await createMedicalHistoryEntry({
      playerId: 'player-1',
      condition: 'Esguince de tobillo',
      description: 'Grado II',
      visibility: 'PRIVATE',
      occurredAt: new Date('2026-01-15'),
      practitionerUserId: 'physio-1',
    });
    expect(entry.status).toBe('ACTIVE');
    expect(entry.condition).toBe('Esguince de tobillo');
  });

  it('throws PlayerNotEligible when the target does not hold JUGADOR', async () => {
    await expect(
      createMedicalHistoryEntry({
        playerId: 'not-a-player',
        condition: 'x',
        visibility: 'PRIVATE',
        practitionerUserId: 'physio-1',
      }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('throws PractitionerNotEligible when the author holds no clinical practitioner role', async () => {
    await expect(
      createMedicalHistoryEntry({
        playerId: 'player-1',
        condition: 'x',
        visibility: 'PRIVATE',
        practitionerUserId: 'not-a-practitioner',
      }),
    ).rejects.toThrow(PractitionerNotEligible);
  });

  it('throws DisciplineMismatch when the author is a Psicologo, not a Fisioterapeuta', async () => {
    await expect(
      createMedicalHistoryEntry({
        playerId: 'player-1',
        condition: 'x',
        visibility: 'PRIVATE',
        practitionerUserId: 'psych-1',
      }),
    ).rejects.toThrow(DisciplineMismatch);
  });
});
