import nodemailer from 'nodemailer';
import { Resend } from 'resend';

import { clubNoticeEmail, confirmationEmail } from './inquiryEmails.js';

/**
 * Same transports as the rest of the site: Resend in production, SMTP
 * (Mailhog) in development. Without INFO_REQUEST_TO, no notice to the club.
 *
 * @param {{ resend: { apiKey: string, from: string }, smtp: { host: string, port: number,
 *   user: string, password: string, from: string }, notifyTo: string, appPublicUrl: string,
 *   transport?: { send: (message: object) => Promise<void> } }} options
 * @returns {import('../../application/ports/InquiryMailer.js').InquiryMailer}
 */
export function createInquiryMailer({ resend, smtp, notifyTo, appPublicUrl, transport }) {
  const send = transport?.send ?? buildTransport({ resend, smtp });

  return {
    async sendConfirmation(request) {
      await send({ to: request.email, ...confirmationEmail(request) });
    },

    async notifyClub(request) {
      if (!notifyTo) return;
      await send({ to: notifyTo, ...clubNoticeEmail(request, appPublicUrl) });
    },
  };
}

function buildTransport({ resend, smtp }) {
  if (resend.apiKey) {
    const client = new Resend(resend.apiKey);
    return async (message) => {
      const { error } = await client.emails.send({ from: resend.from, ...message });
      if (error) throw new Error(`Resend failed to send email (${error.name}): ${error.message}`);
    };
  }
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: false,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  });
  return async (message) => {
    await transporter.sendMail({ from: smtp.from, ...message });
  };
}
