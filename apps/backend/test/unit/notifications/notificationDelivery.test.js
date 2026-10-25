import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';
import { parseBasicFormat, renderBasicFormatHtml, renderBasicFormatText } from '@ctcj/shared';

import { planDelivery } from '../../../src/modules/notifications/application/policies/deliveryPlan.js';
import { createPreferenceUseCases } from '../../../src/modules/notifications/application/useCases/preferences.js';
import { createProcessOutbox } from '../../../src/modules/notifications/application/useCases/processOutbox.js';
import { createSendDueEmails } from '../../../src/modules/notifications/application/useCases/sendEmails.js';
import { createNotificationEmailRenderer } from '../../../src/modules/notifications/infrastructure/email/notificationEmail.js';
import { createMemoryEmailTransport } from '../../../src/modules/notifications/infrastructure/email/emailTransport.js';
import { verifyResendSignature } from '../../../src/modules/notifications/infrastructure/http/publicRoutes.js';
import { createUnsubscribeTokens } from '../../../src/modules/notifications/infrastructure/security/unsubscribeTokens.js';
import { publicPlayerName } from '../../../src/modules/tournament/domain/policies/publicPlayerName.js';

const ADULT = {
  id: 'a',
  email: 'ana@example.com',
  firstName: 'Ana',
  isMinor: false,
  guardians: [],
};
const MINOR = {
  id: 'm',
  email: 'lucia@example.com',
  firstName: 'Lucía',
  isMinor: true,
  guardians: [{ id: 'g', email: 'mama@example.com', firstName: 'Marta' }],
};

describe('delivery plan', () => {
  it('service notifications come activated, by app and email', () => {
    expect(planDelivery({ category: 'MY_TOURNAMENTS', contact: ADULT })).toMatchObject({
      app: true,
      email: true,
      emailTargets: [{ email: 'ana@example.com', isGuardian: false }],
    });
  });

  it('a service switch turned off is respected, per channel', () => {
    const plan = planDelivery({
      category: 'RESULTS_NOTES',
      contact: ADULT,
      servicePreferences: [{ category: 'RESULTS_NOTES', channel: 'EMAIL', enabled: false }],
    });
    expect(plan).toMatchObject({ app: true, email: false, emailTargets: [] });
  });

  it('promotional: nothing without the authorization; only the authorized channel', () => {
    expect(planDelivery({ category: 'PROMOTIONS', contact: ADULT })).toMatchObject({
      app: false,
      email: false,
    });
    const plan = planDelivery({
      category: 'NEW_TOURNAMENTS',
      contact: ADULT,
      marketingMatrix: { NEW_TOURNAMENTS: { APP: false, EMAIL: true } },
    });
    expect(plan).toMatchObject({ app: false, email: true });
  });

  it('a minor: the email goes to the guardian, never to the minor', () => {
    const plan = planDelivery({ category: 'MY_TOURNAMENTS', contact: MINOR });
    expect(plan.emailTargets).toEqual([
      { userId: 'g', email: 'mama@example.com', firstName: 'Marta', isGuardian: true },
    ]);
    expect(plan.emailTargets.map((t) => t.email)).not.toContain('lucia@example.com');
    // No approved guardian: no email at all.
    expect(
      planDelivery({ category: 'MY_TOURNAMENTS', contact: { ...MINOR, guardians: [] } }).email,
    ).toBe(false);
  });

  it('account notices are always sent; challenges stay in the app', () => {
    const off = [{ category: 'ACCOUNT', channel: 'EMAIL', enabled: false }];
    expect(
      planDelivery({ category: 'ACCOUNT', contact: ADULT, servicePreferences: off }).email,
    ).toBe(true);
    expect(planDelivery({ category: 'ACTIVITY', contact: ADULT })).toMatchObject({
      app: true,
      email: false,
    });
  });
});

