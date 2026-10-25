/** Protects the two-step verification secrets (the key never leaves infrastructure). */
export class MfaCrypto {
  /** @returns {string} ciphertext to store */
  encryptSecret(_plainBase32) {
    throw new Error('Not implemented');
  }

  /** @returns {string} the base32 secret */
  decryptSecret(_stored) {
    throw new Error('Not implemented');
  }

  /** Keyed hash of a recovery code (only the hash is stored). */
  hashRecoveryCode(_normalizedCode) {
    throw new Error('Not implemented');
  }
}
