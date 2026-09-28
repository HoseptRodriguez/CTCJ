import { HealthAuthorizationRequired } from '../errors/HealthAuthorizationRequired.js';

/**
 * Every use case that records health data (appointments, notes, history,
 * recovery plans, fitness status) checks the authorization first. What is
 * already recorded can still be read: it's kept as the law requires.
 *
 * @param {import('../ports/HealthAuthorizationProvider.js').HealthAuthorizationProvider} provider
 * @param {string} playerId
 */
export async function assertHealthAuthorization(provider, playerId) {
  if (!(await provider.hasHealthAuthorization(playerId))) {
    throw new HealthAuthorizationRequired();
  }
}
