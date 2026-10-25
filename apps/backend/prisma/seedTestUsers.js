/**
 * Crea (o actualiza) una cuenta de prueba por rol, ya verificada y activa,
 * con la contraseña y el secreto TOTP de prisma/testUsers.js.
 *
 *   node prisma/seedTestUsers.js
 *
 * Idempotente. Se niega a correr en producción.
 */
import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { PRIVACY_POLICY, TERMS } from '@ctcj/shared';

import { config } from '../src/config/env.js';
import { createArgon2PasswordHasher } from '../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { createAesMfaCrypto } from '../src/modules/identity/infrastructure/security/aesMfaCrypto.js';

import { TEST_PASSWORD, TEST_TOTP_SECRET, TEST_USERS } from './testUsers.js';

if (config.isProduction) {
  // eslint-disable-next-line no-console
  console.error('seedTestUsers.js no se ejecuta en producción.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const club = await prisma.club.findFirstOrThrow();
  const passwordHash = await createArgon2PasswordHasher().hash(TEST_PASSWORD);
  const mfaCrypto = createAesMfaCrypto({ key: config.mfa.key });
  const now = new Date();

  for (const def of TEST_USERS) {
    const mfaFields = def.mfa
      ? {
          mfaEnabled: true,
          mfaSecret: mfaCrypto.encryptSecret(TEST_TOTP_SECRET),
          mfaEnabledAt: now,
        }
      : { mfaEnabled: false, mfaSecret: null, mfaEnabledAt: null };
    const fields = {
      passwordHash,
      firstName: def.firstName,
      lastName: def.lastName,
      status: 'ACTIVE',
      emailVerifiedAt: now,
      isDemo: true,
      deletedAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      mfaFailedCount: null,
      mfaLockedUntil: null,
      mfaLastStep: null,
      membershipStatus: def.membershipStatus ?? null,
      membershipStatusUpdatedAt: def.membershipStatus ? now : null,
      ...mfaFields,
    };

    const existing = await prisma.user.findUnique({
      where: { clubId_email: { clubId: club.id, email: def.email } },
    });
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: fields })
      : await prisma.user.create({
          data: {
            id: randomUUID(),
            clubId: club.id,
            email: def.email,
            birthDate: new Date('1990-01-15'),
            ...fields,
          },
        });

    if (!existing) {
      for (const [consentType, documentVersion] of [
        ['PRIVACY_POLICY', PRIVACY_POLICY.version],
        ['TERMS', TERMS.version],
      ]) {
        await prisma.consent.create({
          data: { userId: user.id, consentType, documentVersion, action: 'ACCEPTED' },
        });
      }
    }

    for (const code of def.roles) {
      const role = await prisma.role.findUniqueOrThrow({ where: { code } });
      const active = await prisma.userRole.findFirst({
        where: { userId: user.id, roleId: role.id, revokedAt: null },
      });
      if (!active) {
        await prisma.userRole.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            roleId: role.id,
            reason: 'seedTestUsers.js (cuenta de prueba)',
          },
        });
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `${existing ? 'actualizado' : 'creado    '} ${def.email} [${def.roles.join(', ')}]`,
    );
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
