import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { stepAt, totpForStep } from '../../../src/modules/identity/domain/services/totp.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';
let hash;

async function seed(roles) {
  const email = `mfa-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash: hash,
      firstName: 'Persona',
      lastName: 'Prueba',
      birthDate: new Date('1985-01-01'),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  for (const code of new Set([ROLE_CODES.USUARIO, ...roles])) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return { id: user.id, email };
}

const codeFor = (manualKey, offset = 0) =>
  totpForStep(manualKey.replace(/ /g, ''), stepAt(new Date()) + offset);
const audit = (userId) =>
  prisma.$queryRaw`SELECT action FROM audit_logs WHERE entity_id = ${userId}::uuid ORDER BY occurred_at, id`;

describe('Two-step verification HTTP API (real Postgres, enforcement on)', () => {
  let app;
  let lenientApp;

  beforeAll(async () => {
    app = createApp({ mfaEnforceStaff: true });
    lenientApp = createApp({ mfaEnforceStaff: false });
    hash = await createArgon2PasswordHasher().hash(PASSWORD);
  });
  beforeEach(async () => {
    await prisma.$executeRaw`DELETE FROM audit_logs WHERE action LIKE 'mfa.%'`;
    await resetUsers();
  });
  afterEach(async () => {
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const signIn = (target, email) =>
    request(target).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);

  /** An admin with two-step verification on; returns the key, a session and the codes. */
  async function enrolledAdmin() {
    const admin = await seed([ROLE_CODES.ADMINISTRADOR]);
    const first = await signIn(app, admin.email);
    const start = await request(app)
      .post('/api/auth/mfa/setup/start')
      .send({ mfaToken: first.body.mfaToken })
      .expect(200);
    const done = await request(app)
      .post('/api/auth/mfa/setup/confirm')
      .send({ mfaToken: first.body.mfaToken, code: codeFor(start.body.manualKey) })
      .expect(200);
    return {
      admin,
      key: start.body.manualKey,
      token: done.body.accessToken,
      codes: done.body.recoveryCodes,
    };
  }

  it('a mandatory role gets no session with the password alone; it sets MFA up first', async () => {
    const admin = await seed([ROLE_CODES.ADMINISTRADOR]);
    const first = await signIn(app, admin.email);
    expect(first.body).toEqual({
      mfaRequired: false,
      mfaSetupRequired: true,
      mfaToken: expect.any(String),
    });
    expect(first.headers['set-cookie']).toBeUndefined();
    // The step token is not an access token.
    await request(app)
      .get('/api/identity/me')
      .set('Authorization', `Bearer ${first.body.mfaToken}`)
      .expect(401);

    const start = await request(app)
      .post('/api/auth/mfa/setup/start')
      .send({ mfaToken: first.body.mfaToken })
      .expect(200);
    expect(start.body.qrSvg).toMatch(/^<svg/);
    await request(app)
      .post('/api/auth/mfa/setup/confirm')
      .send({ mfaToken: first.body.mfaToken, code: '000000' })
      .expect(401);
    const done = await request(app)
      .post('/api/auth/mfa/setup/confirm')
      .send({ mfaToken: first.body.mfaToken, code: codeFor(start.body.manualKey) })
      .expect(200);
    expect(done.body.accessToken).toEqual(expect.any(String));
    expect(done.body.recoveryCodes).toHaveLength(10);
    expect(done.headers['set-cookie'][0]).toMatch(/HttpOnly/);

    // Stored encrypted and hashed, never in the clear.
    const row = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(row.mfaEnabled).toBe(true);
    expect(row.mfaSecret).toMatch(/^v1\./);
    expect(row.mfaSecret).not.toContain(start.body.manualKey.replace(/ /g, ''));
    const stored = await prisma.mfaRecoveryCode.findMany({ where: { userId: admin.id } });
    expect(stored).toHaveLength(10);
    for (const c of stored) expect(done.body.recoveryCodes).not.toContain(c.codeHash);
    expect((await audit(admin.id)).map((r) => r.action)).toEqual(['mfa.enable']);
  });

  it('next sign-ins: the code (or a recovery code, once) opens the session', async () => {
    const { admin, codes } = await enrolledAdmin();
    const first = await signIn(app, admin.email);
    expect(first.body).toMatchObject({ mfaRequired: true });
    const ok = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ mfaToken: first.body.mfaToken, recoveryCode: codes[0] })
      .expect(200);
    expect(ok.body).toMatchObject({ usedRecoveryCode: true, recoveryCodesLeft: 9 });

    const again = await signIn(app, admin.email);
    await request(app)
      .post('/api/auth/mfa/verify')
      .send({ mfaToken: again.body.mfaToken, recoveryCode: codes[0] })
      .expect(401);
    expect((await audit(admin.id)).map((r) => r.action)).toContain('mfa.recovery_code.use');
  });

  it('5 wrong codes lock it (429) and the lock is audited', async () => {
    const { admin } = await enrolledAdmin();
    const first = await signIn(app, admin.email);
    for (let i = 0; i < 4; i += 1) {
      await request(app)
        .post('/api/auth/mfa/verify')
        .send({ mfaToken: first.body.mfaToken, code: '000000' })
        .expect(401);
    }
    const locked = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ mfaToken: first.body.mfaToken, code: '000000' })
      .expect(429);
    expect(locked.body.code).toBe('mfa_locked');
    expect((await audit(admin.id)).map((r) => r.action)).toContain('mfa.lockout');
  });

  it('an old session of a mandatory role without MFA stops working at refresh', async () => {
    const psych = await seed([ROLE_CODES.PSICOLOGO]);
    const old = await signIn(lenientApp, psych.email);
    const cookie = old.headers['set-cookie'][0].split(';')[0];
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
    expect(res.body.code).toBe('mfa_setup_required');
  });

  it('optional roles sign in as always and can turn it on from the profile', async () => {
    const player = await seed([ROLE_CODES.JUGADOR]);
    const session = await signIn(app, player.email);
    expect(session.body.accessToken).toEqual(expect.any(String));
    const auth = (r) => r.set('Authorization', `Bearer ${session.body.accessToken}`);
    const status = await auth(request(app).get('/api/identity/me/mfa')).expect(200);
    expect(status.body).toMatchObject({ enabled: false, required: false });
    const start = await auth(request(app).post('/api/identity/me/mfa/setup/start')).expect(200);
    await auth(
      request(app)
        .post('/api/identity/me/mfa/setup/confirm')
        .send({ code: codeFor(start.body.manualKey) }),
    ).expect(200);
    expect((await signIn(app, player.email)).body).toMatchObject({ mfaRequired: true });
  });

  it('Administración resets someone else (not itself); audited; the person sets it up again', async () => {
    const { admin, token } = await enrolledAdmin();
    const fisio = await seed([ROLE_CODES.FISIOTERAPEUTA]);
    const first = await signIn(app, fisio.email);
    const start = await request(app)
      .post('/api/auth/mfa/setup/start')
      .send({ mfaToken: first.body.mfaToken });
    await request(app)
      .post('/api/auth/mfa/setup/confirm')
      .send({ mfaToken: first.body.mfaToken, code: codeFor(start.body.manualKey) })
      .expect(200);

    const bearer = (r) => r.set('Authorization', `Bearer ${token}`);
    await bearer(request(app).post(`/api/admin/directory/${admin.id}/mfa-reset`)).expect(409);
    await bearer(request(app).post(`/api/admin/directory/${fisio.id}/mfa-reset`)).expect(200);
    expect((await audit(fisio.id)).map((r) => r.action)).toEqual(['mfa.enable', 'mfa.reset']);
    expect(await prisma.mfaRecoveryCode.count({ where: { userId: fisio.id } })).toBe(0);
    expect((await signIn(app, fisio.email)).body).toMatchObject({ mfaSetupRequired: true });
  });
});
