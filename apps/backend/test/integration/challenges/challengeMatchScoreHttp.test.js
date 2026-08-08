import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';
import { resetNotifications } from '../notifications/testDb.js';
import { resetCompetition } from '../competition/testDb.js';

import { prisma, resetChallenges, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedPlayer() {
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
  const jugadorRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLE_CODES.JUGADOR } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: jugadorRole.id } });

  return { id: user.id, email, password: PASSWORD };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken;
}

async function seedOpenSeason() {
  return prisma.competitionSeason.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      name: 'Temporada de prueba',
      year: 2026,
      seasonNumber: 1,
      status: 'OPEN',
      startDate: new Date('2026-01-01'),
      createdBy: randomUUID(),
    },
  });
}

async function createAcceptedChallenge(app, tokenA, tokenB, playerBId) {
  const createRes = await request(app)
    .post('/api/challenges/me')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ opponentUserId: playerBId })
    .expect(201);
  await request(app)
    .post(`/api/challenges/me/${createRes.body.id}/accept`)
    .set('Authorization', `Bearer ${tokenB}`)
    .expect(200);
  return createRes.body.id;
}

const SCORE_PAYLOAD = { category: 'CUARTA', playedAt: '2026-08-14' };

describe('Challenge match score confirmation HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetChallenges();
    await resetCompetition();
    await resetNotifications();
    await resetUsers();
  });
  afterEach(async () => {
    await resetChallenges();
    await resetCompetition();
    await resetNotifications();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('first submission stays PENDING and notifies the other player, without recording a match', async () => {
    await seedOpenSeason();
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const challengeId = await createAcceptedChallenge(app, tokenA, tokenB, playerB.id);

    const res = await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 })
      .expect(200);
    expect(res.body.status).toBe('PENDING');

    const notifB = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(notifB.body.notifications.some((n) => n.type === 'CHALLENGE_RESULT_SUBMITTED')).toBe(
      true,
    );

    const matches = await request(app)
      .get('/api/competition/matches/recent')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(matches.body.matches).toHaveLength(0);
  });

  it('matching second submission confirms, records a real match, and completes the challenge', async () => {
    await seedOpenSeason();
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const challengeId = await createAcceptedChallenge(app, tokenA, tokenB, playerB.id);

    await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 })
      .expect(200);
    const confirmRes = await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 0, opponentSetsWon: 2 })
      .expect(200);
    expect(confirmRes.body.status).toBe('CONFIRMED');

    const notifA = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(notifA.body.notifications.some((n) => n.type === 'CHALLENGE_RESULT_CONFIRMED')).toBe(
      true,
    );

    const challengeList = await request(app)
      .get('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(challengeList.body.challenges[0].status).toBe('COMPLETED');

    // Ranking/match-history/activity-feed surfaces all read from
    // competition_matches directly -- confirm the confirmed friendly
    // match shows up on every one of them, for free.
    const recent = await request(app)
      .get('/api/competition/matches/recent')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(recent.body.matches).toHaveLength(1);
    expect(recent.body.matches[0]).toMatchObject({ setsWonA: 2, setsWonB: 0, winnerSide: 'A' });

    const standings = await request(app)
      .get('/api/competition/standings')
      .query({ category: 'CUARTA', modality: 'SINGLES' })
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(standings.body.standings.some((s) => s.playerId === playerA.id)).toBe(true);

    const summaryA = await request(app)
      .get('/api/competition/me/summary')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(summaryA.body.recentMatches).toHaveLength(1);

    const summaryB = await request(app)
      .get('/api/competition/me/summary')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(summaryB.body.recentMatches).toHaveLength(1);
  });

  it('a mismatched second submission stays PENDING and notifies both players to resolve it', async () => {
    await seedOpenSeason();
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const challengeId = await createAcceptedChallenge(app, tokenA, tokenB, playerB.id);

    await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 })
      .expect(200);
    const mismatchRes = await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 }) // B also claims to have won 2-0
      .expect(200);
    expect(mismatchRes.body.status).toBe('PENDING');

    const notifA = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(notifA.body.notifications.some((n) => n.type === 'CHALLENGE_RESULT_MISMATCH')).toBe(
      true,
    );

    const recent = await request(app)
      .get('/api/competition/matches/recent')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(recent.body.matches).toHaveLength(0);

    // Resubmitting to fix the mismatch resolves it.
    const resolvedRes = await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 0, opponentSetsWon: 2 })
      .expect(200);
    expect(resolvedRes.body.status).toBe('CONFIRMED');
  });

  it('returns a 409 when there is no open season to record into', async () => {
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const challengeId = await createAcceptedChallenge(app, tokenA, tokenB, playerB.id);

    await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 })
      .expect(200);
    const res = await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 0, opponentSetsWon: 2 })
      .expect(409);
    expect(res.body.code).toBe('match_recording_unavailable');
  });

  it('rejects a non-participant with a clean 404', async () => {
    await seedOpenSeason();
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const outsider = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const tokenOutsider = await login(app, outsider.email, outsider.password);
    const challengeId = await createAcceptedChallenge(app, tokenA, tokenB, playerB.id);

    const res = await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenOutsider}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 })
      .expect(404);
    expect(res.body.code).toBe('challenge_not_found');
  });

  it('rejects a score submission for a still-PENDING challenge with a clean 409', async () => {
    await seedOpenSeason();
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);

    const createRes = await request(app)
      .post('/api/challenges/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ opponentUserId: playerB.id })
      .expect(201);

    const res = await request(app)
      .post(`/api/challenges/me/${createRes.body.id}/score`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 })
      .expect(409);
    expect(res.body.code).toBe('challenge_not_accepted');
  });

  it('rejects a tied score with a 400', async () => {
    await seedOpenSeason();
    const playerA = await seedPlayer();
    const playerB = await seedPlayer();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const challengeId = await createAcceptedChallenge(app, tokenA, tokenB, playerB.id);

    await request(app)
      .post(`/api/challenges/me/${challengeId}/score`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 1, opponentSetsWon: 1 })
      .expect(400);
  });

  it('unauthenticated requests get 401', async () => {
    await request(app)
      .post(`/api/challenges/me/${randomUUID()}/score`)
      .send({ ...SCORE_PAYLOAD, mySetsWon: 2, opponentSetsWon: 0 })
      .expect(401);
  });
});
