/**
 * Clinical's own narrow window into identity's role concept, checking for
 * PSICOLOGO or NEUROPSICOLOGO -- the first port in this codebase checking a
 * role set other than JUGADOR.
 */
export class PractitionerEligibilityProvider {
  /** @returns {Promise<boolean>} true iff userId holds PSICOLOGO or NEUROPSICOLOGO */
  async isEligiblePractitioner(_userId) {
    throw new Error('Not implemented');
  }
}
