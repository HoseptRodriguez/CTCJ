/**
 * Clinical's own narrow window into identity's role concept, checking for
 * PSICOLOGO, NEUROPSICOLOGO, or FISIOTERAPEUTA -- the first port in this
 * codebase checking a role set other than JUGADOR. Reports which
 * discipline (PSYCHOLOGY|PHYSIOTHERAPY) the practitioner belongs to,
 * resolved server-side, never client-supplied -- every use case that tags
 * content with a discipline or gates a Physiotherapy-only action derives
 * it from this, not from anything the caller sent.
 */
export class PractitionerEligibilityProvider {
  /** @returns {Promise<{ eligible: boolean, discipline: 'PSYCHOLOGY'|'PHYSIOTHERAPY'|null }>} */
  async getPractitionerEligibility(_userId) {
    throw new Error('Not implemented');
  }
}
