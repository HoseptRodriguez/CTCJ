import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetCompetition, TEST_CLUB_ID } from './testDb.js';

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

async function createOpenSeason(app, adminToken, overrides = {}) {
  const res = await request(app)
    .post('/api/competition/seasons')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Temporada 1 · 2026',
      year: 2026,
      seasonNumber: 1,
      startDate: '2026-01-01',
      ...overrides,
    })
    .expect(201);
  return res.body;
}

describe('Competition HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetCompetition();
    await resetUsers();
  });
  afterEach(async () => {
    await resetCompetition();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('role gates: ADMINISTRADOR can create/close seasons, ENTRENADOR/RECEPCION get 403', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const coach = await seedVerifiedUser({ roleCode: ROLE_CODES.ENTRENADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const coachToken = await login(app, coach.email, coach.password);

    await request(app)
      .post('/api/competition/seasons')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ name: 'Temporada 1 · 2026', year: 2026, seasonNumber: 1, startDate: '2026-01-01' })
      .expect(403);

    const season = await createOpenSeason(app, adminToken);
    expect(season.status).toBe('OPEN');

    await request(app)
      .post(`/api/competition/seasons/${season.id}/close`)
      .set('Authorization', `Bearer ${coachToken}`)
      .expect(403);

    await request(app)
      .post(`/api/competition/seasons/${season.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('role gates: ADMINISTRADOR/RECEPCION/ENTRENADOR can record/void matches, JUGADOR gets 403', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const staffToken = await login(app, staff.email, staff.password);
    const jugadorToken = await login(app, jugador.email, jugador.password);

    const season = await createOpenSeason(app, adminToken);
    const matchPayload = {
      seasonId: season.id,
      category: 'CUARTA',
      modality: 'SINGLES',
      participantsA: [p1.id],
      participantsB: [p2.id],
      winnerSide: 'A',
      setsWonA: 2,
      setsWonB: 0,
      playedAt: '2026-03-01',
    };

    await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${jugadorToken}`)
      .send(matchPayload)
      .expect(403);

    const matchRes = await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(matchPayload)
      .expect(201);
    expect(matchRes.body.status).toBe('RECORDED');

    await request(app)
      .post(`/api/competition/matches/${matchRes.body.id}/void`)
      .set('Authorization', `Bearer ${jugadorToken}`)
      .send({ reason: 'x' })
      .expect(403);

    await request(app)
      .post(`/api/competition/matches/${matchRes.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'resultado incorrecto' })
      .expect(200);
  });

  it('GET /standings and /matches: any authenticated role gets 200, unauthenticated gets 401', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const jugadorToken = await login(app, jugador.email, jugador.password);
    const season = await createOpenSeason(app, adminToken);

    await request(app)
      .get('/api/competition/standings')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .set('Authorization', `Bearer ${jugadorToken}`)
      .expect(200);
    await request(app)
      .get('/api/competition/matches')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .set('Authorization', `Bearer ${jugadorToken}`)
      .expect(200);

    await request(app)
      .get('/api/competition/standings')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .expect(401);
    await request(app)
      .get('/api/competition/matches')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .expect(401);
  });

  it('GET /seasons is public, no auth required', async () => {
    await request(app).get('/api/competition/seasons').expect(200);
  });

  it('full round-trip: records singles + doubles matches and computes correct standings order', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p3 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p4 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const season = await createOpenSeason(app, adminToken);

    // Singles: p1 beats p2.
    await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: season.id,
        category: 'CUARTA',
        modality: 'SINGLES',
        participantsA: [p1.id],
        participantsB: [p2.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        playedAt: '2026-03-01',
      })
      .expect(201);

    // Doubles: p3+p4 beat p1+p2 (different modality, separate standings table).
    await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: season.id,
        category: 'CUARTA',
        modality: 'DOBLES',
        participantsA: [p3.id, p4.id],
        participantsB: [p1.id, p2.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 1,
        playedAt: '2026-03-02',
      })
      .expect(201);

    const singlesRes = await request(app)
      .get('/api/competition/standings')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(singlesRes.body.standings).toHaveLength(2);
    expect(singlesRes.body.standings[0].playerId).toBe(p1.id);
    expect(singlesRes.body.standings[0].points).toBe(2);
    expect(singlesRes.body.standings[0].qualifiesForMasters).toBe(true);

    const doublesRes = await request(app)
      .get('/api/competition/standings')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'DOBLES' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(doublesRes.body.standings).toHaveLength(4);
    const winners = doublesRes.body.standings.filter((r) => r.points === 2).map((r) => r.playerId);
    expect(winners.sort()).toEqual([p3.id, p4.id].sort());
  });

  it("GET /me/summary: discovers the player's own category/modality and computes rank/win-loss without needing to specify it", async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const p1Token = await login(app, p1.email, p1.password);
    const season = await createOpenSeason(app, adminToken);

    await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: season.id,
        category: 'CUARTA',
        modality: 'SINGLES',
        participantsA: [p1.id],
        participantsB: [p2.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        playedAt: '2026-03-01',
      })
      .expect(201);

    const res = await request(app)
      .get('/api/competition/me/summary')
      .set('Authorization', `Bearer ${p1Token}`)
      .expect(200);

    expect(res.body.hasSeason).toBe(true);
    expect(res.body.categories).toHaveLength(1);
    expect(res.body.categories[0]).toMatchObject({
      category: 'CUARTA',
      modality: 'SINGLES',
      wins: 1,
      losses: 0,
      winPercentage: 100,
    });
    expect(res.body.recentMatches).toHaveLength(1);
    expect(res.body.recentMatches[0].won).toBe(true);
    expect(res.body.recentMatches[0].participantsB[0].playerId).toBe(p2.id);

    await request(app).get('/api/competition/me/summary').expect(401);
  });

  it('DB CHECK constraints reject a malformed insert even bypassing the domain layer', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const season = await createOpenSeason(app, adminToken);

    await expect(
      prisma.competitionMatch.create({
        data: {
          id: randomUUID(),
          seasonId: season.id,
          category: 'CUARTA',
          modality: 'SINGLES',
          winnerSide: 'A',
          setsWonA: 1, // A must have MORE sets than B to win -- this violates the CHECK
          setsWonB: 2,
          playedAt: new Date('2026-03-01'),
          recordedBy: admin.id,
          participants: {
            create: [
              { playerId: p1.id, side: 'A' },
              { playerId: p2.id, side: 'B' },
            ],
          },
        },
      }),
    ).rejects.toThrow();
  });

  it('voiding a match removes it from standings but keeps it in match history with a VOID status', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const season = await createOpenSeason(app, adminToken);

    const matchRes = await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: season.id,
        category: 'CUARTA',
        modality: 'SINGLES',
        participantsA: [p1.id],
        participantsB: [p2.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        playedAt: '2026-03-01',
      })
      .expect(201);

    await request(app)
      .post(`/api/competition/matches/${matchRes.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'resultado incorrecto' })
      .expect(200);

    const standingsRes = await request(app)
      .get('/api/competition/standings')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(standingsRes.body.standings).toHaveLength(0);

    const historyRes = await request(app)
      .get('/api/competition/matches')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(historyRes.body.matches).toHaveLength(1);
    expect(historyRes.body.matches[0].status).toBe('VOID');
  });

  it('season lifecycle: create -> second OPEN rejected -> close -> matches no longer recordable -> standings still readable', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const season = await createOpenSeason(app, adminToken);

    await request(app)
      .post('/api/competition/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temporada 2 · 2026', year: 2026, seasonNumber: 2, startDate: '2026-07-01' })
      .expect(409);

    await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: season.id,
        category: 'CUARTA',
        modality: 'SINGLES',
        participantsA: [p1.id],
        participantsB: [p2.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        playedAt: '2026-03-01',
      })
      .expect(201);

    await request(app)
      .post(`/api/competition/seasons/${season.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: season.id,
        category: 'CUARTA',
        modality: 'SINGLES',
        participantsA: [p1.id],
        participantsB: [p2.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        playedAt: '2026-04-01',
      })
      .expect(409);

    const standingsRes = await request(app)
      .get('/api/competition/standings')
      .query({ seasonId: season.id, category: 'CUARTA', modality: 'SINGLES' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(standingsRes.body.standings).toHaveLength(2);
  });

  it('rejects recording a match with a non-JUGADOR participant with 409', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const notAPlayer = await seedVerifiedUser();
    const adminToken = await login(app, admin.email, admin.password);
    const season = await createOpenSeason(app, adminToken);

    const res = await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: season.id,
        category: 'CUARTA',
        modality: 'SINGLES',
        participantsA: [p1.id],
        participantsB: [notAPlayer.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        playedAt: '2026-03-01',
      })
      .expect(409);
    expect(res.body.code).toBe('player_not_eligible');
  });
});
