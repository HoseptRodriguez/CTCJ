/** Requests of information and their internal notes. */
export class InfoRequestRepository {
  /** Saves the request and the proof of its authorizations, together. */
  async create(_request, _options) {
    throw new Error('Not implemented');
  }

  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @param {{ clubId: string, status?: string, program?: string }} _filters newest first, with notes */
  async list(_filters) {
    throw new Error('Not implemented');
  }

  async countByStatus(_clubId, _status) {
    throw new Error('Not implemented');
  }

  async update(_id, _changes) {
    throw new Error('Not implemented');
  }

  async addNote(_id, _note) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<number>} how many were deleted */
  async deleteOlderThan(_clubId, _cutoff, _statuses) {
    throw new Error('Not implemented');
  }
}
