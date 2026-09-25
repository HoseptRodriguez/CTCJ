/**
 * Message content shared by every EmailSender adapter (nodemailer for
 * dev/test, Resend for production), so switching transport never changes
 * what a user receives.
 */
export function verificationEmail(verificationUrl) {
  return {
    subject: 'Verifica tu correo - Club de Tenis Ciudad Jardin',
    text: `Bienvenido a CTCJ. Verifica tu correo visitando: ${verificationUrl}`,
    html: `<p>Bienvenido a Club de Tenis Ciudad Jardin.</p><p><a href="${verificationUrl}">Verifica tu correo</a></p>`,
  };
}

export function passwordResetEmail(resetUrl) {
  return {
    subject: 'Restablece tu clave - Club de Tenis Ciudad Jardin',
    text: `Restablece tu clave visitando: ${resetUrl}. Si no solicitaste esto, ignora este correo -- el enlace expira en 1 hora.`,
    html: `<p>Restablece tu clave en Club de Tenis Ciudad Jardin.</p><p><a href="${resetUrl}">Restablecer clave</a></p><p>Si no solicitaste esto, ignora este correo. El enlace expira en 1 hora.</p>`,
  };
}
