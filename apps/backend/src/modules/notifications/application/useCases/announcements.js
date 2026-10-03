import { isWithinMarketingHours, nextAllowedSendTime, renderBasicFormatText } from '@ctcj/shared';

import { NotificationsError } from '../errors/NotificationsError.js';

export class AnnouncementNotFound extends NotificationsError {
  constructor() {
    super('announcement_not_found', 'Announcement not found');
  }
}
export class OutsidePromotionalHours extends NotificationsError {
  constructor(suggestedTime) {
    super('outside_promotional_hours', 'Promotional messages are not allowed at that time');
    this.suggestedTime = suggestedTime;
  }
}
export class AnnouncementNotCancellable extends NotificationsError {
  constructor() {
    super('announcement_not_cancellable', 'Only a scheduled announcement can be cancelled');
  }
}
export class AnnouncementInvalid extends NotificationsError {
  constructor(message) {
    super('announcement_invalid', message);
  }
}

const SHORT = 180;

/** First words of the text, for the bell (no format marks). */
function summary(body) {
  const text = renderBasicFormatText(body).replace(/\s+/g, ' ').trim();
  return text.length > SHORT ? `${text.slice(0, SHORT - 1)}…` : text;
}

/**
 * Comunicados (consola, Administración). An announcement is SERVICE
 * (operational: rain, maintenance) or PROMOTIONAL (events, offers -- only
 * to whoever authorized it, and only in the allowed hours). When its time
 * comes, a job marks it SENT and writes an outbox event in the same
 * transaction; the outbox processor then notifies each recipient.
 *
 * @param {{
 *   announcementRepository: import('../ports/AnnouncementRepository.js').AnnouncementRepository,
 *   emailDeliveryRepository: import('../ports/EmailDeliveryRepository.js').EmailDeliveryRepository,
 *   contactDirectory: import('../ports/ContactDirectory.js').ContactDirectory,
 *   audienceDirectory: import('../ports/AudienceDirectory.js').AudienceDirectory,
 *   notifyApi: ReturnType<typeof import('./notify.js').createNotify>,
 *   renderEmail: (input: object) => { html: string, text: string },
 *   clock: { now: () => Date },
 *   clubId: string,
 * }} deps
 */
