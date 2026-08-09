import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';
import { resetNotifications } from '../notifications/testDb.js';

import { prisma, resetCommunity, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedUser({ roleCode = ROLE_CODES.JUGADOR } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `user-${randomUUID()}@example.com`;
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

describe('Community HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetCommunity();
    await resetNotifications();
    await resetUsers();
  });
  afterEach(async () => {
    await resetCommunity();
    await resetNotifications();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('full flow: post -> comment (notifies) -> like -> report -> staff dismisses', async () => {
    const playerA = await seedUser();
    const playerB = await seedUser();
    const staff = await seedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const tokenStaff = await login(app, staff.email, staff.password);

    const postRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Buen partido en la cancha 2 hoy!' })
      .expect(201);
    const postId = postRes.body.id;

    const commentRes = await request(app)
      .post(`/api/community/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Felicidades!' })
      .expect(201);
    expect(commentRes.body).toMatchObject({ postId, authorId: playerB.id });

    const notifA = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(notifA.body.notifications[0].type).toBe('POST_COMMENT_RECEIVED');

    await request(app)
      .post(`/api/community/posts/${postId}/like`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(204);

    const listRes = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(listRes.body.posts[0]).toMatchObject({
      id: postId,
      commentCount: 1,
      likeCount: 1,
      likedByMe: true,
      author: { id: playerA.id },
    });

    const reportRes = await request(app)
      .post(`/api/community/posts/${postId}/report`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ reason: 'Solo para probar' })
      .expect(201);
    const reportId = reportRes.body.id;

    const queueRes = await request(app)
      .get('/api/admin/community/reports')
      .set('Authorization', `Bearer ${tokenStaff}`)
      .expect(200);
    expect(queueRes.body.reports).toHaveLength(1);
    expect(queueRes.body.reports[0]).toMatchObject({
      id: reportId,
      targetContent: 'Buen partido en la cancha 2 hoy!',
      reporter: { id: playerB.id },
    });

    await request(app)
      .post(`/api/admin/community/reports/${reportId}/dismiss`)
      .set('Authorization', `Bearer ${tokenStaff}`)
      .expect(200);

    const afterDismiss = await request(app)
      .get('/api/admin/community/reports')
      .set('Authorization', `Bearer ${tokenStaff}`)
      .expect(200);
    expect(afterDismiss.body.reports).toHaveLength(0);

    // The post survives a dismissed report.
    const stillThere = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(stillThere.body.posts).toHaveLength(1);
  });

  it('staff deleting a reported post removes the post, its comments/likes, and the report itself', async () => {
    const playerA = await seedUser();
    const playerB = await seedUser();
    const staff = await seedUser({ roleCode: ROLE_CODES.RECEPCION });
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const tokenStaff = await login(app, staff.email, staff.password);

    const postRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'contenido ofensivo' })
      .expect(201);
    const postId = postRes.body.id;

    await request(app)
      .post(`/api/community/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'comentario' })
      .expect(201);
    await request(app)
      .post(`/api/community/posts/${postId}/like`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(204);
    await request(app)
      .post(`/api/community/posts/${postId}/report`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({})
      .expect(201);

    await request(app)
      .delete(`/api/admin/community/posts/${postId}`)
      .set('Authorization', `Bearer ${tokenStaff}`)
      .expect(204);

    const list = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(list.body.posts).toHaveLength(0);

    const queue = await request(app)
      .get('/api/admin/community/reports')
      .set('Authorization', `Bearer ${tokenStaff}`)
      .expect(200);
    expect(queue.body.reports).toHaveLength(0); // the report didn't orphan

    expect(await prisma.communityComment.findMany({ where: { postId } })).toHaveLength(0);
    expect(await prisma.communityPostLike.findMany({ where: { postId } })).toHaveLength(0);
  });

  it('reporting the same content twice from the same reporter is rejected with 409', async () => {
    const playerA = await seedUser();
    const playerB = await seedUser();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const postRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'hola' })
      .expect(201);

    await request(app)
      .post(`/api/community/posts/${postRes.body.id}/report`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({})
      .expect(201);
    const res = await request(app)
      .post(`/api/community/posts/${postRes.body.id}/report`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({})
      .expect(409);
    expect(res.body.code).toBe('report_already_pending');
  });

  it('the author can delete their own post; a non-author gets 404', async () => {
    const playerA = await seedUser();
    const playerB = await seedUser();
    const tokenA = await login(app, playerA.email, playerA.password);
    const tokenB = await login(app, playerB.email, playerB.password);
    const postRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'hola' })
      .expect(201);

    const forbidden = await request(app)
      .delete(`/api/community/posts/${postRes.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    expect(forbidden.body.code).toBe('post_not_found');

    await request(app)
      .delete(`/api/community/posts/${postRes.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
  });

  it('unliking is idempotent and toggles likedByMe back off', async () => {
    const playerA = await seedUser();
    const tokenA = await login(app, playerA.email, playerA.password);
    const postRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'hola' })
      .expect(201);

    await request(app)
      .post(`/api/community/posts/${postRes.body.id}/like`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
    await request(app)
      .delete(`/api/community/posts/${postRes.body.id}/like`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
    // Idempotent -- unliking again doesn't error.
    await request(app)
      .delete(`/api/community/posts/${postRes.body.id}/like`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);

    const list = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(list.body.posts[0]).toMatchObject({ likeCount: 0, likedByMe: false });
  });

  it('paginates with `before`, returning older posts on a second page', async () => {
    const playerA = await seedUser();
    const tokenA = await login(app, playerA.email, playerA.password);
    const first = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'primero' })
      .expect(201);
    const second = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'segundo' })
      .expect(201);

    const page1 = await request(app)
      .get('/api/community/posts')
      .query({ limit: 1 })
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(page1.body.posts).toHaveLength(1);
    expect(page1.body.posts[0].id).toBe(second.body.id);

    const page2 = await request(app)
      .get('/api/community/posts')
      .query({ limit: 1, before: page1.body.posts[0].createdAt })
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(page2.body.posts).toHaveLength(1);
    expect(page2.body.posts[0].id).toBe(first.body.id);
  });

  it('a plain USUARIO is gated out of every community route with 403', async () => {
    const plain = await seedUser({ roleCode: ROLE_CODES.USUARIO });
    const token = await login(app, plain.email, plain.password);

    await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'hola' })
      .expect(403);
    await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('a JUGADOR (non-staff) is forbidden from the admin moderation routes', async () => {
    const player = await seedUser();
    const token = await login(app, player.email, player.password);

    await request(app)
      .get('/api/admin/community/reports')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('unauthenticated requests get 401', async () => {
    await request(app).get('/api/community/posts').expect(401);
    await request(app).post('/api/community/posts').send({ content: 'x' }).expect(401);
    await request(app).get('/api/admin/community/reports').expect(401);
  });
});
