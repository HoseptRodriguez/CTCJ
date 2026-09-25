import nodemailer from 'nodemailer';

import { passwordResetEmail, verificationEmail } from './emailTemplates.js';

/**
 * Dev/test adapter -- points at Mailhog by default (docker-compose.yml).
 * Production uses resendEmailSender.js instead (see compositionRoot.js).
 *
 * @param {{ host: string, port: number, user: string, password: string, from: string }} options
 * @returns {import('../../application/ports/EmailSender.js').EmailSender}
 */
export function createNodemailerEmailSender({ host, port, user, password, from }) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: user ? { user, pass: password } : undefined,
  });

  return {
    async sendVerificationEmail(toEmail, verificationUrl) {
      await transporter.sendMail({ from, to: toEmail, ...verificationEmail(verificationUrl) });
    },

    async sendPasswordResetEmail(toEmail, resetUrl) {
      await transporter.sendMail({ from, to: toEmail, ...passwordResetEmail(resetUrl) });
    },
  };
}
