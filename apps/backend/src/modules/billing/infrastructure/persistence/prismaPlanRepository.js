function toPlanRow(row) {
  return {
    id: row.id,
    clubId: row.clubId,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

function toPriceRow(row) {
  return {
    id: row.id,
    planId: row.planId,
    basePriceCop: row.basePriceCop,
    validFrom: row.validFrom,
    validTo: row.validTo,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/PlanRepository.js').PlanRepository}
 */
export function createPrismaPlanRepository(prisma) {
  return {
    async create({ clubId, code, name, description }) {
      const record = await prisma.membershipPlan.create({
        data: { clubId, code, name, description },
      });
      return toPlanRow(record);
    },

    async findById(id) {
      const record = await prisma.membershipPlan.findUnique({ where: { id } });
      return record ? toPlanRow(record) : null;
    },

    async findByCode(clubId, code) {
      const record = await prisma.membershipPlan.findUnique({
        where: { clubId_code: { clubId, code } },
      });
      return record ? toPlanRow(record) : null;
    },

    async findByName(clubId, name) {
      const record = await prisma.membershipPlan.findFirst({
        where: { clubId, name: { equals: name.trim(), mode: 'insensitive' } },
      });
      return record ? toPlanRow(record) : null;
    },

    async listCodes(clubId) {
      const records = await prisma.membershipPlan.findMany({
        where: { clubId },
        select: { code: true },
      });
      return records.map((r) => r.code);
    },

    async update(id, changes) {
      const record = await prisma.membershipPlan.update({ where: { id }, data: changes });
      return toPlanRow(record);
    },

    async listByClub(clubId) {
      const records = await prisma.membershipPlan.findMany({
        where: { clubId },
        orderBy: { createdAt: 'asc' },
      });
      return records.map(toPlanRow);
    },

    async findCurrentPrice(planId) {
      const record = await prisma.membershipPlanPrice.findFirst({
        where: { planId, validTo: null },
      });
      return record ? toPriceRow(record) : null;
    },

    async findPriceAt(planId, date) {
      const record = await prisma.membershipPlanPrice.findFirst({
        where: {
          planId,
          validFrom: { lte: date },
          OR: [{ validTo: null }, { validTo: { gt: date } }],
        },
        orderBy: { validFrom: 'desc' },
      });
      return record ? toPriceRow(record) : null;
    },

    async listPrices(planId) {
      const records = await prisma.membershipPlanPrice.findMany({
        where: { planId },
        orderBy: { validFrom: 'desc' },
      });
      return records.map(toPriceRow);
    },

    async supersedePrice(planId, { closePrevious, newRow, createdBy }) {
      const operations = [];
      if (closePrevious) {
        operations.push(
          prisma.membershipPlanPrice.update({
            where: { id: closePrevious.id },
            data: { validTo: closePrevious.validTo },
          }),
        );
      }
      operations.push(
        prisma.membershipPlanPrice.create({
          data: {
            planId,
            basePriceCop: BigInt(newRow.basePriceCop),
            validFrom: newRow.validFrom,
            createdBy,
          },
        }),
      );

      const results = await prisma.$transaction(operations);
      return toPriceRow(results[results.length - 1]);
    },

    async cancelScheduledPrice({ scheduledId, previousId }) {
      await prisma.$transaction([
        prisma.membershipPlanPrice.delete({ where: { id: scheduledId } }),
        ...(previousId
          ? [
              prisma.membershipPlanPrice.update({
                where: { id: previousId },
                data: { validTo: null },
              }),
            ]
          : []),
      ]);
    },
  };
}
