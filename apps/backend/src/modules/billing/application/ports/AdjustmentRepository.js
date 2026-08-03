/**
 * @typedef {{ id: string, membershipId: string, adjustmentType: string, value: string, reason: string, validFrom: Date, validTo: Date|null, authorizedBy: string, createdAt: Date }} AdjustmentRow
 */

export class AdjustmentRepository {
  /** @returns {Promise<AdjustmentRow>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<AdjustmentRow[]>} newest first */
  async listByMembership(_membershipId) {
    throw new Error('Not implemented');
  }
}
