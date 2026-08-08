import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/** Must run before resetUsers() -- notifications.recipient_id is CASCADE,
 * so this isn't strictly required for FK safety, but keeping it explicit
 * (and run first) matches every other module's reset-ordering convention. */
export async function resetNotifications() {
  await prisma.notification.deleteMany({});
}
