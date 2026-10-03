const REACHABLE = { status: 'ACTIVE', deletedAt: null, isDemo: false };

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export function createPrismaNotificationDirectoryRepository(prisma) {
  return {
    async findContacts(userIds) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, ...REACHABLE },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          emailVerifiedAt: true,
          guardianshipsAsMinor: {
            where: { status: 'APPROVED', guardian: REACHABLE },
            select: {
              guardian: {
                select: { id: true, email: true, firstName: true, emailVerifiedAt: true },
              },
            },
          },
        },
      });
      return users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        birthDate: u.birthDate,
        emailVerified: u.emailVerifiedAt != null,
        guardians: u.guardianshipsAsMinor.map(({ guardian }) => ({
          id: guardian.id,
          email: guardian.email,
          firstName: guardian.firstName,
          emailVerified: guardian.emailVerifiedAt != null,
        })),
      }));
    },

    async listUserIds({ clubId, scope }) {
      const where = { clubId, ...REACHABLE };
      if (scope === 'PLAYERS') {
        where.userRoles = { some: { revokedAt: null, role: { code: 'JUGADOR' } } };
      } else if (scope === 'GUARDIANS') {
        where.guardianshipsAsGuardian = { some: { status: 'APPROVED' } };
      }
      const rows = await prisma.user.findMany({ where, select: { id: true } });
      return rows.map((r) => r.id);
    },
  };
}
