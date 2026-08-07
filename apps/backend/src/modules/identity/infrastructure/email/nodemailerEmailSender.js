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

    async sendPasswordResetEmail(toEmail, resetUrl) {
      await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Restablece tu clave - Club de Tenis Ciudad Jardin',
        text: `Restablece tu clave visitando: ${resetUrl}. Si no solicitaste esto, ignora este correo -- el enlace expira en 1 hora.`,
        html: `<p>Restablece tu clave en Club de Tenis Ciudad Jardin.</p><p><a href="${resetUrl}">Restablecer clave</a></p><p>Si no solicitaste esto, ignora este correo. El enlace expira en 1 hora.</p>`,
      });
    },
  };
}
