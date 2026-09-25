import { Resend } from 'resend';

import { passwordResetEmail, verificationEmail } from './emailTemplates.js';

/**
 * Production adapter (Resend's HTTP API -- no SMTP ports to open, which also
 * suits serverless hosts).
 *
 * The Resend SDK reports failures as a returned `{ error }` rather than a
 * thrown exception; this adapter rethrows them so a failed send surfaces
 * exactly like a nodemailer failure (a 500 from register, retryable -- see
 * registerUser.js) instead of silently looking like success.
 *
 * @param {{ apiKey: string, from: string, client?: { emails: { send: Function } } }} options
 *   `client` is injectable for unit tests; defaults to a real Resend client.
 * @returns {import('../../application/ports/EmailSender.js').EmailSender}
 */
export function createResendEmailSender({ apiKey, from, client = new Resend(apiKey) }) {
  async function send(toEmail, content) {
    const { error } = await client.emails.send({ from, to: toEmail, ...content });
    if (error) {
      throw new Error(`Resend failed to send email (${error.name}): ${error.message}`);
    }
  }

  return {
    async sendVerificationEmail(toEmail, verificationUrl) {
      await send(toEmail, verificationEmail(verificationUrl));
    },

    async sendPasswordResetEmail(toEmail, resetUrl) {
      await send(toEmail, passwordResetEmail(resetUrl));
    },
  };
}
