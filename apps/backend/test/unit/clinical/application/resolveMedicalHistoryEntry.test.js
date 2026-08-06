import { beforeEach, describe, expect, it } from 'vitest';

import { createResolveMedicalHistoryEntry } from '../../../../src/modules/clinical/application/useCases/resolveMedicalHistoryEntry.js';
import { MedicalHistoryEntryNotFound } from '../../../../src/modules/clinical/application/errors/MedicalHistoryEntryNotFound.js';
import { MedicalHistoryEntry } from '../../../../src/modules/clinical/domain/entities/MedicalHistoryEntry.js';
import { InvalidMedicalHistoryEntryState } from '../../../../src/modules/clinical/domain/errors/InvalidMedicalHistoryEntryState.js';

import { createFakeClock, createFakeMedicalHistoryRepository } from './fakes.js';

describe('resolveMedicalHistoryEntry', () => {
  let medicalHistoryRepository;
  let resolveMedicalHistoryEntry;

  beforeEach(async () => {
    medicalHistoryRepository = createFakeMedicalHistoryRepository();
    await medicalHistoryRepository.create(
      MedicalHistoryEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        condition: 'Esguince de tobillo',
        description: null,
        visibility: 'PRIVATE',
        occurredAt: null,
        now: new Date('2026-01-16'),
      }),
    );
    resolveMedicalHistoryEntry = createResolveMedicalHistoryEntry({
      medicalHistoryRepository,
      clock: createFakeClock(new Date('2026-03-01')),
    });
  });

  it('marks an ACTIVE entry RESOLVED', async () => {
    const entry = await resolveMedicalHistoryEntry({
      entryId: 'entry-1',
      resolvedByUserId: 'physio-1',
    });
    expect(entry.status).toBe('RESOLVED');
    expect(entry.resolvedBy).toBe('physio-1');
  });

  it('throws MedicalHistoryEntryNotFound for an unknown id', async () => {
    await expect(
      resolveMedicalHistoryEntry({ entryId: 'nonexistent', resolvedByUserId: 'physio-1' }),
    ).rejects.toThrow(MedicalHistoryEntryNotFound);
  });

  it('throws InvalidMedicalHistoryEntryState once already RESOLVED', async () => {
    await resolveMedicalHistoryEntry({ entryId: 'entry-1', resolvedByUserId: 'physio-1' });
    await expect(
      resolveMedicalHistoryEntry({ entryId: 'entry-1', resolvedByUserId: 'physio-1' }),
    ).rejects.toThrow(InvalidMedicalHistoryEntryState);
  });
});
