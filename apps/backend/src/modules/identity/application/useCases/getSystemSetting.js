/**
 * Generic read -- has no idea what any key means. Callers (via their own
 * single-purpose adapter) own the interpretation.
 * @param {{ systemSettingRepository: import('../ports/SystemSettingRepository.js').SystemSettingRepository, clubId: string }} deps
 */
export function createGetSystemSetting({ systemSettingRepository, clubId }) {
  /**
   * @param {{ key: string }} input
   */
  return async function getSystemSetting({ key }) {
    return systemSettingRepository.findByKey(clubId, key);
  };
}
