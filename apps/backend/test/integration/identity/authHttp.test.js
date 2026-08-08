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

  it("GET /api/identity/me returns the caller's own profile, 401 unauthenticated", async () => {
    const email = `perfil-${randomUUID()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'ClaveSegura123', firstName: 'Ana', lastName: 'Gomez' })
      .expect(201);
    const verificationUrl = await fetchVerificationLinkFor(email);
    const token = new URL(verificationUrl).searchParams.get('token');
    await request(app).get('/api/auth/verify').query({ token }).expect(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'ClaveSegura123' })
      .expect(200);

    const res = await request(app)
      .get('/api/identity/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);
    expect(res.body).toMatchObject({ firstName: 'Ana', lastName: 'Gomez', email });

    await request(app).get('/api/identity/me').expect(401);
  });

  it('GET /api/admin/users/counts: counts JUGADORs by membership status, ADMINISTRADOR/RECEPCION only', async () => {
    const admin = await seedVerifiedAdmin();
    const adminToken = (await request(app).post('/api/auth/login').send(admin).expect(200)).body
      .accessToken;

    const playerEmail = `conteo-${randomUUID()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email: playerEmail, password: 'ClaveSegura123', firstName: 'Ana', lastName: 'Gomez' })
      .expect(201);
    const verificationUrl = await fetchVerificationLinkFor(playerEmail);
    const token = new URL(verificationUrl).searchParams.get('token');
    await request(app).get('/api/auth/verify').query({ token }).expect(200);
    const player = await prisma.user.findUniqueOrThrow({
      where: { clubId_email: { clubId: TEST_CLUB_ID, email: playerEmail } },
    });
    const jugadorRole = await prisma.role.findUniqueOrThrow({
      where: { code: ROLE_CODES.JUGADOR },
    });
    await prisma.userRole.create({ data: { userId: player.id, roleId: jugadorRole.id } });
    await prisma.user.update({ where: { id: player.id }, data: { membershipStatus: 'ACTIVE' } });

    const res = await request(app)
      .get('/api/admin/users/counts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.ACTIVE).toBeGreaterThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);

    const playerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: playerEmail, password: 'ClaveSegura123' })
      .expect(200);
    await request(app)
      .get('/api/admin/users/counts')
      .set('Authorization', `Bearer ${playerLogin.body.accessToken}`)
      .expect(403);
    await request(app).get('/api/admin/users/counts').expect(401);
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

  describe('profile edit / avatar upload (Phase 2)', () => {
    async function loginNewPlayer() {
      const email = `perfil2-${randomUUID()}@example.com`;
      await registerAndVerify(app, { email, password: 'ClaveSegura123' });
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'ClaveSegura123' })
        .expect(200);
      return loginRes.body.accessToken;
    }

    it('PATCH /api/identity/me updates phone/birthDate/bio and GET reflects it', async () => {
      const token = await loginNewPlayer();

      const patchRes = await request(app)
        .patch('/api/identity/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '3001234567', birthDate: '2000-01-15', bio: 'Me encanta el tenis.' })
        .expect(200);
      expect(patchRes.body).toMatchObject({ phone: '3001234567', bio: 'Me encanta el tenis.' });

      const getRes = await request(app)
        .get('/api/identity/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(getRes.body).toMatchObject({ phone: '3001234567', bio: 'Me encanta el tenis.' });

      await request(app).patch('/api/identity/me').send({ bio: 'x' }).expect(401);
    });

    it('POST /api/identity/me/avatar stores the image and serves it back', async () => {
      const token = await loginNewPlayer();

      const uploadRes = await request(app)
        .post('/api/identity/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from([0xff, 0xd8, 0xff]), {
          filename: 'foto.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      expect(uploadRes.body.avatarUrl).toMatch(/^\/uploads\/avatars\/.+\.jpg$/);

      await request(app).get(uploadRes.body.avatarUrl).expect(200);

      const getRes = await request(app)
        .get('/api/identity/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(getRes.body.avatarUrl).toBe(uploadRes.body.avatarUrl);
    });

    it('rejects a non-image file with 400', async () => {
      const token = await loginNewPlayer();

      const res = await request(app)
        .post('/api/identity/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from('not an image'), {
          filename: 'archivo.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
      expect(res.body.code).toBe('invalid_avatar_file');
    });

    it('rejects a file over the size limit with 400', async () => {
      const token = await loginNewPlayer();

      const res = await request(app)
        .post('/api/identity/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.alloc(3 * 1024 * 1024, 1), {
          filename: 'grande.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
      expect(res.body.code).toBe('invalid_avatar_file');
    });

    it('unauthenticated avatar upload gets 401', async () => {
      await request(app)
        .post('/api/identity/me/avatar')
        .attach('avatar', Buffer.from([0xff, 0xd8, 0xff]), {
          filename: 'foto.jpg',
          contentType: 'image/jpeg',
        })
        .expect(401);
    });
  });

  describe('GET /api/identity/me/achievements (Phase 2)', () => {
    async function loginNewPlayer() {
      const email = `logros-${randomUUID()}@example.com`;
      await registerAndVerify(app, { email, password: 'ClaveSegura123' });
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'ClaveSegura123' })
        .expect(200);
      return loginRes.body.accessToken;
    }

    // Cross-module (competition/coaching/booking) wiring is proven end to
    // end here via the real, patched-in identityContainer.getMyAchievements
    // (see app.js) -- the badge logic itself (which combination of data
    // earns which badge) is already exhaustively covered by
    // getMyAchievements.test.js's fakes, so this only needs to confirm the
    // real route returns the full catalog shape and is authenticated.
    it('returns the full badge catalog, all not-earned for a fresh player', async () => {
      const token = await loginNewPlayer();

      const res = await request(app)
        .get('/api/identity/me/achievements')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.badges).toHaveLength(5);
      expect(res.body.badges.every((b) => b.earned === false)).toBe(true);
      expect(res.body.badges.map((b) => b.code)).toEqual([
        'FIRST_WIN',
        'TEN_WINS',
        'TOP_10_RANKING',
        'OUTSTANDING_RATING',
        'FULL_WEEK',
      ]);
    });

    it('unauthenticated requests get 401', async () => {
      await request(app).get('/api/identity/me/achievements').expect(401);
    });
  });

  describe('GET /api/players/search (Phase 3a)', () => {
    async function seedPlayer({ firstName, lastName }) {
      const passwordHasher = createArgon2PasswordHasher();
      const email = `jugador-${randomUUID()}@example.com`;
      const passwordHash = await passwordHasher.hash('ClaveSegura123');
      const user = await prisma.user.create({
        data: {
          id: randomUUID(),
          clubId: TEST_CLUB_ID,
          email,
          passwordHash,
          firstName,
          lastName,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });
      const usuarioRole = await prisma.role.findUniqueOrThrow({
        where: { code: ROLE_CODES.USUARIO },
      });
      const jugadorRole = await prisma.role.findUniqueOrThrow({
        where: { code: ROLE_CODES.JUGADOR },
      });
      await prisma.userRole.create({ data: { userId: user.id, roleId: usuarioRole.id } });
      await prisma.userRole.create({ data: { userId: user.id, roleId: jugadorRole.id } });
      return { id: user.id, email, password: 'ClaveSegura123' };
    }

    it('matches JUGADOR players by name, never exposes email, excludes non-players', async () => {
      const caller = await seedPlayer({ firstName: 'Caller', lastName: 'Player' });
      await seedPlayer({ firstName: 'Anabel', lastName: 'Gomez' });
      // A same-name-prefix non-JUGADOR account, created directly (not via
      // registerAndVerify, which hardcodes 'Ana Gomez' and would collide
      // with the seeded player above) to prove the role filter, not just
      // the name filter, is doing the excluding.
      const passwordHasher = createArgon2PasswordHasher();
      const nonPlayer = await prisma.user.create({
        data: {
          id: randomUUID(),
          clubId: TEST_CLUB_ID,
          email: `anais-${randomUUID()}@example.com`,
          passwordHash: await passwordHasher.hash('ClaveSegura123'),
          firstName: 'Anais',
          lastName: 'NoJugador',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });
      const usuarioRole = await prisma.role.findUniqueOrThrow({
        where: { code: ROLE_CODES.USUARIO },
      });
      await prisma.userRole.create({ data: { userId: nonPlayer.id, roleId: usuarioRole.id } });
      const token = (
        await request(app)
          .post('/api/auth/login')
          .send({ email: caller.email, password: caller.password })
          .expect(200)
      ).body.accessToken;

      const res = await request(app)
        .get('/api/players/search')
        .query({ q: 'ana' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.players).toHaveLength(1);
      expect(res.body.players[0]).toMatchObject({ firstName: 'Anabel', lastName: 'Gomez' });
      expect(res.body.players[0]).not.toHaveProperty('email');
    });

    it('unauthenticated requests get 401', async () => {
      await request(app).get('/api/players/search').query({ q: 'ana' }).expect(401);
    });
  });
});
