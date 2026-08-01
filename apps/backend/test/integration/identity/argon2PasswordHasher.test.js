import { describe, expect, it } from 'vitest';

import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';

describe('argon2PasswordHasher (real argon2)', () => {
  const hasher = createArgon2PasswordHasher();

  it('produces a PHC-format argon2id hash', async () => {
    const hash = await hasher.hash('ClaveSegura123');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
  });

  it('verify() accepts the correct password', async () => {
    const hash = await hasher.hash('ClaveSegura123');
    expect(await hasher.verify('ClaveSegura123', hash)).toBe(true);
  });

  it('verify() rejects an incorrect password', async () => {
    const hash = await hasher.hash('ClaveSegura123');
    expect(await hasher.verify('OtraClave', hash)).toBe(false);
  });

  it('verify() returns false (not throw) for a null hash', async () => {
    await expect(hasher.verify('ClaveSegura123', null)).resolves.toBe(false);
  });

  it('two hashes of the same password differ (random salt per hash)', async () => {
    const [a, b] = await Promise.all([
      hasher.hash('ClaveSegura123'),
      hasher.hash('ClaveSegura123'),
    ]);
    expect(a).not.toBe(b);
  });
});
