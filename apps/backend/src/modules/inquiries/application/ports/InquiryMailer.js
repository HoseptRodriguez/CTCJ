/** Emails of a request: to the person (if they left an email) and to the club. */
export class InquiryMailer {
  async sendConfirmation(_request) {
    throw new Error('Not implemented');
  }

  async notifyClub(_request) {
    throw new Error('Not implemented');
  }
}
