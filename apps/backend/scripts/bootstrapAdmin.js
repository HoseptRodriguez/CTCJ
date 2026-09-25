/**
 * Bootstrap: grants ADMINISTRADOR to an already-registered, verified user.
 *
 * Solves a real chicken-and-egg gap in the RBAC design: granting a role
 * requires an existing ADMINISTRADOR (POST /api/admin/roles/grant is itself
 * gated by requireRole(ADMINISTRADOR)), so the very first admin can never be
 * created through the normal API. This script is the one place that gap is
 * closed.
 *
 * NOT a backdoor: it doesn't touch auth, doesn't accept or set a password,
 * and grants nothing to an account that doesn't already exist and hasn't
 * verified its email through the normal /register + /verify flow. It only
 * adds a UserRole row -- the same effect POST /api/admin/roles/grant has.
 *
 * Usage:
 *   development: node scripts/bootstrapAdmin.js <email>
 *   production:  BOOTSTRAP_TOKEN=<secret> node scripts/bootstrapAdmin.js <email> --confirm --token <secret>
 *
 * In production the token must match BOOTSTRAP_TOKEN (>= 24 chars, compared
 * in constant time). Unset BOOTSTRAP_TOKEN again once the first admin
 * exists; later admins are granted from the API by an existing admin.
 */
import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { ROLE_CODES } from '@ctcj/shared';

import { config } from '../src/config/env.js';

import {
  authorizeBootstrap,
  checkBootstrapTarget,
  parseBootstrapArgs,
} from './bootstrapAdminPolicy.js';

const args = parseBootstrapArgs(process.argv.slice(2));
const authorization = authorizeBootstrap({
  isProduction: config.isProduction,
  bootstrapToken: config.bootstrapToken,
  args,
});
if (!authorization.ok) {
  // eslint-disable-next-line no-console
  console.error(authorization.reason);
  process.exit(1);
}

const { email } = args;
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email } });
  const refusal = checkBootstrapTarget(user, email);
  if (refusal) {
    throw new Error(refusal);
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
    data: {
      id: randomUUID(),
      userId: user.id,
      roleId: adminRole.id,
      reason: `bootstrapAdmin.js (${config.nodeEnv})`,
    },
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
