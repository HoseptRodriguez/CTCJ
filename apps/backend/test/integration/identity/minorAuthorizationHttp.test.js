import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetReservations } from '../booking/testDb.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedUser(roleCodes, extra = {}) {
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `u-${randomUUID()}@example.com`,
      passwordHash: await createArgon2PasswordHasher().hash(PASSWORD),
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      ...extra,
    },
  });
  for (const code of new Set([ROLE_CODES.USUARIO, ...roleCodes])) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return user;
}

function slot(hoursFromNow) {
  const base = new Date();
  base.setUTCMinutes(0, 0, 0);
  const start = new Date(base.getTime() + hoursFromNow * 3600e3);
  return { start: start.toISOString(), end: new Date(start.getTime() + 3600e3).toISOString() };
}

describe("Minors wait for the guardian's authorization (real Postgres)", () => {
  let app;
  let courtId;
  let people;
  let as;

  beforeAll(async () => {
    app = createApp();
    courtId = (await prisma.court.findFirstOrThrow({ where: { clubId: TEST_CLUB_ID } })).id;
  });
  beforeEach(async () => {
    await resetReservations();
    await resetUsers();
    const fifteenYearsAgo = new Date(Date.now() - 15 * 365.25 * 864e5);
    people = {
      hijo: await seedUser([ROLE_CODES.JUGADOR], { birthDate: fifteenYearsAgo }),
      mama: await seedUser([ROLE_CODES.JUGADOR]),
      admin: await seedUser([ROLE_CODES.ADMINISTRADOR]),
      recepcion: await seedUser([ROLE_CODES.RECEPCION]),
      coach: await seedUser([ROLE_CODES.ENTRENADOR]),
    };
    const tokens = {};
    for (const [name, user] of Object.entries(people)) {
      tokens[name] = (
        await request(app)
          .post('/api/auth/login')
          .send({ email: user.email, password: PASSWORD })
          .expect(200)
      ).body.accessToken;
    }
    as = (who) => ({ Authorization: `Bearer ${tokens[who]}` });
  });
  afterEach(async () => {
    await resetReservations();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('pending minor: can sign in, but not book or post, until the guardian authorizes', async () => {
    await request(app)
      .get('/api/identity/me/account-restrictions')
      .set(as('hijo'))
      .expect(200, { isMinor: true, pendingGuardianAuthorization: true });

    const blockedHold = await request(app)
      .post('/api/booking/hold')
      .set(as('hijo'))
      .send({ courtId, ...slot(26) })
      .expect(403);
    expect(blockedHold.body.code).toBe('minor_pending_guardian_authorization');
    const blockedPost = await request(app)
      .post('/api/community/posts')
      .set(as('hijo'))
      .send({ content: 'Hola' })
      .expect(403);
    expect(blockedPost.body.code).toBe('minor_pending_guardian_authorization');

    // The guardian links the account and the club approves it: still pending.
    const link = await request(app)
      .post('/api/identity/me/guardianships')
      .set(as('mama'))
      .send({ minorEmail: people.hijo.email, canPay: true, canBook: true })
      .expect(201);
    await request(app)
      .put(`/api/admin/guardianships/${link.body.id}/decision`)
      .set(as('admin'))
      .send({ decision: 'APPROVED' })
      .expect(200);
    await request(app)
      .post('/api/booking/hold')
      .set(as('hijo'))
      .send({ courtId, ...slot(26) })
      .expect(403);

    // The guardian authorizes: the proof is stored, and the minor can book.
    const listed = await request(app)
      .get('/api/identity/me/guardianships')
      .set(as('mama'))
      .expect(200);
    expect(listed.body.guardianships[0].minorAuthorization.authorized).toBe(false);
    await request(app)
      .post(`/api/identity/me/guardianships/${link.body.id}/minor-authorization`)
      .set(as('mama'))
      .set('User-Agent', 'NavegadorAcudiente')
      .expect(200);
    const [proof] = await prisma.consent.findMany({ where: { userId: people.hijo.id } });
    expect(proof).toMatchObject({
      givenBy: people.mama.id,
      consentType: 'MINOR_DATA_IMAGE',
      documentVersion: '1',
      action: 'ACCEPTED',
      userAgent: 'NavegadorAcudiente',
    });
    await request(app)
      .post('/api/booking/hold')
      .set(as('hijo'))
      .send({ courtId, ...slot(26) })
      .expect(201);

    // Withdrawing adds a row and blocks the minor again.
    await request(app)
      .delete(`/api/identity/me/guardianships/${link.body.id}/minor-authorization`)
      .set(as('mama'))
      .expect(200);
    expect(await prisma.consent.count({ where: { userId: people.hijo.id } })).toBe(2);
    await request(app)
      .post('/api/booking/hold')
      .set(as('hijo'))
      .send({ courtId, ...slot(30) })
      .expect(403);

    // The proof can't be rewritten.
    await expect(
      prisma.consent.update({ where: { id: proof.id }, data: { action: 'WITHDRAWN' } }),
    ).rejects.toThrow();
  });

  it('an adult is never restricted', async () => {
    await request(app)
      .get('/api/identity/me/account-restrictions')
      .set(as('mama'))
      .expect(200, { isMinor: false, pendingGuardianAuthorization: false });
  });

  it('identity document: reception fills it; players and coaches cannot', async () => {
    const url = `/api/admin/users/${people.mama.id}/document`;
    await request(app)
      .put(url)
      .set(as('recepcion'))
      .send({ documentType: 'CC', documentNumber: '1069123456' })
      .expect(200);
    await request(app)
      .get(url)
      .set(as('admin'))
      .expect(200, { userId: people.mama.id, documentType: 'CC', documentNumber: '1069123456' });
    await request(app).get(url).set(as('coach')).expect(403);
    await request(app).get(url).set(as('hijo')).expect(403);
  });

  it('play style: the player edits it, coaches read it on the player card', async () => {
    await request(app)
      .patch('/api/identity/me')
      .set(as('mama'))
      .send({ dominantHand: 'LEFT', backhand: 'TWO_HANDED' })
      .expect(200);
    await request(app)
      .get(`/api/players/${people.mama.id}/play-style`)
      .set(as('coach'))
      .expect(200, { id: people.mama.id, dominantHand: 'LEFT', backhand: 'TWO_HANDED' });
    await request(app).get(`/api/players/${people.mama.id}/play-style`).set(as('hijo')).expect(403);
  });
});
