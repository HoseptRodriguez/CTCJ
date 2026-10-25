/** The MARKETING consent (identity module): promotional switches per category and channel. */
export class MarketingGateway {
  /** { userId } -> { isMinor, givenByGuardian, matrix } */
  async getMarketingPreferences(_input) {
    throw new Error('Not implemented');
  }

  /** { userId, matrix, ipAddress?, userAgent? } -> same shape */
  async setMarketingPreferences(_input) {
    throw new Error('Not implemented');
  }

  /** { userId, category? }: removes email from that promotional category. */
  async stopMarketingEmails(_input) {
    throw new Error('Not implemented');
  }
}
