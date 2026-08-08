import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';
import { resetNotifications } from '../notifications/testDb.js';

import { prisma, resetChallenges, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedPlayer({ roleCode = ROLE_CODES.JUGADOR } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `jugador-${randomUUID()}@example.com`;
  const passwordHash = await passwordHasher.hash(PASSWORD);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  const usuarioRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLE_CODES.USUARIO } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: usuarioRole.id } });
  if (roleCode !== ROLE_CODES.USUARIO) {
    const extraRole = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: extraRole.id } });
  }

  return { id: user.id, email, password: PASSWORD };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken;
}

describe('Challenges HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetChallenges();
    await resetNotifications();
    await resetUsers();
  });
  afterEach(async () => {
    await resetChallenges();
    await resetNotifications();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('full flow: A challenges B, B is notified, B accepts, A is notified, both lists reflect it', async () => {
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);

    const createRes = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerB.id, message: 'Sábado?' })
      .expect(201);
    expect(createRes.body).toMatchObject({
      challengerUserId: playerA.id,
      opponentUserId: playerB.id,
      status: 'PENDING',
    });

    const notifB = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(notifB.body.unreadCount).toBe(1);
    expect(notifB.body.notifications[0].type).toBe('CHALLENGE_RECEIVED');

    const acceptRes = await request(app)
      .post(`/api/challenges/me/${createRes.body.id}/accept`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(acceptRes.body.status).toBe('ACCEPTED');

    const notifA = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(notifA.body.notifications.some((n) => n.type === 'CHALLENGE_ACCEPTED')).toBe(true);

    const listA = await request(app)
      .get('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(listA.body.challenges[0]).toMatchObject({ role: 'CHALLENGER', status: 'ACCEPTED' });

    const listB = await request(app)
      .get('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(listB.body.challenges[0]).toMatchObject({ role: 'OPPONENT', status: 'ACCEPTED' });
  });

  it('rejects a duplicate pending challenge with a clean 409', async () => {
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);

    await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerB.id })
      .expect(201);

    const res = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerB.id })
      .expect(409);
    expect(res.body.code).toBe('challenge_already_pending');
  });

  it('rejects challenging a non-JUGADOR with a clean 409', async () => {
    const playerA = await seedPlayer();
    const staff = await seedPlayer({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const tokenA = await login(app, playerA.email, playerA.password);

    const res = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: staff.id })
      .expect(409);
    expect(res.body.code).toBe('player_not_eligible');
  });

  it('rejects a self-challenge with a clean 409', async () => {
    const playerA = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);

    const res = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerA.id })
      .expect(409);
    expect(res.body.code).toBe('self_challenge_forbidden');
  });

  it('the challenger can cancel a PENDING challenge, notifying the opponent', async () => {
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);

    const createRes = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerB.id })
      .expect(201);

    const cancelRes = await request(app)
      .post(`/api/challenges/me/${createRes.body.id}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(cancelRes.body.status).toBe('CANCELLED');

    const notifB = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(notifB.body.notifications.some((n) => n.type === 'CHALLENGE_CANCELLED')).toBe(true);
  });

  it('the opponent can reject a PENDING challenge', async () => {
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);

    const createRes = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerB.id })
      .expect(201);

    const rejectRes = await request(app)
      .post(`/api/challenges/me/${createRes.body.id}/reject`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(rejectRes.body.status).toBe('REJECTED');
  });

  it('the challenger cannot accept their own challenge (opponent-only)', async () => {
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);

    const createRes = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerB.id })
      .expect(201);

    const res = await request(app)
      .post(`/api/challenges/me/${createRes.body.id}/accept`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
    expect(res.body.code).toBe('challenge_not_found');
  });

  it('unauthenticated requests get 401', async () => {
    await request(app)
      .post('/api/challenges/me')
      .send({ opponentUserId: randomUUID() })
      .expect(401);
    await request(app).get('/api/challenges/me').expect(401);
    await request(app).post(`/api/challenges/me/${randomUUID()}/accept`).expect(401);
  });
});
