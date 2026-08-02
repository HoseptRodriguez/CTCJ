/**
 * Generic port over the club-scoped key/value SystemSetting table. This port
 * itself has zero knowledge of what any key means -- callers own that. Never
 * expose this port directly to another module's application layer; give
 * each policy its own single-purpose port instead (see booking's
 * BookingPolicySettings for why).
 */
export class SystemSettingRepository {
  /** @returns {Promise<{value: any, updatedAt: Date, updatedBy: string|null}|null>} */
  async findByKey(_clubId, _key) {
    throw new Error('Not implemented');
  }

  /** Upsert. @returns {Promise<void>} */
  async set(_clubId, _key, _value, _updatedByUserId) {
    throw new Error('Not implemented');
  }
}
