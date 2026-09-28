import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { ROLE_CODES } from '@ctcj/shared';

// Windows: sharp's file cache keeps files open, which blocks deleting them.
sharp.cache(false);

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';
import { resetNotifications } from '../notifications/testDb.js';
import { mp4Bytes } from '../../unit/community/mediaSamples.js';

import { prisma, resetCommunity, TEST_CLUB_ID } from './testDb.js';

// Without a Blob token (tests), media is stored on disk under uploads/.
const UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../uploads');
const fileOf = (url) => path.join(UPLOADS_DIR, ...url.replace(/^\/uploads\//, '').split('/'));

const PASSWORD = 'ClaveSegura123';
// Users created by these tests: their uploads/community/<id> folders are removed after each test.
const seededIds = [];

async function seedUser({
  roleCode = ROLE_CODES.JUGADOR,
  birthDate = null,
  acceptRules = true,
} = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `media-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash: await passwordHasher.hash(PASSWORD),
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      birthDate,
    },
  });
  for (const code of [ROLE_CODES.USUARIO, roleCode]) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  if (acceptRules) {
    // The Community rules, accepted at first use (proof in consents).
    await prisma.consent.create({
      data: {
        userId: user.id,
        consentType: 'COMMUNITY_RULES',
        documentVersion: '1',
        action: 'ACCEPTED',
      },
    });
  }
  seededIds.push(user.id);
  return { id: user.id, email, password: PASSWORD };
}

async function login(app, user) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  return res.body.accessToken;
}

/** A real photo with EXIF + GPS, like a phone would send. */
function phonePhoto(width = 2400, height = 1800) {
  return sharp({ create: { width, height, channels: 3, background: '#B8532A' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'Telefono' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '4/1 20/1 0/1' },
    })
    .toBuffer();
}

describe('Community posts with photos and videos (real Postgres, local storage)', () => {
  let app;
  let player;
  let token;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetCommunity();
    await resetNotifications();
    await resetUsers();
    player = await seedUser();
    token = await login(app, player);
  });
  afterEach(async () => {
    await resetCommunity();
    await resetNotifications();
    await resetUsers();
    await Promise.all(
      seededIds
        .splice(0)
        .map((id) => rm(path.join(UPLOADS_DIR, 'community', id), { recursive: true, force: true })),
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const post = () =>
    request(app).post('/api/community/posts').set('Authorization', `Bearer ${token}`);

  it('publishes a post with photos: each stored as WebP up to 1600 px, without EXIF/GPS', async () => {
    const res = await post()
      .field('content', 'Final del torneo')
      .attach('images', await phonePhoto(), { filename: 'IMG_1.jpg', contentType: 'image/jpeg' })
      .attach('images', await phonePhoto(900, 1200), {
        filename: 'IMG_2.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(res.body.content).toBe('Final del torneo');
    expect(res.body.media).toHaveLength(2);
    expect(res.body.media[0]).toMatchObject({
      type: 'IMAGE',
      width: 1600,
      height: 1200,
      sortOrder: 0,
    });

    const stored = await sharp(fileOf(res.body.media[0].url)).metadata();
    expect(stored).toMatchObject({ format: 'webp', width: 1600, height: 1200 });
    expect(stored.exif).toBeUndefined();

    const rows = await prisma.postMedia.findMany({ where: { postId: res.body.id } });
    expect(rows).toHaveLength(2);

    const feed = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(feed.body.posts[0].media).toHaveLength(2);
  });

  it('publishes a post with a video (and its cover), text optional', async () => {
    const res = await post()
      .field('videoMeta', JSON.stringify({ durationSeconds: 12, width: 1280, height: 720 }))
      .attach('video', mp4Bytes(12, 64 * 1024), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .attach('poster', await phonePhoto(1280, 720), {
        filename: 'poster.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(res.body.content).toBe('');
    expect(res.body.media).toEqual([
      expect.objectContaining({ type: 'VIDEO', durationSeconds: 12, width: 1280, height: 720 }),
    ]);
    expect(res.body.media[0].posterUrl).toMatch(/\.webp$/);
    expect(existsSync(fileOf(res.body.media[0].url))).toBe(true);
  });

  it('rejects a fake file: ".jpg" extension and type, but the content is something else', async () => {
    const res = await post()
      .attach('images', Buffer.from('<html>esto no es una foto</html>'.repeat(10)), {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    expect(res.body.code).toBe('media_unsupported_type');
    expect(await prisma.communityPost.count()).toBe(0);
  });

  it('rejects a video over 60 seconds (read from its own header)', async () => {
    const res = await post()
      .field('videoMeta', JSON.stringify({ durationSeconds: 30 }))
      .attach('video', mp4Bytes(90, 64 * 1024), { filename: 'largo.mp4', contentType: 'video/mp4' })
      .expect(400);
    expect(res.body.code).toBe('media_video_too_long');
  });

  it('deleting the post removes its post_media rows and its files', async () => {
    const created = await post()
      .attach('images', await phonePhoto(), { filename: 'a.jpg', contentType: 'image/jpeg' })
      .expect(201);
    const file = fileOf(created.body.media[0].url);
    expect(existsSync(file)).toBe(true);

    await request(app)
      .delete(`/api/community/posts/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(await prisma.postMedia.count({ where: { postId: created.body.id } })).toBe(0);
    expect(existsSync(file)).toBe(false);
  });

  it('a minor can post text but never photos; capabilities say so', async () => {
    const minor = await seedUser({ birthDate: new Date('2012-03-01') });
    const minorToken = await login(app, minor);

    // Pending the guardian's authorization: nothing at all can be posted.
    const pending = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${minorToken}`)
      .send({ content: 'Solo texto' })
      .expect(403);
    expect(pending.body.code).toBe('minor_pending_guardian_authorization');

    // A guardian links the account (approved) and authorizes it.
    const guardian = await seedUser();
    const link = await prisma.guardianship.create({
      data: {
        guardianUserId: guardian.id,
        minorUserId: minor.id,
        canPay: false,
        canBook: true,
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedBy: guardian.id, // audit-only column; any staff id would do
      },
    });
    await request(app)
      .post(`/api/identity/me/guardianships/${link.id}/minor-authorization`)
      .set('Authorization', `Bearer ${await login(app, guardian)}`)
      .expect(200);

    const caps = await request(app)
      .get('/api/community/me/media-capabilities')
      .set('Authorization', `Bearer ${minorToken}`)
      .expect(200);
    expect(caps.body).toMatchObject({ canUploadMedia: false, videoUpload: 'server' });

    const res = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${minorToken}`)
      .attach('images', await phonePhoto(), { filename: 'a.jpg', contentType: 'image/jpeg' })
      .expect(403);
    expect(res.body.code).toBe('minor_media_not_allowed');

    await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${minorToken}`)
      .send({ content: 'Solo texto' })
      .expect(201);
  });

  it('3 reports hide the post from the feed until staff review; staff can hide/unhide', async () => {
    const created = await post()
      .attach('images', await phonePhoto(), { filename: 'a.jpg', contentType: 'image/jpeg' })
      .expect(201);
    const reporters = await Promise.all([seedUser(), seedUser(), seedUser()]);
    for (const r of reporters) {
      await request(app)
        .post(`/api/community/posts/${created.body.id}/report`)
        .set('Authorization', `Bearer ${await login(app, r)}`)
        .send({ reason: 'Aparece un menor sin autorización' })
        .expect(201);
    }
    const otherToken = await login(app, reporters[0]);
    const feed = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(feed.body.posts).toHaveLength(0);

    const admin = await seedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin);
    const reports = await request(app)
      .get('/api/admin/community/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(reports.body.reports[0]).toMatchObject({
      targetHidden: true,
      targetHiddenReason: 'AUTO_REPORTS',
    });
    expect(reports.body.reports[0].targetMedia).toHaveLength(1);

    await request(app)
      .post(`/api/admin/community/posts/${created.body.id}/unhide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    const again = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(again.body.posts).toHaveLength(1);

    // A player cannot use the staff hide.
    await request(app)
      .post(`/api/admin/community/posts/${created.body.id}/hide`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('direct video uploads need Vercel Blob; without it the server says so', async () => {
    const res = await request(app)
      .post('/api/community/media/video-upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'blob.generate-client-token',
        payload: { pathname: `community/${player.id}/a.mp4` },
      })
      .expect(409);
    expect(res.body.code).toBe('video_upload_unavailable');
  });
});
