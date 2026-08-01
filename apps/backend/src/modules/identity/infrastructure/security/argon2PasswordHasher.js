import argon2 from 'argon2';

/**
 * Parameters ported verbatim from v7 (iterations=3, memory=64MB,
 * parallelism=1, hash length=32) -- see docs/adr/0004-argon2id-vs-bcrypt.md.
 * @returns {import('../../application/ports/PasswordHasher.js').PasswordHasher}
 */
export function createArgon2PasswordHasher() {
  return {
    async hash(plainPassword) {
      return argon2.hash(plainPassword, {
        type: argon2.argon2id,
        timeCost: 3,
        memoryCost: 65536, // 64 MB, in KiB
        parallelism: 1,
        hashLength: 32,
      });
    },

    async verify(plainPassword, hash) {
      if (!hash) {
        return false;
      }
      try {
        return await argon2.verify(hash, plainPassword);
      } catch {
        return false;
      }
    },
  };
}
