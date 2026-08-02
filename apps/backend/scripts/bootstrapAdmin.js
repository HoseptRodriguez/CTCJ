/**
 * Dev-only bootstrap: grants ADMINISTRADOR to an already-registered user.
 *
 * Solves a real chicken-and-egg gap in Phase 1's RBAC design: granting a
 * role requires an existing ADMINISTRADOR (POST /api/admin/roles/grant is
 * itself gated by requireRole(ADMINISTRADOR)), so the very first admin can
 * never be created through the normal API. This script is the one place
 * that gap is closed -- and only in development.
 *
 * NOT a backdoor: it doesn't touch auth, doesn't accept or set a password,
 * and grants nothing to an account that doesn't already exist. The target
 * user must have already registered and verified their email through the
 * normal /register + /verify flow; this script only adds a UserRole row,
 * the exact same effect POST /api/admin/roles/grant has -- just usable once,
 * by a developer with DB access, before any admin exists yet.
 *
 * Usage: node scripts/bootstrapAdmin.js <email>
 */
import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { ROLE_CODES } from '@ctcj/shared';

import { config } from '../src/config/env.js';

if (config.isProduction) {
  // eslint-disable-next-line no-console
  console.error(
    'bootstrapAdmin.js refuses to run with NODE_ENV=production. This is a dev-only tool.',
  );
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  // eslint-disable-next-line no-console
  console.error('Usage: node scripts/bootstrapAdmin.js <email>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    throw new Error(
      `No user found with email "${email}". Register through /register (and verify the email) first, then run this script.`,
    );
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: ROLE_CODES.ADMINISTRADOR },
  });

  const alreadyAdmin = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: adminRole.id, revokedAt: null },
  });
  if (alreadyAdmin) {
    // eslint-disable-next-line no-console
    console.log(`${email} is already ADMINISTRADOR. Nothing to do.`);
    return;
  }

  await prisma.userRole.create({
    data: { id: randomUUID(), userId: user.id, roleId: adminRole.id },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Granted ADMINISTRADOR to ${email}. Log in normally -- the role is on the next access/refresh token.`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('bootstrapAdmin failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
