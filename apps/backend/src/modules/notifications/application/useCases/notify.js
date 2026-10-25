import { classifyNotification, nextAllowedSendTime } from '@ctcj/shared';

import { planDelivery } from '../policies/deliveryPlan.js';

/**
 * Sends one notification to many people, through the channels each one
 * allows: in the app right away; by email through the queue
 * (email_deliveries), never before the allowed hours of its kind, and once
 * a day inside the digest for whoever chose "Resumen diario".
 *
 * Idempotent per (source, address): a retried outbox event doesn't email
 * twice.
 *
 * @param {{
 *   contactDirectory: import('../ports/ContactDirectory.js').ContactDirectory,
 *   preferenceRepository: import('../ports/NotificationPreferenceRepository.js').NotificationPreferenceRepository,
 *   marketingGateway: import('../ports/MarketingGateway.js').MarketingGateway,
 *   emailDeliveryRepository: import('../ports/EmailDeliveryRepository.js').EmailDeliveryRepository,
 *   createNotification: (input: object) => Promise<object>,
 *   renderEmail: (input: object) => { html: string, text: string },
 *   clock: { now: () => Date },
 * }} deps
 */
export function createNotify({
  contactDirectory,
  preferenceRepository,
  marketingGateway,
  emailDeliveryRepository,
  createNotification,
  renderEmail,
  clock,
}) {
  /**
   * Who would receive it and through what, without sending anything
   * (the announcement preview uses it for its counts).
   */
  async function plan({ recipientIds, type, announcementKind }) {
    const { kind, category } = classifyNotification(type, { announcementKind });
    const contacts = await contactDirectory.getNotificationContacts({ userIds: recipientIds });
    const servicePrefs = await preferenceRepository.listForUsers(contacts.map((c) => c.id));
    const plans = [];
    for (const contact of contacts) {
      const marketingMatrix =
        kind === 'PROMOTIONAL'
          ? (await marketingGateway.getMarketingPreferences({ userId: contact.id })).matrix
          : undefined;
      plans.push({
        contact,
        ...planDelivery({
          category,
          contact,
          servicePreferences: servicePrefs.get(contact.id) ?? [],
          marketingMatrix,
        }),
      });
    }
    return { kind, category, plans, unknown: recipientIds.length - contacts.length };
  }

  /**
   * @param {{
   *   recipientIds: string[], type: string, announcementKind?: 'SERVICE'|'PROMOTIONAL',
   *   title: string, body?: string|null, linkPath?: string|null,
   *   email: { subject: string, heading: string, paragraphs?: string[], bodyFormat?: string,
   *     cta?: { label: string, path: string }, image?: { url: string, alt: string } },
   *   sourceType: 'EVENT'|'ANNOUNCEMENT', sourceId: string,
   * }} input
   */
  async function notify(input) {
    const { recipientIds, type, announcementKind, title, body, linkPath, email } = input;
    const { kind, category, plans } = await plan({ recipientIds, type, announcementKind });
    const now = clock.now();
    const notBefore = nextAllowedSendTime(now, kind);
    const digestUsers = await preferenceRepository.digestUserIds(
      plans.flatMap((p) => p.emailTargets.map((t) => t.userId)),
    );

    let app = 0;
    const rows = [];
    for (const p of plans) {
      if (p.app) {
        await createNotification({ recipientId: p.contact.id, type, title, body, linkPath });
        app += 1;
      }
      for (const target of p.emailTargets) {
        if (
          await emailDeliveryRepository.existsForSource(
            input.sourceType,
            input.sourceId,
            target.email,
          )
        ) {
          continue;
        }
        const rendered = renderEmail({
          ...email,
          kind,
          category,
          recipient: target,
          about: target.isGuardian ? p.contact : null,
        });
        rows.push({
          recipientUserId: target.userId,
          aboutUserId: p.contact.id,
          toEmail: target.email,
          kind,
          category,
          subject: email.subject,
          html: rendered.html,
          text: rendered.text,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          status: digestUsers.has(target.userId) ? 'DIGEST' : 'QUEUED',
          notBefore,
          deferredReason: notBefore > now ? 'HOURS' : null,
        });
      }
    }
    // A guardian with two children in the same tournament gets one email.
    const seen = new Set();
    const unique = rows.filter((r) => {
      const key = `${r.toEmail}|${r.aboutUserId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    await emailDeliveryRepository.enqueueMany(unique);
    return {
      recipients: plans.filter((p) => p.app || p.email).length,
      excluded: plans.filter((p) => !p.app && !p.email).length,
      app,
      emails: unique.length,
    };
  }

  return { notify, plan };
}
