/**
 * Generic write -- has no idea what any key means. Callers (via their own
 * single-purpose adapter) own the interpretation.
 * @param {{ systemSettingRepository: import('../ports/SystemSettingRepository.js').SystemSettingRepository, clubId: string }} deps
 */
export function createSetSystemSetting({ systemSettingRepository, clubId }) {
  /**
   * @param {{ key: string, value: any, updatedByUserId: string }} input
   */
  return async function setSystemSetting({ key, value, updatedByUserId }) {
    await systemSettingRepository.set(clubId, key, value, updatedByUserId);
  };
}