describe('preferences', () => {
  function setup({ isMinor = false } = {}) {
    let matrix = {
      NEW_TOURNAMENTS: { APP: false, EMAIL: false },
      PROMOTIONS: { APP: false, EMAIL: false },
    };
    const rows = [];
    const marketingGateway = {
      getMarketingPreferences: vi.fn(async () => ({ isMinor, givenByGuardian: false, matrix })),
      setMarketingPreferences: vi.fn(async (input) => {
        matrix = input.matrix;
      }),
      stopMarketingEmails: vi.fn(async ({ category }) => {
        matrix = { ...matrix, [category]: { ...matrix[category], EMAIL: false } };
      }),
    };
    const preferenceRepository = {
      listForUser: async () => rows,
      getSettings: async () => ({ dailyDigest: false }),
      setSettings: vi.fn(async () => {}),
      upsertMany: vi.fn(async (_u, list) => {
        for (const r of list) {
          const i = rows.findIndex((x) => x.category === r.category && x.channel === r.channel);
          if (i >= 0) rows[i] = r;
          else rows.push(r);
        }
      }),
    };
    return {
      uc: createPreferenceUseCases({ preferenceRepository, marketingGateway }),
      marketingGateway,
      preferenceRepository,
    };
  }

  it('service on, promotional off by default; push prepared but not available', async () => {
    const { uc } = setup();
    const view = await uc.getMyNotificationPreferences({ userId: 'u' });
    const byId = Object.fromEntries(view.categories.map((c) => [c.id, c.channels]));
    expect(byId.RESULTS_NOTES).toEqual({ APP: true, EMAIL: true, PUSH: true });
    expect(byId.PROMOTIONS).toEqual({ APP: false, EMAIL: false, PUSH: false });
    expect(view.channels.find((c) => c.id === 'PUSH').available).toBe(false);
  });

  it('turning on a promotional category goes to the MARKETING consent', async () => {
    const { uc, marketingGateway } = setup();
    await uc.updateMyNotificationPreferences({
      userId: 'u',
      categories: { NEW_TOURNAMENTS: { EMAIL: true }, RESULTS_NOTES: { EMAIL: false } },
      dailyDigest: true,
      ipAddress: '1.2.3.4',
    });
    expect(marketingGateway.setMarketingPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u',
        matrix: expect.objectContaining({ NEW_TOURNAMENTS: { APP: false, EMAIL: true } }),
        ipAddress: '1.2.3.4',
      }),
    );
  });

  it('"Dejar de recibir": promotional -> consent; service -> that email switch', async () => {
    const { uc, marketingGateway, preferenceRepository } = setup();
    await uc.stopEmails({ userId: 'u', category: 'PROMOTIONS' });
    expect(marketingGateway.stopMarketingEmails).toHaveBeenCalledWith({
      userId: 'u',
      category: 'PROMOTIONS',
    });
    await uc.stopEmails({ userId: 'u', category: 'CLUB_NOTICES' });
    expect(preferenceRepository.upsertMany).toHaveBeenCalledWith('u', [
      { category: 'CLUB_NOTICES', channel: 'EMAIL', enabled: false },
    ]);
  });
});

describe('unsubscribe link', () => {
  const tokens = createUnsubscribeTokens({ secret: 'a-very-long-test-secret-of-32-chars!!' });
  const userId = '11111111-2222-4333-8444-555555555555';

  it('works without login and says who and what', () => {
    expect(tokens.verify(tokens.create(userId, 'PROMOTIONS'))).toEqual({
      userId,
      category: 'PROMOTIONS',
    });
  });

  it("can't be changed to another person or category, nor forged", () => {
    const token = tokens.create(userId, 'PROMOTIONS');
    const [, sig] = token.split('.');
    const other = Buffer.from(`${userId}.CLUB_NOTICES`).toString('base64url');
    expect(tokens.verify(`${other}.${sig}`)).toBeNull();
    expect(tokens.verify(`${token}x`)).toBeNull();
    expect(
      createUnsubscribeTokens({ secret: 'another-secret-entirely-1234567890' }).verify(token),
    ).toBeNull();
    expect(tokens.verify('nada')).toBeNull();
  });
});

