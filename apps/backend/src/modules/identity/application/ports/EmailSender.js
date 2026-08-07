export class EmailSender {
  async sendVerificationEmail(_toEmail, _verificationUrl) {
    throw new Error('Not implemented');
  }

  async sendPasswordResetEmail(_toEmail, _resetUrl) {
    throw new Error('Not implemented');
  }
}
