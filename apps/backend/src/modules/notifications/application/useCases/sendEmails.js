import { clubDateOf, isWithinMarketingHours, nextAllowedSendTime } from '@ctcj/shared';

export const EMAIL_MAX_ATTEMPTS = 3;
const CLUB_OFFSET_MS = -5 * 60 * 60 * 1000;

/** Midnight (club time) of the instant's club date, as a UTC instant. */
function clubMidnight(instant) {
  return new Date(Date.parse(`${clubDateOf(instant)}T00:00:00Z`) - CLUB_OFFSET_MS);
}
function clubMonthStart(instant) {
  return new Date(Date.parse(`${clubDateOf(instant).slice(0, 7)}-01T00:00:00Z`) - CLUB_OFFSET_MS);
}
function nextClubDay(instant) {
  return new Date(clubMidnight(instant).getTime() + 24 * 60 * 60 * 1000);
}
function nextClubMonth(instant) {
  const [y, m] = clubDateOf(instant).split('-').map(Number);
  const first = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return new Date(Date.parse(`${first}T00:00:00Z`) - CLUB_OFFSET_MS);
}

/**
 * Sends the due emails in batches, within the plan limits (Resend: daily
 * and monthly quota, requests per second, emails per batch call -- all
 * configurable). Over a limit, the rest waits for the next day (or month)
 * and the administrator sees how many are waiting. Each email is retried
 * up to 3 times; then it is marked FAILED with its error.
 *
 * @param {{
 *   emailDeliveryRepository: import('../ports/EmailDeliveryRepository.js').EmailDeliveryRepository,
 *   emailTransport: import('../ports/EmailTransport.js').EmailTransport,
 *   limits: { dailyQuota: number, monthlyQuota: number, batchSize: number, requestsPerSecond: number },
 *   headersFor?: (delivery: object) => Record<string, string>,
 *   clock: { now: () => Date },
 *   sleep?: (ms: number) => Promise<void>,
 * }} deps
 */
export function createSendDueEmails({
  emailDeliveryRepository,
  emailTransport,
  limits,
  headersFor = () => ({}),
  clock,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  return async function sendDueEmails({ maxBatches = 10 } = {}) {
    const result = { sent: 0, failed: 0, retried: 0, deferred: 0 };
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const now = clock.now();
      const sentToday = await emailDeliveryRepository.countSentSince(clubMidnight(now));
      const sentMonth = await emailDeliveryRepository.countSentSince(clubMonthStart(now));
      const room = Math.min(
        limits.batchSize,
        limits.dailyQuota - sentToday,
        limits.monthlyQuota - sentMonth,
      );
      const due = await emailDeliveryRepository.listDue(now, Math.max(room, 0) || limits.batchSize);
      if (due.length === 0) break;

      if (room <= 0) {
        // Plan limit reached: everything due waits for the next day/month.
        const monthFull = limits.monthlyQuota - sentMonth <= 0;
        const base = monthFull ? nextClubMonth(now) : nextClubDay(now);
        const all = await emailDeliveryRepository.listDue(now, 10000);
        for (const kind of ['SERVICE', 'PROMOTIONAL']) {
          const ids = all.filter((d) => d.kind === kind).map((d) => d.id);
          if (ids.length) {
            await emailDeliveryRepository.reschedule(ids, {
              notBefore: nextAllowedSendTime(base, kind),
              reason: 'QUOTA',
            });
          }
        }
        result.deferred += all.length;
        break;
      }

      // A promotional email may have become due outside its hours (e.g. a
      // retry): it waits for the next allowed window.
      const outOfHours = due.filter(
        (d) => d.kind === 'PROMOTIONAL' && !isWithinMarketingHours(now),
      );
      if (outOfHours.length) {
        await emailDeliveryRepository.reschedule(
          outOfHours.map((d) => d.id),
          { notBefore: nextAllowedSendTime(now, 'PROMOTIONAL'), reason: 'HOURS' },
        );
        result.deferred += outOfHours.length;
      }
      const sendable = due.filter((d) => !outOfHours.includes(d));
      if (sendable.length === 0) continue;

      try {
        const sent = await emailTransport.sendBatch(
          sendable.map((d) => ({
            to: d.toEmail,
            subject: d.subject,
            html: d.html,
            text: d.text,
            headers: headersFor(d),
          })),
        );
        const at = clock.now();
        for (let i = 0; i < sendable.length; i += 1) {
          await emailDeliveryRepository.markSent(sendable[i].id, {
            providerMessageId: sent[i]?.id ?? null,
            sentAt: at,
          });
        }
        result.sent += sendable.length;
      } catch (error) {
        const message = String(error?.message ?? error).slice(0, 1000);
        for (const d of sendable) {
          const attempts = d.attempts + 1;
          const failed = attempts >= EMAIL_MAX_ATTEMPTS;
          await emailDeliveryRepository.markAttemptFailed(d.id, {
            error: message,
            attempts,
            failed,
            // 5, then 10 minutes between tries.
            retryAt: new Date(clock.now().getTime() + attempts * 5 * 60 * 1000),
          });
          if (failed) result.failed += 1;
          else result.retried += 1;
        }
        break;
      }
      // Stay under the requests-per-second limit between batch calls.
      await sleep(Math.ceil(1000 / Math.max(limits.requestsPerSecond, 1)));
    }
    return result;
  };
}

/**
 * "Resumen diario": once a day, everything waiting for a person goes in a
 * single email. Promotional items only join when promotional messages are
 * allowed at that moment; otherwise they wait for the next digest.
 *
 * @param {{
 *   emailDeliveryRepository: import('../ports/EmailDeliveryRepository.js').EmailDeliveryRepository,
 *   renderDigest: (input: { recipient: object, items: object[] }) => { subject: string, html: string, text: string },
 *   clock: { now: () => Date },
 * }} deps
 */
export function createSendDailyDigests({ emailDeliveryRepository, renderDigest, clock }) {
  return async function sendDailyDigests() {
    const now = clock.now();
    const promotionalAllowed = isWithinMarketingHours(now);
    const items = (await emailDeliveryRepository.listDigestItems()).filter(
      (d) => d.kind === 'SERVICE' || promotionalAllowed,
    );
    const byRecipient = new Map();
    for (const item of items) {
      const key = item.toEmail;
      if (!byRecipient.has(key)) byRecipient.set(key, []);
      byRecipient.get(key).push(item);
    }
    const rows = [];
    for (const [toEmail, list] of byRecipient) {
      const digest = renderDigest({
        recipient: { userId: list[0].recipientUserId, toEmail },
        items: list,
      });
      rows.push({
        recipientUserId: list[0].recipientUserId,
        aboutUserId: null,
        toEmail,
        kind: list.some((i) => i.kind === 'PROMOTIONAL') ? 'PROMOTIONAL' : 'SERVICE',
        category: 'ACCOUNT',
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
        sourceType: 'DIGEST',
        sourceId: null,
        status: 'QUEUED',
        notBefore: now,
        deferredReason: null,
      });
      await emailDeliveryRepository.markIncludedInDigest(
        list.map((i) => i.id),
        now,
      );
    }
    await emailDeliveryRepository.enqueueMany(rows);
    return { digests: rows.length, items: items.length };
  };
}
