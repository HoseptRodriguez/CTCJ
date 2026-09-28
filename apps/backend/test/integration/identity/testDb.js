import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Deletes all users (cascades to refresh tokens / verifications / user_roles)
 * between tests. Consents first: they RESTRICT the delete on purpose (in the
 * app the proof of an authorization is never deleted; only tests wipe it).
 */
export async function resetUsers() {
  await prisma.consent.deleteMany({});
  await prisma.user.deleteMany({});
}
