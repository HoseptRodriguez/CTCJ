import { writeOutboxEvent } from '../../../../shared/outbox.js';

const SELECT = {
  id: true,
  title: true,
  body: true,
  imageUrl: true,
  imageAlt: true,
  kind: true,
  audienceType: true,
  audienceCategory: true,
  audienceTournamentId: true,
  status: true,
  scheduledFor: true,
  dispatchedAt: true,
  recipientsCount: true,
  excludedCount: true,
  createdBy: true,
  createdAt: true,
  cancelledAt: true,
};

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/AnnouncementRepository.js').AnnouncementRepository}
 */
export function createPrismaAnnouncementRepository(prisma) {
  return {
    async create(data) {
      return prisma.announcement.create({ data, select: SELECT });
    },

    async findById(id) {
      return prisma.announcement.findUnique({ where: { id }, select: SELECT });
    },

    async list(clubId, limit) {
      return prisma.announcement.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: SELECT,
      });
    },

    async cancel(id, at) {
      const { count } = await prisma.announcement.updateMany({
        where: { id, status: 'SCHEDULED' },
        data: { status: 'CANCELLED', cancelledAt: at },
      });
      return count ? prisma.announcement.findUnique({ where: { id }, select: SELECT }) : null;
    },

    async publishDue(now) {
      const due = await prisma.announcement.findMany({
        where: { status: 'SCHEDULED', scheduledFor: { lte: now } },
        select: { id: true },
      });
      const published = [];
      for (const { id } of due) {
        // Status change and its outbox event, together or not at all. The
        // conditional update keeps two workers from publishing it twice.
        const done = await prisma.$transaction(async (tx) => {
          const { count } = await tx.announcement.updateMany({
            where: { id, status: 'SCHEDULED' },
            data: { status: 'SENT', dispatchedAt: now },
          });
          if (!count) return false;
          await writeOutboxEvent(tx, {
            aggregateType: 'Announcement',
            aggregateId: id,
            eventType: 'ANNOUNCEMENT_PUBLISHED',
            payload: { announcementId: id },
          });
          return true;
        });
        if (done) published.push(id);
      }
      return published;
    },

    async setCounts(id, { recipientsCount, excludedCount }) {
      await prisma.announcement.update({
        where: { id },
        data: { recipientsCount, excludedCount },
      });
    },

    async listSent(clubId, limit) {
      return prisma.announcement.findMany({
        where: { clubId, status: 'SENT' },
        orderBy: { dispatchedAt: 'desc' },
        take: limit,
        select: SELECT,
      });
    },
  };
}
