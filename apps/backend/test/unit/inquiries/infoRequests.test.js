import { describe, expect, it } from 'vitest';

import { createInfoRequestUseCases } from '../../../src/modules/inquiries/application/useCases/infoRequests.js';
import { FormTokenInvalid } from '../../../src/modules/inquiries/application/errors/FormTokenInvalid.js';
import { createHmacFormTokens } from '../../../src/modules/inquiries/infrastructure/security/hmacFormTokens.js';
import {
  clubNoticeEmail,
  confirmationEmail,
  escapeHtml,
} from '../../../src/modules/inquiries/infrastructure/email/inquiryEmails.js';

function setup() {
  let now = new Date('2026-10-05T15:00:00Z');
  const clock = { now: () => now, advance: (ms) => (now = new Date(now.getTime() + ms)) };
  const saved = [];
  const sent = [];
  const formTokens = createHmacFormTokens({ secret: 'x'.repeat(32) });
  const uc = createInfoRequestUseCases({
    infoRequestRepository: {
      create: async (request, { consents }) => saved.push({ request, consents }),
      deleteOlderThan: async (clubId, cutoff, statuses) => {
        saved.cutoff = cutoff;
        saved.statuses = statuses;
        return 2;
      },
    },
    formTokens,
    mailer: {
      sendConfirmation: async (r) => sent.push(['person', r.email]),
      notifyClub: async (r) => sent.push(['club', r.fullName]),
    },
    clock,
    clubId: 'club-1',
    privacyVersion: '3',
    marketingVersion: '1',
  });
  return { uc, saved, sent, clock, formTokens };
}

const FORM = {
  fullName: 'Ana Gómez',
  phone: '310 555 1234',
  email: 'Ana@Example.com',
  program: 'ESCUELA_INFANTIL',
  forWhom: 'CHILD',
  childAge: 9,
  preferredTimes: ['TARDE', 'TARDE', 'FIN_DE_SEMANA'],
  message: 'Hola',
  acceptPrivacy: true,
  marketing: true,
};

describe('Solicitar información', () => {
  it('stores the request with only the child age, the normalized phone and the proof of the authorizations', async () => {
    const t = setup();
    const { formToken } = t.uc.issueFormToken();
    t.clock.advance(5000);
    expect(await t.uc.submitInfoRequest({ ...FORM, formToken })).toEqual({ received: true });
    const { request, consents } = t.saved[0];
    expect(request).toMatchObject({
      fullName: 'Ana Gómez',
      phone: '+573105551234',
      email: 'ana@example.com',
      forWhom: 'CHILD',
      childAge: 9,
      preferredTimes: ['TARDE', 'FIN_DE_SEMANA'],
      marketingOptIn: true,
    });
    expect(Object.keys(request).some((k) => /child(Name|First|Last)/i.test(k))).toBe(false);
    expect(consents).toEqual([
      { consentType: 'INFO_REQUEST_PRIVACY', documentVersion: '3' },
      { consentType: 'MARKETING', documentVersion: '1' },
    ]);
    expect(t.sent).toEqual([
      ['person', 'ana@example.com'],
      ['club', 'Ana Gómez'],
    ]);
  });

  it('for themself, no child age is kept even if sent', async () => {
    const t = setup();
    const { formToken } = t.uc.issueFormToken();
    t.clock.advance(5000);
    await t.uc.submitInfoRequest({
      ...FORM,
      forWhom: 'SELF',
      email: '',
      marketing: false,
      formToken,
    });
    expect(t.saved[0].request).toMatchObject({
      childAge: null,
      email: null,
      marketingOptIn: false,
    });
    expect(t.saved[0].consents).toHaveLength(1);
    expect(t.sent).toEqual([['club', 'Ana Gómez']]);
  });

  it('anti-spam: too fast, forged or stale tokens are refused; the trap field stores nothing', async () => {
    const t = setup();
    const { formToken } = t.uc.issueFormToken();
    await expect(t.uc.submitInfoRequest({ ...FORM, formToken })).rejects.toBeInstanceOf(
      FormTokenInvalid,
    );
    t.clock.advance(5000);
    const forged = formToken.replace(/^\d+/, String(Date.parse('2026-10-05T14:00:00Z')));
    await expect(t.uc.submitInfoRequest({ ...FORM, formToken: forged })).rejects.toBeInstanceOf(
      FormTokenInvalid,
    );
    expect(await t.uc.submitInfoRequest({ ...FORM, formToken, website: 'http://spam' })).toEqual({
      received: true,
    });
    expect(t.saved).toHaveLength(0);
    t.clock.advance(3 * 60 * 60 * 1000);
    await expect(t.uc.submitInfoRequest({ ...FORM, formToken })).rejects.toBeInstanceOf(
      FormTokenInvalid,
    );
  });

  it('a failed email never loses the request', async () => {
    const t = setup();
    const uc = createInfoRequestUseCases({
      infoRequestRepository: { create: async (r) => t.saved.push(r) },
      formTokens: t.formTokens,
      mailer: {
        sendConfirmation: async () => {
          throw new Error('smtp down');
        },
        notifyClub: async () => {
          throw new Error('smtp down');
        },
      },
      clock: t.clock,
      clubId: 'club-1',
      privacyVersion: '3',
      marketingVersion: '1',
    });
    const { formToken } = uc.issueFormToken();
    t.clock.advance(4000);
    await expect(uc.submitInfoRequest({ ...FORM, formToken })).resolves.toEqual({ received: true });
    expect(t.saved).toHaveLength(1);
  });

  it('automatic deletion: only with a period set by the club; discarded and unanswered ones', async () => {
    const t = setup();
    expect(await t.uc.purgeOldInfoRequests({ months: null })).toEqual({ deleted: 0 });
    expect(await t.uc.purgeOldInfoRequests({ months: 6 })).toEqual({ deleted: 2 });
    expect(t.saved.cutoff.toISOString()).toBe('2026-04-05T15:00:00.000Z');
    expect(t.saved.statuses).toEqual(['DESCARTADA', 'NUEVA']);
  });

  it('emails escape what the person typed', () => {
    const r = {
      fullName: '<script>x</script>',
      phone: '+573105551234',
      email: null,
      program: 'ADULTOS',
      forWhom: 'CHILD',
      childAge: 8,
      preferredTimes: ['NOCHE'],
      message: '<b>hola</b>',
      marketingOptIn: false,
    };
    expect(escapeHtml('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;');
    expect(confirmationEmail(r).html).not.toContain('<script>');
    const notice = clubNoticeEmail(r, 'http://club.test');
    expect(notice.html).toContain('&lt;b&gt;hola&lt;/b&gt;');
    expect(notice.text).toContain('Para su hijo o hija (8 años)');
    expect(notice.text).toContain('http://club.test/staff/solicitudes-informacion');
  });
});
