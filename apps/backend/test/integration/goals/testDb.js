import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/** Must run before resetUsers() -- goals.player_id is ON DELETE RESTRICT. */
export async function resetGoals() {
  await prisma.goal.deleteMany({});
}