describe('email template', () => {
  const render = createNotificationEmailRenderer({
    siteUrl: 'https://club.test',
    unsubscribeUrlFor: (u, c) => `https://club.test/notificaciones/baja?t=${u}-${c}`,
  });
  const base = {
    subject: 'Asunto',
    heading: 'Título <b>',
    paragraphs: ['Texto'],
    image: { url: '/uploads/announcements/x.webp', alt: 'Canchas bajo la lluvia' },
    cta: { label: 'Ver', path: '/torneos/1' },
    recipient: { userId: 'u', firstName: 'Ana', isGuardian: false },
  };

  it('promotional: "Cambiar mis notificaciones" and one-click "Dejar de recibir"; text version', () => {
    const { html, text } = render({ ...base, kind: 'PROMOTIONAL', category: 'PROMOTIONS' });
    expect(html).toContain('lang="es"');
    expect(html).toContain('alt="Canchas bajo la lluvia"');
    expect(html).toContain('Título &lt;b&gt;'); // escaped
    expect(html).toContain('Cambiar mis notificaciones');
    expect(html).toContain('Dejar de recibir estos correos');
    expect(text).toContain(
      'Dejar de recibir estos correos: https://club.test/notificaciones/baja?t=u-PROMOTIONS',
    );
    expect(text).toContain('[Imagen: Canchas bajo la lluvia]');
  });

  it('service: no unsubscribe link, but the settings link', () => {
    const { html } = render({ ...base, kind: 'SERVICE', category: 'MY_TOURNAMENTS' });
    expect(html).toContain('Cambiar mis notificaciones');
    expect(html).not.toContain('Dejar de recibir');
  });

  it("to a guardian it says it's about the minor", () => {
    const { text } = render({
      ...base,
      kind: 'SERVICE',
      category: 'MY_TOURNAMENTS',
      recipient: { userId: 'g', firstName: 'Marta', isGuardian: true },
      about: { firstName: 'Lucía' },
    });
    expect(text).toContain('Hola, Marta:');
    expect(text).toContain('acudiente de Lucía');
  });
});

describe('sending: limits and retries', () => {
  function repo(rows) {
    return {
      rows,
      countSentSince: async () => rows.filter((r) => r.status === 'SENT').length,
      listDue: async (_now, limit) => rows.filter((r) => r.status === 'QUEUED').slice(0, limit),
      markSent: async (id) => {
        rows.find((r) => r.id === id).status = 'SENT';
      },
      markAttemptFailed: async (id, { attempts, failed }) => {
        Object.assign(
          rows.find((r) => r.id === id),
          { attempts, status: failed ? 'FAILED' : 'QUEUED' },
        );
      },
      reschedule: async (ids, { reason }) => {
        for (const id of ids) {
          const r = rows.find((x) => x.id === id);
          r.status = 'WAITING';
          r.deferredReason = reason;
        }
      },
    };
  }
  const row = (id, kind = 'SERVICE') => ({
    id,
    kind,
    status: 'QUEUED',
    attempts: 0,
    toEmail: `${id}@x.co`,
    subject: 's',
    html: 'h',
    text: 't',
  });
  // Wednesday 7 Oct 2026, 10:00 a. m. in Colombia.
  const clock = { now: () => new Date('2026-10-07T15:00:00Z') };
  const limits = { dailyQuota: 3, monthlyQuota: 100, batchSize: 2, requestsPerSecond: 10 };

  it('sends in batches up to the daily quota; the rest waits for the next day', async () => {
    const r = repo([row('a'), row('b'), row('c'), row('d'), row('e')]);
    const transport = createMemoryEmailTransport();
    const send = createSendDueEmails({
      emailDeliveryRepository: r,
      emailTransport: transport,
      limits,
      clock,
      sleep: async () => {},
    });
    const result = await send();
    expect(transport.sent).toHaveLength(3);
    expect(result).toMatchObject({ sent: 3, deferred: 2 });
    expect(r.rows.filter((x) => x.deferredReason === 'QUOTA')).toHaveLength(2);
  });

  it('a provider failure is retried, and after 3 attempts the email is FAILED', async () => {
    const r = repo([row('a')]);
    const transport = createMemoryEmailTransport();
    transport.failNext(3);
    const send = createSendDueEmails({
      emailDeliveryRepository: r,
      emailTransport: transport,
      limits,
      clock,
      sleep: async () => {},
    });
    await send();
    expect(r.rows[0]).toMatchObject({ attempts: 1, status: 'QUEUED' });
    await send();
    await send();
    expect(r.rows[0]).toMatchObject({ attempts: 3, status: 'FAILED' });
    expect(transport.sent).toHaveLength(0);
  });

  it('a promotional email that became due on a Sunday waits for Monday', async () => {
    const r = repo([row('p', 'PROMOTIONAL')]);
    const sunday = { now: () => new Date('2026-10-04T15:00:00Z') };
    const send = createSendDueEmails({
      emailDeliveryRepository: r,
      emailTransport: createMemoryEmailTransport(),
      limits,
      clock: sunday,
      sleep: async () => {},
    });
    await send();
    expect(r.rows[0]).toMatchObject({ status: 'WAITING', deferredReason: 'HOURS' });
  });
});

