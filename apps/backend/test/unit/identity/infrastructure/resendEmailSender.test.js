import { describe, expect, it } from 'vitest';

import { createResendEmailSender } from '../../../../src/modules/identity/infrastructure/email/resendEmailSender.js';

function createFakeResendClient(response = { data: { id: 'email-1' }, error: null }) {
  const calls = [];
  return {
    calls,
    emails: {
      async send(payload) {
        calls.push(payload);
        return response;
      },
    },
  };
}

describe('resendEmailSender', () => {
  it('sends the verification email from MAIL_FROM with the link in the body', async () => {
    const client = createFakeResendClient();
    const sender = createResendEmailSender({
      apiKey: 'k',
      from: 'CTCJ <no-reply@ctcj.co>',
      client,
    });

    await sender.sendVerificationEmail('ana@example.com', 'https://ctcj.co/verify-email?token=abc');

    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]).toMatchObject({
      from: 'CTCJ <no-reply@ctcj.co>',
      to: 'ana@example.com',
      subject: expect.stringContaining('Verifica tu correo'),
    });
    expect(client.calls[0].html).toContain('https://ctcj.co/verify-email?token=abc');
  });

  it('sends the password reset email with the reset link', async () => {
    const client = createFakeResendClient();
    const sender = createResendEmailSender({ apiKey: 'k', from: 'f', client });

    await sender.sendPasswordResetEmail(
      'ana@example.com',
      'https://ctcj.co/reset-password?token=x',
    );

    expect(client.calls[0].text).toContain('https://ctcj.co/reset-password?token=x');
  });

  it('throws when Resend returns an error instead of silently succeeding', async () => {
    const client = createFakeResendClient({
      data: null,
      error: { name: 'invalid_from_address', message: 'Invalid from', statusCode: 422 },
    });
    const sender = createResendEmailSender({ apiKey: 'k', from: 'f', client });

    await expect(sender.sendVerificationEmail('ana@example.com', 'u')).rejects.toThrow(
      /invalid_from_address/,
    );
  });
});
