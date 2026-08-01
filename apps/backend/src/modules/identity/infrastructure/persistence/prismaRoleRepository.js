/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/RoleRepository.js').RoleRepository}
 */
export function createPrismaRoleRepository(prisma) {
  return {
    async findByCode(code) {
      const row = await prisma.role.findUnique({ where: { code } });
      if (!row) return null;
      return {
        id: row.id,
        code: row.code,
        selfAssignable: row.selfAssignable,
        requiresMfa: row.requiresMfa,
      };
    },
  };
}
