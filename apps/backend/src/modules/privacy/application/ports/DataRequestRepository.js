/**
 * Requests of the data subject. Rows are never deleted: answering updates
 * the status and the answer; the request outlives the account.
 *
 * A request: { id, clubId, radicado, userId, requestType, kind, description,
 *   status, receivedAt: Date, dueOn: "YYYY-MM-DD", answer, answeredAt,
 *   answeredBy, accountAnonymizedAt }
 */
export class DataRequestRepository {
  /** @returns {Promise<string>} a new radicado, e.g. "CTCJ-2026-00001" */
  async nextRadicado(_year) {
    throw new Error('Not implemented');
  }

  async create(_request) {
    throw new Error('Not implemented');
  }

  async findById(_id) {
    throw new Error('Not implemented');
  }

  async listByUser(_userId) {
    throw new Error('Not implemented');
  }

  /** @param {{ clubId: string, openOnly?: boolean }} _params oldest due first */
  async list(_params) {
    throw new Error('Not implemented');
  }

  async update(_request) {
    throw new Error('Not implemented');
  }
}
