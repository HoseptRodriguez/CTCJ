import { PrismaClient } from '@prisma/client';
import { ROLE_DEFINITIONS } from '@ctcj/shared';

import { DEFAULT_CLUB_ID as CTCJ_CLUB_ID } from '../src/config/club.js';

const prisma = new PrismaClient();

/**
 * Permission catalog + role grants, ported verbatim from v7's
 * docs/roles/MATRIZ-DE-PERMISOS.md. Only identity/booking modules are built
 * in Phase 1, but the full matrix is seeded now since it's reference data
 * (not application logic) and every later module needs it to already exist.
 */
const PERMISSIONS = [
  { code: 'booking:reservation:create', resource: 'booking', action: 'reservation:create' },
  { code: 'booking:reservation:read_own', resource: 'booking', action: 'reservation:read_own' },
  {
    code: 'booking:reservation:read_all',
    resource: 'booking',
    action: 'reservation:read_all',
    isSensitive: true,
  },
  { code: 'booking:reservation:manage', resource: 'booking', action: 'reservation:manage' },
  { code: 'booking:court:manage', resource: 'booking', action: 'court:manage' },
  { code: 'billing:payment:read_own', resource: 'billing', action: 'payment:read_own' },
  {
    code: 'billing:payment:manage',
    resource: 'billing',
    action: 'payment:manage',
    isSensitive: true,
  },
  { code: 'billing:finance:read', resource: 'billing', action: 'finance:read', isSensitive: true },
  { code: 'coaching:session:manage', resource: 'coaching', action: 'session:manage' },
  { code: 'coaching:evaluation:manage', resource: 'coaching', action: 'evaluation:manage' },
  { code: 'competition:result:submit', resource: 'competition', action: 'result:submit' },
  { code: 'competition:tournament:manage', resource: 'competition', action: 'tournament:manage' },
  {
    code: 'competition:ranking:configure',
    resource: 'competition',
    action: 'ranking:configure',
    isSensitive: true,
  },
  { code: 'clinical:appointment:manage', resource: 'clinical', action: 'appointment:manage' },
  { code: 'clinical:record:read', resource: 'clinical', action: 'record:read', isSensitive: true },
  {
    code: 'clinical:record:write',
    resource: 'clinical',
    action: 'record:write',
    isSensitive: true,
  },
  { code: 'identity:role:assign', resource: 'identity', action: 'role:assign', isSensitive: true },
  { code: 'platform:audit:read', resource: 'platform', action: 'audit:read', isSensitive: true },
  { code: 'platform:settings:manage', resource: 'platform', action: 'settings:manage' },
];

/** roleCode -> array of permission codes granted to that role. */
const ROLE_PERMISSION_GRANTS = {
  USUARIO: [],
  JUGADOR: [
    'booking:reservation:create',
    'booking:reservation:read_own',
    'billing:payment:read_own',
  ],
  PADRE_TUTOR: [
    'booking:reservation:create',
    'booking:reservation:read_own',
    'billing:payment:read_own',
  ],
  ENTRENADOR: [
    'booking:reservation:create',
    'booking:reservation:read_own',
    'coaching:session:manage',
    'coaching:evaluation:manage',
    'competition:result:submit',
  ],
  RECEPCION: [
    'booking:reservation:read_all',
    'booking:reservation:manage',
    'booking:court:manage',
    'billing:payment:manage',
    'competition:result:submit',
  ],
  PSICOLOGO: ['clinical:appointment:manage', 'clinical:record:read', 'clinical:record:write'],
  NEUROPSICOLOGO: ['clinical:appointment:manage', 'clinical:record:read', 'clinical:record:write'],
  FISIOTERAPEUTA: ['clinical:appointment:manage', 'clinical:record:read', 'clinical:record:write'],
  // Deliberately excludes clinical:record:read/write -- Administrador
  // manages the clinical module's existence (scheduling, role grants) but
  // never its content, enforced for real in Phase 14's clinical module
  // requireRole gates (this Permission/RolePermission catalog itself is
  // decorative, never read by real authorization code -- see the module's
  // own README/compositionRoot for the actual enforcement).
  ADMINISTRADOR: [
    'booking:reservation:read_all',
    'booking:reservation:manage',
    'booking:court:manage',
    'billing:payment:manage',
    'billing:finance:read',
    'coaching:session:manage',
    'coaching:evaluation:manage',
    'competition:tournament:manage',
    'competition:ranking:configure',
    'clinical:appointment:manage',
    'identity:role:assign',
    'platform:audit:read',
    'platform:settings:manage',
  ],
};

async function main() {
  const club = await prisma.club.upsert({
    where: { id: CTCJ_CLUB_ID },
    update: {},
    create: {
      id: CTCJ_CLUB_ID,
      slug: 'ctcj',
      legalName: 'Club de Tenis Ciudad Jardin',
      displayName: 'Club de Tenis Ciudad Jardin',
    },
  });

  for (const roleDef of ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        selfAssignable: roleDef.selfAssignable,
        requiresMfa: roleDef.requiresMfa,
      },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        selfAssignable: roleDef.selfAssignable,
        requiresMfa: roleDef.requiresMfa,
      },
    });
  }

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        resource: perm.resource,
        action: perm.action,
        isSensitive: perm.isSensitive ?? false,
      },
      create: {
        code: perm.code,
        resource: perm.resource,
        action: perm.action,
        isSensitive: perm.isSensitive ?? false,
      },
    });
  }

  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSION_GRANTS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    for (const permissionCode of permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const courts = [
    { name: 'Cancha 1', surface: 'CLAY', hasLighting: true, displayOrder: 1 },
    { name: 'Cancha 2', surface: 'CLAY', hasLighting: true, displayOrder: 2 },
    { name: 'Cancha 3', surface: 'CLAY', hasLighting: false, displayOrder: 3 },
  ];
  for (const court of courts) {
    await prisma.court.upsert({
      where: { clubId_name: { clubId: club.id, name: court.name } },
      update: {},
      create: {
        clubId: club.id,
        name: court.name,
        surface: court.surface,
        hasLighting: court.hasLighting,
        displayOrder: court.displayOrder,
        // defaultPriceCop intentionally left null: real pricing is pending
        // Admin Settings input from the club, not a value to invent here.
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete: 1 club, 9 roles, %d permissions, 3 courts.', PERMISSIONS.length);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
