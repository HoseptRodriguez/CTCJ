/** Sends emails (Resend in production, Mailhog in development, memory in tests). */
export class EmailTransport {
  /** [{ to, subject, html, text, headers? }] -> [{ id }] in the same order; throws on failure */
  async sendBatch(_messages) {
    throw new Error('Not implemented');
  }
}
