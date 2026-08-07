import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

const MAILHOG_API = 'http://localhost:8025/api';
const ADMIN_PASSWORD = 'ClaveAdminSegura1';

async function clearMailhog() {
  await fetch(`${MAILHOG_API}/v1/messages`, { method: 'DELETE' });
}

/** The SMTP body arrives quoted-printable encoded (soft line breaks + =XX escapes). */
function decodeQuotedPrintable(input) {
  return input
    .replace(/=\r\n/g, '')
    .replace(/=\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function fetchVerificationLinkFor(toEmail, { retries = 20, delayMs = 250 } = {}) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const res = await fetch(`${MAILHOG_API}/v2/messages`);
    const data = await res.json();
    const message = (data.items ?? []).find((m) =>
      (m.To ?? []).some(
        (to) => `${to.Mailbox}@${to.Domain}`.toLowerCase() === toEmail.toLowerCase(),
      ),
    );
    if (message) {
      const body = decodeQuotedPrintable(message.Content.Body);
      const match = body.match(/href="([^"]*verify-email\?token=[^"]*)"/);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`No verification email found for ${toEmail}`);
}

async function fetchPasswordResetLinkFor(toEmail, { retries = 20, delayMs = 250 } = {}) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const res = await fetch(`${MAILHOG_API}/v2/messages`);
    const data = await res.json();
    const message = (data.items ?? []).find((m) =>
      (m.To ?? []).some(
        (to) => `${to.Mailbox}@${to.Domain}`.toLowerCase() === toEmail.toLowerCase(),
      ),
    );
    if (message) {
      const body = decodeQuotedPrintable(message.Content.Body);
      const match = body.match(/href="([^"]*reset-password\?token=[^"]*)"/);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`No password reset email found for ${toEmail}`);
}

async function registerAndVerify(app, { email, password }) {
  await request(app)
    .post('/api/auth/register')
    .send({ email, password, firstName: 'Ana', lastName: 'Gomez' })
    .expect(201);
  const verificationUrl = await fetchVerificationLinkFor(email);
  const token = new URL(verificationUrl).searchParams.get('token');
  await request(app).get('/api/auth/verify').query({ token }).expect(200);
}

async function seedVerifiedAdmin() {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `admin-${randomUUID()}@example.com`;
  const passwordHash = await passwordHasher.hash(ADMIN_PASSWORD);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Prueba',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  const usuarioRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLE_CODES.USUARIO } });
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: ROLE_CODES.ADMINISTRADOR },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: usuarioRole.id } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });

  return { email, password: ADMIN_PASSWORD };
}

