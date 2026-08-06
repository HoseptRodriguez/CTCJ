import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Must run before resetUsers() -- clinical_appointments.player_id,
 * clinical_notes.player_id, recovery_plans.player_id, and
 * medical_history_entries.player_id are all ON DELETE RESTRICT. Delete
 * notes before appointments since clinical_notes.appointment_id is a
 * nullable FK to clinical_appointments (SET NULL on delete would work
 * either way, but explicit ordering avoids relying on that). Recovery
 * plans and medical history entries have no FK to appointments, so their
 * order relative to the other two doesn't matter.
 */
export async function resetClinical() {
  await prisma.clinicalNote.deleteMany({});
  await prisma.clinicalAppointment.deleteMany({});
  await prisma.recoveryPlan.deleteMany({});
  await prisma.medicalHistoryEntry.deleteMany({});
}
