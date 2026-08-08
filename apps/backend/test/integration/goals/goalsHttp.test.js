import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';
import { resetCoaching } from '../coaching/testDb.js';

import { prisma, resetGoals, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser({ roleCode = ROLE_CODES.JUGADOR } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `${roleCode.toLowerCase()}-${randomUUID()}@example.com`;
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

describe('Goals HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetGoals();
    await resetCoaching();
    await resetUsers();
  });
  afterEach(async () => {
    await resetGoals();
    await resetCoaching();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a CUSTOM goal and lists it back', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);

    const createRes = await request(app)
      .post('/api/goals/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Reach Category 2', metricType: 'CUSTOM' })
      .expect(201);
    expect(createRes.body).toMatchObject({
      title: 'Reach Category 2',
      metricType: 'CUSTOM',
      status: 'ACTIVE',
    });

    const listRes = await request(app)
      .get('/api/goals/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.goals).toHaveLength(1);
    expect(listRes.body.goals[0]).toMatchObject({
      title: 'Reach Category 2',
      currentProgress: null,
      percentComplete: null,
    });
  });

  it('rejects an invalid target shape with 400', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);

    const res = await request(app)
      .post('/api/goals/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Saque', metricType: 'SKILL_RATING' })
      .expect(400);
    expect(res.body.code).toBe('invalid_goal_target');
  });

  it('auto-achieves a SKILL_RATING goal once a matching coaching rating is recorded', async () => {
    const player = await seedVerifiedUser();
    const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
    const playerToken = await login(app, player.email, player.password);
    const coachToken = await login(app, coach.email, coach.password);

    await request(app)
      .post('/api/goals/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ title: 'Saque a 8', metricType: 'SKILL_RATING', targetArea: 'SERVE', targetValue: 8 })
      .expect(201);

    // Not yet met.
    let listRes = await request(app)
      .get('/api/goals/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);
    expect(listRes.body.goals[0]).toMatchObject({ status: 'ACTIVE', currentProgress: 0 });

    await request(app)
      .post(`/api/admin/coaching/players/${player.id}/performance`)
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ ratings: { SERVE: 8 } })
      .expect(201);

    listRes = await request(app)
      .get('/api/goals/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);
    expect(listRes.body.goals[0]).toMatchObject({
      status: 'ACHIEVED',
      currentProgress: 8,
      percentComplete: 100,
    });
  });

  it('abandons an owned ACTIVE goal', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);
    const createRes = await request(app)
      .post('/api/goals/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x', metricType: 'CUSTOM' })
      .expect(201);

    const res = await request(app)
      .post(`/api/goals/me/${createRes.body.id}/abandon`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.status).toBe('ABANDONED');
  });

  it("rejects abandoning another player's goal with 404", async () => {
    const owner = await seedVerifiedUser();
    const stranger = await seedVerifiedUser();
    const ownerToken = await login(app, owner.email, owner.password);
    const strangerToken = await login(app, stranger.email, stranger.password);
    const createRes = await request(app)
      .post('/api/goals/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'x', metricType: 'CUSTOM' })
      .expect(201);

    const res = await request(app)
      .post(`/api/goals/me/${createRes.body.id}/abandon`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);
    expect(res.body.code).toBe('goal_not_found');
  });

  it('rejects abandoning an already-terminal goal with 409', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);
    const createRes = await request(app)
      .post('/api/goals/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x', metricType: 'CUSTOM' })
      .expect(201);
    await request(app)
      .post(`/api/goals/me/${createRes.body.id}/abandon`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .post(`/api/goals/me/${createRes.body.id}/abandon`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    expect(res.body.code).toBe('invalid_goal_state');
  });

  it('unauthenticated requests get 401', async () => {
    await request(app).post('/api/goals/me').send({ title: 'x', metricType: 'CUSTOM' }).expect(401);
    await request(app).get('/api/goals/me').expect(401);
    await request(app).post(`/api/goals/me/${randomUUID()}/abandon`).expect(401);
  });
});