describe('Identity HTTP API (real Postgres + Mailhog)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetUsers();
    await clearMailhog();
  });
  afterEach(resetUsers);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('full flow: register -> verify -> login -> refresh -> logout', async () => {
    const email = `jugador-${randomUUID()}@example.com`;
    const password = 'ClaveSegura123';

    await request(app)
      .post('/api/auth/register')
      .send({ email, password, firstName: 'Ana', lastName: 'Gomez' })
      .expect(201);

    const verificationUrl = await fetchVerificationLinkFor(email);
    const token = new URL(verificationUrl).searchParams.get('token');

    await request(app).get('/api/auth/verify').query({ token }).expect(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body.accessToken).toBeTruthy();
    expect(loginRes.body.roles).toEqual([ROLE_CODES.USUARIO]);
    const setCookie = loginRes.headers['set-cookie'];
    expect(setCookie).toBeTruthy();
    const refreshCookie = setCookie.find((c) => c.startsWith('ctcj_refresh='));
    expect(refreshCookie).toBeTruthy();
    expect(refreshCookie).toMatch(/HttpOnly/);
    expect(refreshCookie).toMatch(/SameSite=Strict/i);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(refreshRes.body.accessToken).toBeTruthy();
    const rotatedCookie = refreshRes.headers['set-cookie'].find((c) =>
      c.startsWith('ctcj_refresh='),
    );

    // The rotated-out original cookie must now be rejected (reuse detection).
    await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie).expect(401);

    // The legitimately rotated cookie must also now be rejected: reuse of
    // the original revoked the whole family.
    await request(app).post('/api/auth/refresh').set('Cookie', rotatedCookie).expect(401);

    // Re-login for a clean cookie to exercise logout.
    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    const secondCookie = secondLogin.headers['set-cookie'].find((c) =>
      c.startsWith('ctcj_refresh='),
    );

    await request(app).post('/api/auth/logout').set('Cookie', secondCookie).expect(204);
    await request(app).post('/api/auth/refresh').set('Cookie', secondCookie).expect(401);
  });

  it('rejects registration with a password shorter than the minimum (validation)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'corta@example.com', password: 'short', firstName: 'A', lastName: 'B' })
      .expect(400);
  });

  it('rejects duplicate registration with 409', async () => {
    const email = `dup-${randomUUID()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'ClaveSegura123', firstName: 'Ana', lastName: 'Gomez' })
      .expect(201);

    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'OtraClaveSegura1', firstName: 'Otra', lastName: 'Persona' })
      .expect(409);
  });

  it('rejects login with wrong credentials with a generic 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@example.com', password: 'ClaveSegura123' })
      .expect(401);
    expect(res.body.code).toBe('invalid_credentials');
  });

  it('RBAC: a non-admin cannot grant roles (403), an admin can (204)', async () => {
    // Player self-registers and verifies.
    const playerEmail = `jugador-rbac-${randomUUID()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email: playerEmail, password: 'ClaveSegura123', firstName: 'Ana', lastName: 'Gomez' })
      .expect(201);
    const verificationUrl = await fetchVerificationLinkFor(playerEmail);
    const token = new URL(verificationUrl).searchParams.get('token');
    await request(app).get('/api/auth/verify').query({ token }).expect(200);

    const playerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: playerEmail, password: 'ClaveSegura123' })
      .expect(200);
    const playerToken = playerLogin.body.accessToken;
    const playerId = (
      await prisma.user.findUniqueOrThrow({
        where: { clubId_email: { clubId: TEST_CLUB_ID, email: playerEmail } },
      })
    ).id;

    // Barrier #1: a non-admin (even with a valid token) is rejected by the route guard.
    await request(app)
      .post('/api/admin/roles/grant')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ userId: playerId, roleCode: ROLE_CODES.ADMINISTRADOR })
      .expect(403);

    // No token at all: 401, not 403 (authentication vs. authorization).
    await request(app)
      .post('/api/admin/roles/grant')
      .send({ userId: playerId, roleCode: ROLE_CODES.ENTRENADOR })
      .expect(401);

    // An admin succeeds.
    const admin = await seedVerifiedAdmin();
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    expect(adminLogin.body.roles).toEqual(
      expect.arrayContaining([ROLE_CODES.USUARIO, ROLE_CODES.ADMINISTRADOR]),
    );

    await request(app)
      .post('/api/admin/roles/grant')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({ userId: playerId, roleCode: ROLE_CODES.ENTRENADOR })
      .expect(204);

    const updatedPlayer =
      await prisma.$queryRaw`SELECT role_code FROM user_roles_view WHERE user_id = ${playerId}::uuid`;
    expect(updatedPlayer.map((r) => r.role_code)).toContain(ROLE_CODES.ENTRENADOR);
  });

  describe('password reset', () => {
    it('full flow: request -> email received -> confirm -> old password rejected, new password works', async () => {
      const email = `reset-${randomUUID()}@example.com`;
      const oldPassword = 'ClaveVieja123';
      const newPassword = 'ClaveNueva456';
      await registerAndVerify(app, { email, password: oldPassword });

      await request(app).post('/api/auth/password-reset/request').send({ email }).expect(200);

      const resetUrl = await fetchPasswordResetLinkFor(email);
      const token = new URL(resetUrl).searchParams.get('token');

      await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token, newPassword })
        .expect(200);

      await request(app).post('/api/auth/login').send({ email, password: oldPassword }).expect(401);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: newPassword })
        .expect(200);
      expect(loginRes.body.accessToken).toBeTruthy();
    });

    it('resetting the password revokes every existing refresh token', async () => {
      const email = `reset-revoke-${randomUUID()}@example.com`;
      const oldPassword = 'ClaveVieja123';
      await registerAndVerify(app, { email, password: oldPassword });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: oldPassword })
        .expect(200);
      const preResetCookie = loginRes.headers['set-cookie'].find((c) =>
        c.startsWith('ctcj_refresh='),
      );

      await request(app).post('/api/auth/password-reset/request').send({ email }).expect(200);
      const resetUrl = await fetchPasswordResetLinkFor(email);
      const token = new URL(resetUrl).searchParams.get('token');
      await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token, newPassword: 'ClaveNueva456' })
        .expect(200);

      await request(app).post('/api/auth/refresh').set('Cookie', preResetCookie).expect(401);
    });

    it('does not reveal whether an email exists: unknown email still returns 200 and sends no email', async () => {
      const unknownEmail = `no-existe-${randomUUID()}@example.com`;

      const res = await request(app)
        .post('/api/auth/password-reset/request')
        .send({ email: unknownEmail })
        .expect(200);
      expect(res.body).toEqual({ requested: true });

      // Give any (incorrectly) queued email a moment to arrive, then confirm none did.
      await new Promise((resolve) => setTimeout(resolve, 300));
      const mailhogRes = await fetch(`${MAILHOG_API}/v2/messages`);
      const data = await mailhogRes.json();
      const found = (data.items ?? []).some((m) =>
        (m.To ?? []).some(
          (to) => `${to.Mailbox}@${to.Domain}`.toLowerCase() === unknownEmail.toLowerCase(),
        ),
      );
      expect(found).toBe(false);
    });

    it('rejects a token that has already been consumed with a clean 400', async () => {
      const email = `reset-reuse-${randomUUID()}@example.com`;
      await registerAndVerify(app, { email, password: 'ClaveVieja123' });

      await request(app).post('/api/auth/password-reset/request').send({ email }).expect(200);
      const resetUrl = await fetchPasswordResetLinkFor(email);
      const token = new URL(resetUrl).searchParams.get('token');

      await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token, newPassword: 'ClaveNueva456' })
        .expect(200);

      const secondAttempt = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token, newPassword: 'OtraClave789' })
        .expect(400);
      expect(secondAttempt.body.code).toBe('invalid_password_reset_token');
    });

    it('rejects an expired token with a clean 400', async () => {
      const email = `reset-expired-${randomUUID()}@example.com`;
      await registerAndVerify(app, { email, password: 'ClaveVieja123' });

      await request(app).post('/api/auth/password-reset/request').send({ email }).expect(200);
      const resetUrl = await fetchPasswordResetLinkFor(email);
      const token = new URL(resetUrl).searchParams.get('token');

      // Directly backdate the token's expiry -- the app itself has no way
      // to fast-forward a full hour, matching how other integration tests
      // reach into Prisma directly to set up an otherwise-untestable edge case.
      const user = await prisma.user.findUniqueOrThrow({
        where: { clubId_email: { clubId: TEST_CLUB_ID, email } },
      });
      await prisma.passwordReset.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token, newPassword: 'ClaveNueva456' })
        .expect(400);
      expect(res.body.code).toBe('invalid_password_reset_token');
    });

    it('rejects an unknown/garbage token with a clean 400, not a 500', async () => {
      const res = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token: 'not-a-real-token', newPassword: 'ClaveNueva456' })
        .expect(400);
      expect(res.body.code).toBe('invalid_password_reset_token');
    });

    it('rejects a new password that fails the letter+digit policy with 400', async () => {
      const email = `reset-weak-${randomUUID()}@example.com`;
      await registerAndVerify(app, { email, password: 'ClaveVieja123' });

      await request(app).post('/api/auth/password-reset/request').send({ email }).expect(200);
      const resetUrl = await fetchPasswordResetLinkFor(email);
      const token = new URL(resetUrl).searchParams.get('token');

      await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token, newPassword: 'soloLetras' })
        .expect(400);
      await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token, newPassword: '1234567890' })
        .expect(400);
    });
  });
});
