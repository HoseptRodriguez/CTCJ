function toRow(r) {
  return {
    id: r.id,
    clubId: r.clubId,
    fullName: r.fullName,
    phone: r.phone,
    email: r.email,
    program: r.program,
    forWhom: r.forWhom,
    childAge: r.childAge,
    preferredTimes: r.preferredTimes,
    message: r.message,
    marketingOptIn: r.marketingOptIn,
    status: r.status,
    handledAt: r.handledAt,
    handledBy: r.handledByUser
      ? {
          id: r.handledByUser.id,
          firstName: r.handledByUser.firstName,
          lastName: r.handledByUser.lastName,
        }
      : null,
    createdAt: r.createdAt,
    notes: (r.notes ?? []).map((n) => ({
      id: n.id,
      text: n.text,
      createdAt: n.createdAt,
      author: n.author ? { firstName: n.author.firstName, lastName: n.author.lastName } : null,
    })),
  };
}

const person = { select: { id: true, firstName: true, lastName: true } };
const include = {
  handledByUser: person,
  notes: { orderBy: { createdAt: 'asc' }, include: { author: person } },
};

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/InfoRequestRepository.js').InfoRequestRepository}
 */
export function createPrismaInfoRequestRepository(prisma) {
  return {
    async create(request, { consents }) {
      await prisma.infoRequest.create({
        data: { ...request, consents: { create: consents } },
      });
    },

    async findById(id) {
      const r = await prisma.infoRequest.findUnique({ where: { id }, include });
      return r ? toRow(r) : null;
    },

    async list({ clubId, status, program }) {
      const rows = await prisma.infoRequest.findMany({
        where: { clubId, ...(status ? { status } : {}), ...(program ? { program } : {}) },
        orderBy: { createdAt: 'desc' },
        include,
      });
      return rows.map(toRow);
    },

    async countByStatus(clubId, status) {
      return prisma.infoRequest.count({ where: { clubId, status } });
    },

    async update(id, changes) {
      const r = await prisma.infoRequest.update({ where: { id }, data: changes, include });
      return toRow(r);
    },

    async addNote(id, { text, authorId, createdAt }) {
      await prisma.infoRequestNote.create({ data: { requestId: id, text, authorId, createdAt } });
    },

    async deleteOlderThan(clubId, cutoff, statuses) {
      const { count } = await prisma.infoRequest.deleteMany({
        where: { clubId, status: { in: statuses }, createdAt: { lt: cutoff } },
      });
      return count;
    },
  };
}
