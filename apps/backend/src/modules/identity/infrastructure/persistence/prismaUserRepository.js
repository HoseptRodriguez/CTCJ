import { User } from '../../domain/entities/User.js';

function toDomainUser(row, roleCodes) {
  return new User({
    id: row.id,
    clubId: row.clubId,
    email: row.email,
    passwordHash: row.passwordHash,
    firstName: row.firstName,
    lastName: row.lastName,
    status: row.status,
    roleCodes,
    failedLoginCount: row.failedLoginCount,
    lockedUntil: row.lockedUntil,
    lastLoginAt: row.lastLoginAt,
    emailVerifiedAt: row.emailVerifiedAt,
    membershipStatus: row.membershipStatus,
    membershipStatusUpdatedAt: row.membershipStatusUpdatedAt,
    membershipStatusUpdatedBy: row.membershipStatusUpdatedBy,
    phone: row.phone,
    birthDate: row.birthDate,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
  });
}

function toPrismaCreateData(user) {
  return {
    id: user.id,
    clubId: user.clubId,
    email: user.email,
    passwordHash: user.passwordHash,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    failedLoginCount: user.failedLoginCount,
    lockedUntil: user.lockedUntil,
    lastLoginAt: user.lastLoginAt,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/UserRepository.js').UserRepository}
 */
export function createPrismaUserRepository(prisma) {
  async function getActiveRoleCodes(userId) {
    const rows = await prisma.$queryRaw`
      SELECT role_code FROM user_roles_view WHERE user_id = ${userId}::uuid
    `;
    return rows.map((r) => r.role_code);
  }

  return {
    async findById(id) {
      const row = await prisma.user.findUnique({ where: { id } });
      if (!row) return null;
      return toDomainUser(row, await getActiveRoleCodes(row.id));
    },

    async findByEmail(clubId, email) {
      const row = await prisma.user.findUnique({
        where: { clubId_email: { clubId, email } },
      });
      if (!row) return null;
      return toDomainUser(row, await getActiveRoleCodes(row.id));
    },

    async findByIds(ids) {
      if (ids.length === 0) return [];
      const rows = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      return rows;
    },

    async existsByEmail(clubId, email) {
      const count = await prisma.user.count({ where: { clubId, email } });
      return count > 0;
    },

    async create(user) {
      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.user.create({ data: toPrismaCreateData(user) });
        for (const roleCode of user.listRoleCodes()) {
          const role = await tx.role.findUniqueOrThrow({ where: { code: roleCode } });
          await tx.userRole.create({
            data: { userId: row.id, roleId: role.id, grantedBy: null },
          });
        }
        return row;
      });
      return toDomainUser(created, user.listRoleCodes());
    },

    async update(user) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: user.passwordHash,
          status: user.status,
          failedLoginCount: user.failedLoginCount,
          lockedUntil: user.lockedUntil,
          lastLoginAt: user.lastLoginAt,
          emailVerifiedAt: user.emailVerifiedAt,
          membershipStatus: user.membershipStatus,
          membershipStatusUpdatedAt: user.membershipStatusUpdatedAt,
          membershipStatusUpdatedBy: user.membershipStatusUpdatedBy,
          phone: user.phone,
          birthDate: user.birthDate,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
        },
      });
      return toDomainUser(updated, await getActiveRoleCodes(user.id));
    },

    async addRoleGrant(userId, roleCode, grantedByUserId) {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      await prisma.userRole.create({
        data: { userId, roleId: role.id, grantedBy: grantedByUserId ?? null },
      });
    },

    async countPlayersByMembershipStatus(clubId) {
      const rows = await prisma.$queryRaw`
        SELECT COALESCE(u.membership_status, 'NONE') AS status, COUNT(*)::int AS count
        FROM "users" u
        JOIN user_roles_view urv ON urv.user_id = u.id
        WHERE u.club_id = ${clubId}::uuid AND urv.role_code = 'JUGADOR'
        GROUP BY COALESCE(u.membership_status, 'NONE')
      `;
      const counts = { ACTIVE: 0, PENDING: 0, OVERDUE: 0, INACTIVE: 0, SUSPENDED: 0, NONE: 0 };
      for (const row of rows) {
        counts[row.status] = row.count;
      }
      return counts;
    },
  };
}
