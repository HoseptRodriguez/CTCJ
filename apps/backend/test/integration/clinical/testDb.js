import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Must run before resetUsers() -- clinical_appointments.player_id and
 * clinical_notes.player_id are both ON DELETE RESTRICT. Delete notes before
 * appointments since clinical_notes.appointment_id is a nullable FK to
 * clinical_appointments (SET NULL on delete would work either way, but
 * explicit ordering avoids relying on that).
 */
export async function resetClinical() {
  await prisma.clinicalNote.deleteMany({});
  await prisma.clinicalAppointment.deleteMany({});
}
