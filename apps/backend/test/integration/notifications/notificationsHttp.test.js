import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetNotifications, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser() {
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

  return { id: user.id, email, password: PASSWORD };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken;
}

describe('Notifications HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetNotifications();
    await resetUsers();
  });
  afterEach(async () => {
    await resetNotifications();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/notifications/me lists recent notifications and an unread count, scoped to the caller', async () => {
    const player = await seedVerifiedUser();
    const otherPlayer = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);

    await prisma.notification.create({
      data: { recipientId: player.id, type: 'CHALLENGE_RECEIVED', title: 'Nuevo reto' },
    });
    await prisma.notification.create({
      data: { recipientId: otherPlayer.id, type: 'CHALLENGE_RECEIVED', title: 'No es mío' },
    });

    const res = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].title).toBe('Nuevo reto');
    expect(res.body.unreadCount).toBe(1);

    await request(app).get('/api/notifications/me').expect(401);
  });

  it('POST /api/notifications/me/:id/read marks one notification read', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);
    const notification = await prisma.notification.create({
      data: { recipientId: player.id, type: 'CHALLENGE_RECEIVED', title: 'Nuevo reto' },
    });

    const res = await request(app)
      .post(`/api/notifications/me/${notification.id}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.readAt).not.toBeNull();

    const listRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.unreadCount).toBe(0);
  });

  it("rejects marking another player's notification read with 404", async () => {
    const player = await seedVerifiedUser();
    const stranger = await seedVerifiedUser();
    const strangerToken = await login(app, stranger.email, stranger.password);
    const notification = await prisma.notification.create({
      data: { recipientId: player.id, type: 'CHALLENGE_RECEIVED', title: 'Nuevo reto' },
    });

    const res = await request(app)
      .post(`/api/notifications/me/${notification.id}/read`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);
    expect(res.body.code).toBe('notification_not_found');
  });

  it('POST /api/notifications/me/read-all marks every unread notification read', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);
    await prisma.notification.create({
      data: { recipientId: player.id, type: 'CHALLENGE_RECEIVED', title: 'A' },
    });
    await prisma.notification.create({
      data: { recipientId: player.id, type: 'CHALLENGE_ACCEPTED', title: 'B' },
    });

    await request(app)
      .post('/api/notifications/me/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.unreadCount).toBe(0);
  });
});
