import { CONSENT_ACTION, CONSENT_TYPE, PRIVACY_POLICY, TERMS } from '@ctcj/shared';

import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * What a signed-in account still needs before using the site: a birth date
 * (to know if the person is a minor) and acceptance of the privacy policy
 * and terms in force. Accounts created before these existed are asked at
 * their next sign-in; a new version of either document is asked again.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   consentRepository: import('../ports/ConsentRepository.js').ConsentRepository,
 * }} deps
 */
export function createAccountRequirementsUseCases({ userRepository, consentRepository }) {
  async function accepted(userId, consentType, version) {
    const latest = await consentRepository.findLatest(userId, consentType);
    return latest?.action === CONSENT_ACTION.ACCEPTED && latest.documentVersion === version;
  }

  async function requirementsOf(user) {
    return {
      birthDateMissing: !user.birthDate,
      privacyPending: !(await accepted(
        user.id,
        CONSENT_TYPE.PRIVACY_POLICY,
        PRIVACY_POLICY.version,
      )),
      termsPending: !(await accepted(user.id, CONSENT_TYPE.TERMS, TERMS.version)),
      privacyVersion: PRIVACY_POLICY.version,
      termsVersion: TERMS.version,
    };
  }

  async function load(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UserNotFound();
    return user;
  }

  return {
    /** @param {{ userId: string }} input */
    async getAccountRequirements({ userId }) {
      return requirementsOf(await load(userId));
    },

    /**
     * Fills what's missing. The birth date is only set when there is none
     * (afterwards it's changed from "Mi perfil"); each acceptance is proof.
     * @param {{ userId: string, birthDate?: string, acceptPrivacy?: true, acceptTerms?: true,
     *   ipAddress?: string|null, userAgent?: string|null }} input
     */
    async completeAccount({
      userId,
      birthDate,
      acceptPrivacy,
      acceptTerms,
      ipAddress = null,
      userAgent = null,
    }) {
      const user = await load(userId);
      const before = await requirementsOf(user);
      if (before.birthDateMissing && birthDate) {
        user.updateProfile({ birthDate: new Date(`${birthDate}T00:00:00Z`) });
        await userRepository.update(user);
      }
      const origin = { ipAddress, userAgent };
      if (before.privacyPending && acceptPrivacy === true) {
        await consentRepository.append({
          userId,
          consentType: CONSENT_TYPE.PRIVACY_POLICY,
          documentVersion: PRIVACY_POLICY.version,
          action: CONSENT_ACTION.ACCEPTED,
          ...origin,
        });
      }
      if (before.termsPending && acceptTerms === true) {
        await consentRepository.append({
          userId,
          consentType: CONSENT_TYPE.TERMS,
          documentVersion: TERMS.version,
          action: CONSENT_ACTION.ACCEPTED,
          ...origin,
        });
      }
      return requirementsOf(await load(userId));
    },
  };
}