describe('outbox processor', () => {
  it('retries a failing event up to 3 times and records the error', async () => {
    const event = { id: 'e1', eventType: 'X', attempts: 0 };
    const outboxRepository = {
      listPending: async () => (event.attempts < 3 && !event.processedAt ? [event] : []),
      markProcessed: async (_id, at) => {
        event.processedAt = at;
      },
      markFailed: async (_id, { attempts, error }) =>
        Object.assign(event, { attempts, lastError: error }),
    };
    const handler = vi.fn().mockRejectedValue(new Error('down'));
    const run = createProcessOutbox({
      outboxRepository,
      handlers: { X: handler },
      clock: { now: () => new Date() },
    });
    for (let i = 0; i < 5; i += 1) await run();
    expect(handler).toHaveBeenCalledTimes(3);
    expect(event).toMatchObject({ attempts: 3, lastError: 'down' });
    expect(event.processedAt).toBeUndefined();
  });
});

describe('public names on /torneos', () => {
  it('adults in full; minors as "Lucía R." unless the guardian authorized the full name', () => {
    expect(publicPlayerName({ firstName: 'Ana', lastName: 'Gómez' }, true)).toBe('Ana Gómez');
    expect(
      publicPlayerName({ firstName: 'Lucía Fernanda', lastName: 'rodríguez Paz' }, false),
    ).toBe('Lucía R.');
    expect(publicPlayerName({ firstName: null, lastName: null }, false)).toBe('Jugador del club');
  });
});

describe('basic format of announcements', () => {
  it('bold, lists and https links; raw HTML is escaped', () => {
    const src =
      '**Cierre** de canchas\n\n- Cancha 1\n- Cancha 2\n\n[Ver horario](https://club.test/x) <script>';
    expect(parseBasicFormat(src).map((b) => b.type)).toEqual(['paragraph', 'list', 'paragraph']);
    const html = renderBasicFormatHtml(src);
    expect(html).toContain('<strong>Cierre</strong>');
    expect(html).toContain('<ul><li>Cancha 1</li><li>Cancha 2</li></ul>');
    expect(html).toContain('<a href="https://club.test/x">Ver horario</a>');
    expect(html).toContain('&lt;script&gt;');
    expect(renderBasicFormatHtml('[x](javascript:alert(1))')).not.toContain('<a');
    expect(renderBasicFormatText(src)).toContain('Ver horario (https://club.test/x)');
  });
});

describe('Resend webhook signature', () => {
  it('accepts the right signature and rejects a wrong or old one', () => {
    const secret = `whsec_${Buffer.from('secret-key-bytes').toString('base64')}`;
    const body = '{"type":"email.opened"}';
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256', Buffer.from('secret-key-bytes'))
      .update(`id1.${ts}.${body}`)
      .digest('base64');
    expect(
      verifyResendSignature({ secret, id: 'id1', timestamp: ts, signature: `v1,${sig}`, body }),
    ).toBe(true);
    expect(
      verifyResendSignature({ secret, id: 'id1', timestamp: ts, signature: 'v1,xxxx', body }),
    ).toBe(false);
    expect(
      verifyResendSignature({
        secret,
        id: 'id1',
        timestamp: ts - 3600,
        signature: `v1,${sig}`,
        body,
      }),
    ).toBe(false);
  });
});
