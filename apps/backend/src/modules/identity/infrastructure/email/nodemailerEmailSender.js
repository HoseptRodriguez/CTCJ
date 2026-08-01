import nodemailer from 'nodemailer';

/**
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
      await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Verifica tu correo - Club de Tenis Ciudad Jardin',
        text: `Bienvenido a CTCJ. Verifica tu correo visitando: ${verificationUrl}`,
        html: `<p>Bienvenido a Club de Tenis Ciudad Jardin.</p><p><a href="${verificationUrl}">Verifica tu correo</a></p>`,
      });
    },
  };
}
