/**
 * Demo data must never be shown in production. Accounts created for
 * demonstrations carry isDemo; this counts them so the server can refuse
 * to start in production while any exist (delete or anonymize them first).
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createCountDemoAccounts({ userRepository }) {
  return async function countDemoAccounts() {
    return userRepository.countDemo();
  };
}
