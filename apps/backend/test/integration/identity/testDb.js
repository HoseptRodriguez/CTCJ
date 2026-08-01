import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/** Deletes all users (cascades to refresh tokens / verifications / user_roles) between tests. */
export async function resetUsers() {
  await prisma.user.deleteMany({});
}
