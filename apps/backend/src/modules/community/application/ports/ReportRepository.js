export class ReportRepository {
  /** @returns {Promise<object>} the created row */
  async create(_report) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<object|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<object|null>} any PENDING report for this exact
   * (targetType, targetId, reporterId) triple. */
  async findPendingByTarget(_targetType, _targetId, _reporterId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<object[]>} newest first */
  async listByStatus(_status) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<object>} the updated row */
  async dismiss(_id, _staffUserId, _now) {
    throw new Error('Not implemented');
  }
}

// Dangling-report cleanup when a target is deleted happens inside
// prismaPostRepository.js's/prismaCommentRepository.js's own delete()
// transactions (a plain `prisma.communityReport.deleteMany(...)` alongside
// the content delete, in one `$transaction`) rather than through a method
// on this port -- composing atomicity across two separate repository
// objects would be harder than just reaching for the same prisma client
// both repositories already close over.
