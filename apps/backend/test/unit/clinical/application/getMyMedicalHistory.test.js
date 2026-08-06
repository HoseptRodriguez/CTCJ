import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyMedicalHistory } from '../../../../src/modules/clinical/application/useCases/getMyMedicalHistory.js';
import { MedicalHistoryEntry } from '../../../../src/modules/clinical/domain/entities/MedicalHistoryEntry.js';

import { createFakeMedicalHistoryRepository } from './fakes.js';

describe('getMyMedicalHistory', () => {
  let medicalHistoryRepository;
  let getMyMedicalHistory;

  beforeEach(() => {
    medicalHistoryRepository = createFakeMedicalHistoryRepository();
    getMyMedicalHistory = createGetMyMedicalHistory({ medicalHistoryRepository });
  });

  it('returns only PLAYER_VISIBLE entries, never PRIVATE ones', async () => {
    await medicalHistoryRepository.create(
      MedicalHistoryEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        condition: 'private condition',
        description: null,
        visibility: 'PRIVATE',
        occurredAt: null,
        now: new Date(),
      }),
    );
    await medicalHistoryRepository.create(
      MedicalHistoryEntry.create({
        id: 'entry-2',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        condition: 'visible condition',
        description: null,
        visibility: 'PLAYER_VISIBLE',
        occurredAt: null,
        now: new Date(),
      }),
    );

    const result = await getMyMedicalHistory({ playerId: 'player-1' });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].condition).toBe('visible condition');
  });
});
