import { beforeEach, describe, expect, it } from 'vitest';

import { createListMedicalHistory } from '../../../../src/modules/clinical/application/useCases/listMedicalHistory.js';
import { DisciplineMismatch } from '../../../../src/modules/clinical/application/errors/DisciplineMismatch.js';
import { PractitionerNotEligible } from '../../../../src/modules/clinical/application/errors/PractitionerNotEligible.js';
import { MedicalHistoryEntry } from '../../../../src/modules/clinical/domain/entities/MedicalHistoryEntry.js';

import {
  createFakeMedicalHistoryRepository,
  createFakePractitionerEligibilityProvider,
} from './fakes.js';

describe('listMedicalHistory', () => {
  let medicalHistoryRepository;
  let listMedicalHistory;

  beforeEach(async () => {
    medicalHistoryRepository = createFakeMedicalHistoryRepository();
    await medicalHistoryRepository.create(
      MedicalHistoryEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        condition: 'x',
        description: null,
        visibility: 'PRIVATE',
        occurredAt: null,
        now: new Date('2026-01-16'),
      }),
    );
    listMedicalHistory = createListMedicalHistory({
      medicalHistoryRepository,
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([
          ['physio-1', 'PHYSIOTHERAPY'],
          ['psych-1', 'PSYCHOLOGY'],
        ]),
      ),
    });
  });

  it('returns entries for a Fisioterapeuta caller', async () => {
    const result = await listMedicalHistory({
      playerId: 'player-1',
      practitionerUserId: 'physio-1',
    });
    expect(result.entries).toHaveLength(1);
  });

  it('throws DisciplineMismatch for a Psicologo caller', async () => {
    await expect(
      listMedicalHistory({ playerId: 'player-1', practitionerUserId: 'psych-1' }),
    ).rejects.toThrow(DisciplineMismatch);
  });

  it('throws PractitionerNotEligible for a non-practitioner caller', async () => {
    await expect(
      listMedicalHistory({ playerId: 'player-1', practitionerUserId: 'not-a-practitioner' }),
    ).rejects.toThrow(PractitionerNotEligible);
  });
});
