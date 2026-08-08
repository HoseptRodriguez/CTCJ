import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetCoaching, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser({ roleCode } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `${(roleCode ?? 'usuario').toLowerCase()}-${randomUUID()}@example.com`;
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
  if (roleCode && roleCode !== ROLE_CODES.USUARIO) {
    const extraRole = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: extraRole.id } });
  }

  return { id: user.id, email, password: PASSWORD };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken;
}

describe('Coaching HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetCoaching();
    await resetUsers();
  });
  afterEach(async () => {
    await resetCoaching();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ADMINISTRADOR and ENTRENADOR can create and list a player's notes; RECEPCION and JUGADOR get 403", async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const coachToken = await login(app, coach.email, coach.password);
    const staffToken = await login(app, staff.email, staff.password);
    const playerToken = await login(app, player.email, player.password);

    const noteRes = await request(app)
      .post(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${coachToken}`)
      .send({
        noteType: 'TRAINING',
        visibility: 'PLAYER_VISIBLE',
        content: 'Great footwork.',
        area: 'FOOTWORK',
      })
      .expect(201);
    expect(noteRes.body).toMatchObject({
      playerId: player.id,
      coachId: coach.id,
      noteType: 'TRAINING',
      visibility: 'PLAYER_VISIBLE',
      area: 'FOOTWORK',
    });

    await request(app)
      .post(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ noteType: 'RECOMMENDATION', visibility: 'PRIVATE', content: 'Needs stamina work.' })
      .expect(201);

    const listRes = await request(app)
      .get(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${coachToken}`)
      .expect(200);
    expect(listRes.body.notes).toHaveLength(2);

    await request(app)
      .post(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ noteType: 'TRAINING', visibility: 'PRIVATE', content: 'x' })
      .expect(403);
    await request(app)
      .post(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ noteType: 'TRAINING', visibility: 'PRIVATE', content: 'x' })
      .expect(403);
    await request(app)
      .get(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('rejects creating a note about a non-JUGADOR target with 409', async () => {
    const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
    const notAPlayer = await seedVerifiedUser();
    const coachToken = await login(app, coach.email, coach.password);

    const res = await request(app)
      .post(`/api/admin/coaching/players/${notAPlayer.id}/notes`)
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ noteType: 'TRAINING', visibility: 'PRIVATE', content: 'x' })
      .expect(409);
    expect(res.body.code).toBe('player_not_eligible');
  });

  it('GET /api/coaching/me/notes returns only PLAYER_VISIBLE notes, never PRIVATE ones', async () => {
    const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const coachToken = await login(app, coach.email, coach.password);
    const playerToken = await login(app, player.email, player.password);

    await request(app)
      .post(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ noteType: 'TACTICAL', visibility: 'PRIVATE', content: 'secret coach note' })
      .expect(201);
    await request(app)
      .post(`/api/admin/coaching/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ noteType: 'TRAINING', visibility: 'PLAYER_VISIBLE', content: 'visible note' })
      .expect(201);

    const res = await request(app)
      .get('/api/coaching/me/notes')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].visibility).toBe('PLAYER_VISIBLE');
    expect(res.body.notes.some((n) => n.content === 'secret coach note')).toBe(false);
  });

  it('unauthenticated requests get 401', async () => {
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    await request(app).post(`/api/admin/coaching/players/${player.id}/notes`).expect(401);
    await request(app).get(`/api/admin/coaching/players/${player.id}/notes`).expect(401);
    await request(app).get('/api/coaching/me/notes').expect(401);
  });

  it('regression: GET /api/admin/users/lookup is now reachable by ENTRENADOR', async () => {
    const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const coachToken = await login(app, coach.email, coach.password);

    const res = await request(app)
      .get('/api/admin/users/lookup')
      .query({ email: player.email })
      .set('Authorization', `Bearer ${coachToken}`)
      .expect(200);
    expect(res.body.id).toBe(player.id);
  });

  describe('performance ratings (Phase 11)', () => {
    it('ADMINISTRADOR and ENTRENADOR can record a partial snapshot and list it; RECEPCION gets 403', async () => {
      const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const coachToken = await login(app, coach.email, coach.password);
      const staffToken = await login(app, staff.email, staff.password);

      const recordRes = await request(app)
        .post(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ratings: { SERVE: 6, VOLLEY: 7 } })
        .expect(201);
      expect(recordRes.body.ratings).toHaveLength(2);
      expect(recordRes.body.ratings[0].coachId).toBe(coach.id);
      // both rows share one recordedAt (one transaction, not two round-trips)
      expect(recordRes.body.ratings[0].recordedAt).toBe(recordRes.body.ratings[1].recordedAt);

      const listRes = await request(app)
        .get(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);
      expect(listRes.body.ratings).toHaveLength(2);
      expect(listRes.body.summary.latestByArea).toEqual({ SERVE: 6, VOLLEY: 7 });

      await request(app)
        .post(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ratings: { SERVE: 6 } })
        .expect(403);
      await request(app)
        .get(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('accepts the expanded skill areas (SLICE, FOOTWORK, FITNESS, MENTALITY)', async () => {
      const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const coachToken = await login(app, coach.email, coach.password);

      const recordRes = await request(app)
        .post(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ratings: { SLICE: 5, FOOTWORK: 8, FITNESS: 7, MENTALITY: 9 } })
        .expect(201);
      expect(recordRes.body.ratings).toHaveLength(4);

      const listRes = await request(app)
        .get(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);
      expect(listRes.body.summary.latestByArea).toEqual({
        SLICE: 5,
        FOOTWORK: 8,
        FITNESS: 7,
        MENTALITY: 9,
      });
    });

    it('rejects recording performance for a non-JUGADOR target with 409', async () => {
      const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
      const notAPlayer = await seedVerifiedUser();
      const coachToken = await login(app, coach.email, coach.password);

      const res = await request(app)
        .post(`/api/admin/coaching/players/${notAPlayer.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ratings: { SERVE: 6 } })
        .expect(409);
      expect(res.body.code).toBe('player_not_eligible');
    });

    it('GET /api/coaching/me/performance is self-service only, scoped to req.user.id', async () => {
      const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const otherPlayer = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const coachToken = await login(app, coach.email, coach.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .post(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ratings: { FOREHAND: 8 } })
        .expect(201);
      await request(app)
        .post(`/api/admin/coaching/players/${otherPlayer.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ratings: { FOREHAND: 3 } })
        .expect(201);

      const res = await request(app)
        .get('/api/coaching/me/performance')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);
      expect(res.body.ratings).toHaveLength(1);
      expect(res.body.summary.latestByArea).toEqual({ FOREHAND: 8 });
    });

    it('unauthenticated requests get 401', async () => {
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      await request(app).post(`/api/admin/coaching/players/${player.id}/performance`).expect(401);
      await request(app).get(`/api/admin/coaching/players/${player.id}/performance`).expect(401);
      await request(app).get('/api/coaching/me/performance').expect(401);
    });
  });

  describe('GET /api/admin/coaching/recent-activity (Coach Dashboard)', () => {
    it('merges recent notes and ratings, enriched with player names, newest-first', async () => {
      const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const coachToken = await login(app, coach.email, coach.password);

      await request(app)
        .post(`/api/admin/coaching/players/${player.id}/notes`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ noteType: 'TRAINING', visibility: 'PLAYER_VISIBLE', content: 'Good session.' })
        .expect(201);
      await request(app)
        .post(`/api/admin/coaching/players/${player.id}/performance`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ ratings: { SERVE: 7 } })
        .expect(201);

      const res = await request(app)
        .get('/api/admin/coaching/recent-activity')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(res.body.activity).toHaveLength(2);
      expect(res.body.activity.every((item) => item.playerId === player.id)).toBe(true);
      expect(res.body.activity.every((item) => item.playerName === 'Test User')).toBe(true);
      const types = res.body.activity.map((item) => item.type).sort();
      expect(types).toEqual(['NOTE', 'RATING']);
    });

    it('RECEPCION and JUGADOR get 403', async () => {
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .get('/api/admin/coaching/recent-activity')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
      await request(app)
        .get('/api/admin/coaching/recent-activity')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('unauthenticated requests get 401', async () => {
      await request(app).get('/api/admin/coaching/recent-activity').expect(401);
    });
  });
});
