import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Must run before resetUsers() -- CoachNote.player_id is ON DELETE RESTRICT
 * (Phase 10, mirrors Invoice's precedent), so a user with notes still
 * attached can't be deleted before they are.
 */
export async function resetCoaching() {
  await prisma.coachNote.deleteMany({});
}
