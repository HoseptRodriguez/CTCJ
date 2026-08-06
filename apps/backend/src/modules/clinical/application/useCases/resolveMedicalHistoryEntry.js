import { MedicalHistoryEntryNotFound } from '../errors/MedicalHistoryEntryNotFound.js';

/**
 * @param {{
 *   medicalHistoryRepository: import('../ports/MedicalHistoryRepository.js').MedicalHistoryRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createResolveMedicalHistoryEntry({ medicalHistoryRepository, clock }) {
  /** @param {{ entryId: string, resolvedByUserId: string }} input */
  return async function resolveMedicalHistoryEntry({ entryId, resolvedByUserId }) {
    const entry = await medicalHistoryRepository.findById(entryId);
    if (!entry) {
      throw new MedicalHistoryEntryNotFound();
    }

    entry.resolve({ resolvedBy: resolvedByUserId, now: clock.now() }); // throws InvalidMedicalHistoryEntryState

    return medicalHistoryRepository.update(entry);
  };
}
