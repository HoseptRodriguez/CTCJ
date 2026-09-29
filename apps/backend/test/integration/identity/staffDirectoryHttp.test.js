import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';
let hash;

async function seed(roles, over = {}) {
  const email = `dir-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash: hash,
      firstName: over.firstName ?? 'Persona',
      lastName: over.lastName ?? 'Prueba',
      phone: over.phone ?? null,
      birthDate: over.birthDate ?? new Date('1990-01-01'),
      status: over.status ?? 'ACTIVE',
      emailVerifiedAt: over.unverified ? null : new Date(),
      membershipStatus: over.membershipStatus ?? null,
      documentType: 'CC',
      documentNumber: '1234567890',
    },
  });
  for (const code of new Set([ROLE_CODES.USUARIO, ...roles])) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return { id: user.id, email };
}

const login = async (app, email) =>
  (await request(app).post('/api/auth/login').send({ email, password: PASSWORD })).body.accessToken;

const auditRows = (action) =>
  prisma.$queryRaw`SELECT action, entity_id, after_state FROM audit_logs WHERE action = ${action}`;

describe('Staff directory HTTP API (real Postgres)', () => {
  let app;
  let admin;
  let recepcion;
  let coach;
  let player;
  let tokens;

  beforeAll(async () => {
    app = createApp();
    hash = await createArgon2PasswordHasher().hash(PASSWORD);
  });
  beforeEach(async () => {
    await prisma.$executeRaw`DELETE FROM audit_logs WHERE entity_type IN ('user', 'user_directory')`;
    await resetUsers();
    admin = await seed([ROLE_CODES.ADMINISTRADOR]);
    recepcion = await seed([ROLE_CODES.RECEPCION]);
    coach = await seed([ROLE_CODES.ENTRENADOR]);
    player = await seed([ROLE_CODES.JUGADOR], {
      firstName: 'Ana',
      lastName: 'Gómez',
      phone: '3105551234',
      membershipStatus: 'OVERDUE',
    });
    await seed([], {
      firstName: 'Sin',
      lastName: 'Rol',
      unverified: true,
      status: 'PENDING_VERIFICATION',
    });
    tokens = {
      admin: await login(app, admin.email),
      recepcion: await login(app, recepcion.email),
      coach: await login(app, coach.email),
      player: await login(app, player.email),
    };
  });
  afterEach(async () => {
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const get = (token, path) => request(app).get(path).set('Authorization', `Bearer ${token}`);
  const post = (token, path) => request(app).post(path).set('Authorization', `Bearer ${token}`);

  it('lists players and every account for the front desk; players and outsiders get 403', async () => {
    const players = await get(tokens.recepcion, '/api/admin/directory').expect(200);
    expect(players.body.totals).toEqual({ players: 1, users: 5 });
    expect(players.body.items).toHaveLength(1);
    expect(players.body.items[0]).toMatchObject({ firstName: 'Ana', membershipStatus: 'OVERDUE' });

    const all = await get(tokens.admin, '/api/admin/directory?tab=all&q=310555').expect(200);
    expect(all.body.items.map((i) => i.firstName)).toEqual(['Ana']);

    await get(tokens.player, '/api/admin/directory').expect(403);
    await request(app).get('/api/admin/directory').expect(401);
  });

  it('coaches see players without money matters or the identity document', async () => {
    const list = await get(tokens.coach, '/api/admin/directory?tab=all').expect(200);
    expect(list.body.tab).toBe('players');
    expect(list.body.items[0]).not.toHaveProperty('membershipStatus');
    const file = await get(tokens.coach, `/api/admin/directory/${player.id}`).expect(200);
    expect(file.body).not.toHaveProperty('consents');
    expect(JSON.stringify(file.body)).not.toContain('1234567890');
    await get(tokens.coach, `/api/admin/directory/${admin.id}`).expect(404);
    await get(tokens.coach, `/api/admin/users/${player.id}/document`).expect(403);
  });

  it('only Administración exports; the CSV has no document or health data, and is audited', async () => {
    await get(tokens.recepcion, '/api/admin/directory/export.csv').expect(403);
    await get(tokens.coach, '/api/admin/directory/export.csv').expect(403);
    const res = await get(tokens.admin, '/api/admin/directory/export.csv?tab=all').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/usuarios-ctcj-/);
    expect(res.text).toContain('Ana,Gómez');
    expect(res.text).not.toContain('1234567890');
    const rows = await auditRows('users.export');
    expect(rows).toHaveLength(1);
    expect(rows[0].after_state).toMatchObject({ rows: 5, filters: { tab: 'all' } });
  });

  it('the player role and deactivation are Administración only, audited, and a deactivated account cannot sign in', async () => {
    await post(tokens.recepcion, `/api/admin/directory/${player.id}/deactivate`).expect(403);
    await post(tokens.admin, `/api/admin/directory/${admin.id}/deactivate`).expect(409);
    await post(tokens.admin, `/api/admin/directory/${player.id}/deactivate`).expect(200);
    const denied = await request(app)
      .post('/api/auth/login')
      .send({ email: player.email, password: PASSWORD });
    expect(denied.status).toBeGreaterThanOrEqual(400);
    await post(tokens.admin, `/api/admin/directory/${player.id}/reactivate`).expect(200);
    expect(await login(app, player.email)).toBeTruthy();

    await request(app)
      .delete(`/api/admin/directory/${player.id}/player-role`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const roles =
      await prisma.$queryRaw`SELECT role_code FROM user_roles_view WHERE user_id = ${player.id}::uuid`;
    expect(roles.map((r) => r.role_code)).toEqual(['USUARIO']);
    await post(tokens.admin, `/api/admin/directory/${player.id}/player-role`).expect(200);

    const actions = (
      await prisma.$queryRaw`SELECT action FROM audit_logs WHERE entity_id = ${player.id}::uuid ORDER BY occurred_at, id`
    ).map((r) => r.action);
    expect(actions).toEqual([
      'user.deactivate',
      'user.reactivate',
      'user.role.revoke',
      'user.role.grant',
    ]);
  });

  it('reception can resend the verification email to who never confirmed', async () => {
    const outsider = (
      await get(tokens.recepcion, '/api/admin/directory?tab=all&q=Sin Rol').expect(200)
    ).body.items[0];
    await post(tokens.recepcion, `/api/admin/directory/${outsider.id}/resend-verification`).expect(
      200,
    );
    await post(tokens.recepcion, `/api/admin/directory/${player.id}/resend-verification`).expect(
      409,
    );
    expect(await auditRows('user.verification.resend')).toHaveLength(1);
  });

  it('staff views of a player: reservations (front desk), tournaments and ranking (staff)', async () => {
    const r = await get(tokens.recepcion, `/api/booking/players/${player.id}/reservations`).expect(
      200,
    );
    expect(r.body).toHaveProperty('reservations');
    await get(tokens.coach, `/api/booking/players/${player.id}/reservations`).expect(403);
    const t = await get(tokens.coach, `/api/tournaments/players/${player.id}`).expect(200);
    expect(t.body.tournaments).toEqual([]);
    await get(tokens.coach, `/api/competition/players/${player.id}/summary`).expect(200);
    await get(tokens.player, `/api/competition/players/${player.id}/summary`).expect(403);
  });

  it('the dashboard counts every registered account', async () => {
    const counts = await get(tokens.admin, '/api/admin/users/counts').expect(200);
    expect(counts.body).toMatchObject({ total: 1, users: 5 });
  });
});
