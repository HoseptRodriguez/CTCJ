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
});