export function createAnnouncementUseCases({
  announcementRepository,
  emailDeliveryRepository,
  contactDirectory,
  audienceDirectory,
  notifyApi,
  renderEmail,
  clock,
  clubId,
}) {
  async function audienceIds({ audienceType, audienceCategory, audienceTournamentId }) {
    switch (audienceType) {
      case 'ALL':
      case 'PLAYERS':
      case 'GUARDIANS':
        return contactDirectory.listNotifiableUserIds({ scope: audienceType });
      case 'CATEGORY':
        return audienceDirectory.playerIdsInCategory({ category: audienceCategory });
      case 'TOURNAMENT':
        return audienceDirectory.playerIdsInTournament({ tournamentId: audienceTournamentId });
      default:
        throw new AnnouncementInvalid('Unknown audience');
    }
  }

  function emailContent(a) {
    return {
      subject: a.title,
      heading: a.title,
      bodyFormat: a.body,
      image: a.imageUrl ? { url: a.imageUrl, alt: a.imageAlt } : undefined,
      cta: { label: 'Ver en Mi CTCJ', path: '/mi-ctcj/novedades' },
    };
  }

  function checkTime(kind, scheduledFor) {
    if (kind === 'PROMOTIONAL' && !isWithinMarketingHours(scheduledFor)) {
      throw new OutsidePromotionalHours(nextAllowedSendTime(scheduledFor, 'PROMOTIONAL'));
    }
  }

  return {
    /**
     * Counts and the email as it will look, without sending anything.
     * @param {object} draft  { title, body, imageUrl?, imageAlt?, kind, audienceType,
     *   audienceCategory?, audienceTournamentId?, scheduledFor? }
     */
    async previewAnnouncement(draft) {
      const ids = await audienceIds(draft);
      const { plans } = await notifyApi.plan({
        recipientIds: ids,
        type: 'ANNOUNCEMENT',
        announcementKind: draft.kind,
      });
      const at = draft.scheduledFor ? new Date(draft.scheduledFor) : clock.now();
      const allowedAt = nextAllowedSendTime(at, draft.kind);
      const email = renderEmail({
        ...emailContent(draft),
        kind: draft.kind,
        category: draft.kind === 'PROMOTIONAL' ? 'PROMOTIONS' : 'CLUB_NOTICES',
        recipient: {
          userId: '00000000-0000-0000-0000-000000000000',
          firstName: 'Ana',
          isGuardian: false,
        },
        about: null,
      });
      return {
        audience: ids.length,
        recipients: plans.filter((p) => p.app || p.email).length,
        excluded: plans.filter((p) => !p.app && !p.email).length,
        byApp: plans.filter((p) => p.app).length,
        byEmail: plans.reduce((n, p) => n + p.emailTargets.length, 0),
        timeAllowed: allowedAt.getTime() === at.getTime(),
        suggestedTime: allowedAt.getTime() === at.getTime() ? null : allowedAt,
        email: { subject: draft.title, html: email.html, text: email.text },
        app: { title: draft.title, body: summary(draft.body) },
      };
    },

    /**
     * "Enviar ahora" (scheduledFor empty) or "Programar". A promotional one
     * at a forbidden time is refused with the next allowed time proposed.
     */
    async createAnnouncement({ createdBy, scheduledFor, ...draft }) {
      const when = scheduledFor ? new Date(scheduledFor) : clock.now();
      if (scheduledFor && when.getTime() < clock.now().getTime() - 60 * 1000) {
        throw new AnnouncementInvalid('The scheduled time is in the past');
      }
      checkTime(draft.kind, when);
      if (draft.audienceType === 'TOURNAMENT') {
        const name = await audienceDirectory.tournamentName({
          tournamentId: draft.audienceTournamentId,
        });
        if (!name) throw new AnnouncementInvalid('Unknown tournament');
      }
      return announcementRepository.create({
        clubId,
        title: draft.title,
        body: draft.body,
        imageUrl: draft.imageUrl ?? null,
        imageAlt: draft.imageUrl ? draft.imageAlt : null,
        kind: draft.kind,
        audienceType: draft.audienceType,
        audienceCategory: draft.audienceType === 'CATEGORY' ? draft.audienceCategory : null,
        audienceTournamentId:
          draft.audienceType === 'TOURNAMENT' ? draft.audienceTournamentId : null,
        scheduledFor: when,
        createdBy,
      });
    },

    async cancelAnnouncement({ id }) {
      const row = await announcementRepository.cancel(id, clock.now());
      if (!row) {
        const existing = await announcementRepository.findById(id);
        if (!existing) throw new AnnouncementNotFound();
        throw new AnnouncementNotCancellable();
      }
      return row;
    },

    /** History with delivery stats (sent, failed, opened if Resend reports it). */
    async listAnnouncements({ limit = 50 } = {}) {
      const rows = await announcementRepository.list(clubId, limit);
      const stats = await emailDeliveryRepository.statsBySource(
        'ANNOUNCEMENT',
        rows.map((r) => r.id),
      );
      const waitingForQuota = await emailDeliveryRepository.quotaDeferredCount();
      return {
        announcements: rows.map((r) => ({
          ...r,
          emails: stats.get(r.id) ?? { queued: 0, sent: 0, failed: 0, opened: 0 },
        })),
        waitingForQuota,
      };
    },

    /** Job: publishes the announcements whose time has come. */
    async publishDueAnnouncements() {
      return announcementRepository.publishDue(clock.now());
    },

    /** Outbox handler: notifies every recipient of a published announcement. */
    async dispatchAnnouncement({ announcementId }) {
      const a = await announcementRepository.findById(announcementId);
      if (!a || a.status !== 'SENT') return;
      const ids = await audienceIds(a);
      const counts = await notifyApi.notify({
        recipientIds: ids,
        type: 'ANNOUNCEMENT',
        announcementKind: a.kind,
        title: a.title,
        body: summary(a.body),
        linkPath: '/mi-ctcj/novedades',
        email: emailContent(a),
        sourceType: 'ANNOUNCEMENT',
        sourceId: a.id,
      });
      await announcementRepository.setCounts(a.id, {
        recipientsCount: counts.recipients,
        excludedCount: counts.excluded,
      });
    },

    /**
     * Mi CTCJ > Novedades: the club's sent announcements meant for this
     * person (their audience includes them).
     * @param {{ userId: string }} input
     */
    async listMyNews({ userId, limit = 30 }) {
      const sent = await announcementRepository.listSent(clubId, limit);
      const cache = new Map();
      const includes = async (a) => {
        const key = `${a.audienceType}|${a.audienceCategory}|${a.audienceTournamentId}`;
        if (!cache.has(key)) cache.set(key, new Set(await audienceIds(a)));
        return cache.get(key).has(userId);
      };
      const news = [];
      for (const a of sent) {
        if (await includes(a)) {
          news.push({
            id: a.id,
            title: a.title,
            body: a.body,
            imageUrl: a.imageUrl,
            imageAlt: a.imageAlt,
            kind: a.kind,
            publishedAt: a.dispatchedAt,
          });
        }
      }
      return { news };
    },
  };
}
