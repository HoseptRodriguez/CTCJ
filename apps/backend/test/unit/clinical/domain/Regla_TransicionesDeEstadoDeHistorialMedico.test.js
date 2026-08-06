import { describe, expect, it } from 'vitest';

import { MedicalHistoryEntry } from '../../../../src/modules/clinical/domain/entities/MedicalHistoryEntry.js';
import { InvalidMedicalHistoryEntryState } from '../../../../src/modules/clinical/domain/errors/InvalidMedicalHistoryEntryState.js';

function buildEntry() {
  return MedicalHistoryEntry.create({
    id: 'entry-1',
    playerId: 'player-1',
    practitionerId: 'physio-1',
    condition: 'Esguince de tobillo',
    description: 'Grado II, tobillo derecho',
    visibility: 'PRIVATE',
    occurredAt: new Date('2026-01-15'),
    now: new Date('2026-01-16'),
  });
}

describe('Regla: transiciones de estado de historial médico', () => {
  it('a new entry starts ACTIVE', () => {
    const entry = buildEntry();
    expect(entry.status).toBe('ACTIVE');
  });

  it('resolve() is legal from ACTIVE', () => {
    const entry = buildEntry();
    const now = new Date('2026-03-01');
    entry.resolve({ resolvedBy: 'physio-1', now });
    expect(entry.status).toBe('RESOLVED');
    expect(entry.resolvedAt).toBe(now);
    expect(entry.resolvedBy).toBe('physio-1');
  });

  it('resolve() throws once already RESOLVED', () => {
    const entry = buildEntry();
    entry.resolve({ resolvedBy: 'physio-1', now: new Date() });
    expect(() => entry.resolve({ resolvedBy: 'physio-1', now: new Date() })).toThrow(
      InvalidMedicalHistoryEntryState,
    );
  });
});
