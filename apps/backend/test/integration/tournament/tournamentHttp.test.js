import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';
import { resetCompetition } from '../competition/testDb.js';

import { prisma, resetTournament, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser({ roleCode, firstName = 'Test' } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `${(roleCode ?? 'usuario').toLowerCase()}-${randomUUID()}@example.com`;
  const passwordHash = await passwordHasher.hash(PASSWORD);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash,
      firstName,
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

async function createTournament(app, adminToken, overrides = {}) {
  const res = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Torneo de prueba', category: 'CUARTA', modality: 'SINGLES', ...overrides })
    .expect(201);
  return res.body;
}

async function addParticipant(app, token, tournamentId, playerIds) {
  const res = await request(app)
    .post(`/api/tournaments/${tournamentId}/participants`)
    .set('Authorization', `Bearer ${token}`)
    .send({ playerIds })
    .expect(201);
  return res.body;
}

describe('Tournament HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetTournament();
    await resetCompetition();
    await resetUsers();
  });
  afterEach(async () => {
    await resetTournament();
    await resetCompetition();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('role gates: ADMINISTRADOR can create/cancel, staff can manage participants/results, JUGADOR forbidden', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const staffToken = await login(app, staff.email, staff.password);
    const jugadorToken = await login(app, jugador.email, jugador.password);

    await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${jugadorToken}`)
      .send({ name: 'x', category: 'CUARTA', modality: 'SINGLES' })
      .expect(403);

    const tournament = await createTournament(app, adminToken);

    await request(app)
      .post(`/api/tournaments/${tournament.id}/participants`)
      .set('Authorization', `Bearer ${jugadorToken}`)
      .send({ playerIds: [randomUUID()] })
      .expect(403);

    await request(app)
      .post(`/api/tournaments/${tournament.id}/generate-draw`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403); // ADMINISTRADOR only, RECEPCION forbidden

    await request(app)
      .post(`/api/tournaments/${tournament.id}/cancel`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403); // ADMINISTRADOR only

    await request(app)
      .post(`/api/tournaments/${tournament.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('GET /tournaments is public, GET /tournaments/:id requires auth, mutations require 401 unauthenticated', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const tournament = await createTournament(app, adminToken);

    await request(app).get('/api/tournaments').expect(200);
    await request(app).get(`/api/tournaments/${tournament.id}`).expect(401);
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const jugadorToken = await login(app, jugador.email, jugador.password);
    await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${jugadorToken}`)
      .expect(200);

    await request(app)
      .post('/api/tournaments')
      .send({ name: 'x', category: 'CUARTA', modality: 'SINGLES' })
      .expect(401);
    await request(app).post(`/api/tournaments/${tournament.id}/generate-draw`).expect(401);
  });

  it('full walkthrough with 5 participants (odd count, requires byes) reaches COMPLETED with the correct champion', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const players = [];
    for (const name of ['Alice', 'Bob', 'Carla', 'Dan', 'Eve']) {
      const p = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR, firstName: name });
      players.push(p);
    }

    const tournament = await createTournament(app, adminToken);
    for (const p of players) {
      await addParticipant(app, adminToken, tournament.id, [p.id]);
    }

    const drawRes = await request(app)
      .post(`/api/tournaments/${tournament.id}/generate-draw`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(drawRes.body.status).toBe('DRAW_GENERATED');

    // Play every match round by round until the tournament is COMPLETED.
    let safety = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      safety += 1;
      if (safety > 20) throw new Error('walkthrough did not terminate -- possible bracket bug');

      const bracketRes = await request(app)
        .get(`/api/tournaments/${tournament.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      if (bracketRes.body.tournament.status === 'COMPLETED') {
        expect(bracketRes.body.tournament.championId).toBeTruthy();
        break;
      }

      const readyMatch = bracketRes.body.matches.find(
        (m) => m.participantAId && m.participantBId && !m.winnerParticipantId,
      );
      expect(readyMatch).toBeTruthy(); // there must always be a next playable match

      await request(app)
        .post(`/api/tournaments/${tournament.id}/matches/${readyMatch.id}/result`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ setsWonA: 2, setsWonB: 0, winnerSide: 'A', playedAt: '2026-03-01' })
        .expect(200);
    }

    // 5 participants -> 8-slot bracket -> 7 total matches, 3 of them byes
    // (no sets recorded, resolved at generation) + 4 real recorded matches.
    const finalBracket = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(finalBracket.body.matches).toHaveLength(7);
    const byes = finalBracket.body.matches.filter(
      (m) => m.setsWonA == null && m.winnerParticipantId != null,
    );
    expect(byes).toHaveLength(3);
  });

  it('a DOBLES tournament keeps the same fixed pair together across rounds (not ad-hoc per-match pairing)', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p3 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const p4 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });

    const tournament = await createTournament(app, adminToken, { modality: 'DOBLES' });
    const pairA = await addParticipant(app, adminToken, tournament.id, [p1.id, p2.id]);
    const pairB = await addParticipant(app, adminToken, tournament.id, [p3.id, p4.id]);

    await request(app)
      .post(`/api/tournaments/${tournament.id}/generate-draw`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const bracket = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const pairAResult = bracket.body.participants.find((p) => p.id === pairA.id);
    const pairBResult = bracket.body.participants.find((p) => p.id === pairB.id);
    expect(pairAResult.members.map((m) => m.playerId).sort()).toEqual([p1.id, p2.id].sort());
    expect(pairBResult.members.map((m) => m.playerId).sort()).toEqual([p3.id, p4.id].sort());
    // Only one match (2 participants -> single final) -- the same pair
    // that registered together is what appears in the bracket match.
    expect(bracket.body.matches).toHaveLength(1);
    expect(
      [bracket.body.matches[0].participantAId, bracket.body.matches[0].participantBId].sort(),
    ).toEqual([pairA.id, pairB.id].sort());
  });

  it('seeds the bracket by current competition standings points (highest seed 1)', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const strong = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR, firstName: 'Strong' });
    const weak = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR, firstName: 'Weak' });
    const bystander = await seedVerifiedUser({
      roleCode: ROLE_CODES.JUGADOR,
      firstName: 'Bystander',
    });

    // Give `strong` 2 competition wins (4 points) and `weak` 0 points, in
    // the SAME category/modality as the tournament so seeding picks it up.
    const seasonRes = await request(app)
      .post('/api/competition/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temporada seeding', year: 2026, seasonNumber: 1, startDate: '2026-01-01' })
      .expect(201);
    await request(app)
      .post('/api/competition/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seasonId: seasonRes.body.id,
        category: 'CUARTA',
        modality: 'SINGLES',
        participantsA: [strong.id],
        participantsB: [weak.id],
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        playedAt: '2026-02-01',
      })
      .expect(201);

    const tournament = await createTournament(app, adminToken);
    // Register weakest-first to prove seeding isn't just registration order.
    await addParticipant(app, adminToken, tournament.id, [weak.id]);
    await addParticipant(app, adminToken, tournament.id, [bystander.id]);
    await addParticipant(app, adminToken, tournament.id, [strong.id]);

    await request(app)
      .post(`/api/tournaments/${tournament.id}/generate-draw`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const bracket = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const strongParticipant = bracket.body.participants.find(
      (p) => p.members[0].playerId === strong.id,
    );
    const weakParticipant = bracket.body.participants.find(
      (p) => p.members[0].playerId === weak.id,
    );
    expect(strongParticipant.seed).toBe(1);
    expect(weakParticipant.seed).toBeGreaterThan(strongParticipant.seed);
  });

  it('rejects generating a draw with fewer than 2 participants, and rejects a duplicate registration', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const p1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });

    const tournament = await createTournament(app, adminToken);
    await addParticipant(app, adminToken, tournament.id, [p1.id]);

    const res = await request(app)
      .post(`/api/tournaments/${tournament.id}/generate-draw`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send()
      .expect(409);
    expect(res.body.code).toBe('not_enough_participants');

    await request(app)
      .post(`/api/tournaments/${tournament.id}/participants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ playerIds: [p1.id] })
      .expect(409);
  });

  it('rejects recording a match for a non-JUGADOR participant during registration with 409', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const notAPlayer = await seedVerifiedUser();

    const tournament = await createTournament(app, adminToken);
    const res = await request(app)
      .post(`/api/tournaments/${tournament.id}/participants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ playerIds: [notAPlayer.id] })
      .expect(409);
    expect(res.body.code).toBe('player_not_eligible');
  });
});
