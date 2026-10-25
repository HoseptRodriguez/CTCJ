import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';
import { resetCompetition } from '../competition/testDb.js';
import { prisma, resetTournament, TEST_CLUB_ID } from '../tournament/testDb.js';

const PASSWORD = 'ClaveSegura123';
let hash;

async function seedUser({ roles = [], firstName = 'Ana', birthDate = null } = {}) {
  hash ??= await createArgon2PasswordHasher().hash(PASSWORD);
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `n-${randomUUID()}@example.com`,
      passwordHash: hash,
      firstName,
      lastName: 'Prueba',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      birthDate,
    },
  });
  for (const code of new Set([ROLE_CODES.USUARIO, ...roles])) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return user;
}

const login = async (app, email) =>
  (await request(app).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200)).body
    .accessToken;

async function reset() {
  await prisma.emailDelivery.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.outboxEvent.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.notificationSetting.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.guardianship.deleteMany({});
  await resetTournament();
  await resetCompetition();
  await resetUsers();
}

/** Emails wait for the allowed hours; tests make them due now. */
const makeDue = () =>
  prisma.emailDelivery.updateMany({ where: { status: 'QUEUED' }, data: { notBefore: new Date() } });

describe('Notifications by email and announcements (real Postgres)', () => {
  let app;
  let jobs;

  beforeAll(() => {
    app = createApp();
    jobs = app.locals.notifications;
  });
  beforeEach(async () => {
    await reset();
    jobs.emailTransport.sent.length = 0;
  });
  afterEach(reset);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('a scheduled announcement goes out when its time comes: bell, Novedades and email', async () => {
    const admin = await seedUser({ roles: [ROLE_CODES.ADMINISTRADOR], firstName: 'Admin' });
    const player = await seedUser({ roles: [ROLE_CODES.JUGADOR], firstName: 'Ana' });
    const token = await login(app, admin.email);
    const tomorrowNoon = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();

    const preview = await request(app)
      .post('/api/admin/announcements/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Canchas cerradas por lluvia',
        body: '**Hoy** no hay juego.\n\n- Cancha 1\n- Cancha 2',
        kind: 'SERVICE',
        audienceType: 'PLAYERS',
      })
      .expect(200);
    expect(preview.body).toMatchObject({ recipients: 1, excluded: 0 });
    expect(preview.body.email.html).toContain('<strong>Hoy</strong>');

    const created = await request(app)
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Canchas cerradas por lluvia',
        body: '**Hoy** no hay juego.',
        kind: 'SERVICE',
        audienceType: 'PLAYERS',
        scheduledFor: tomorrowNoon,
      })
      .expect(201);
    expect(created.body.status).toBe('SCHEDULED');

    // Not yet due: nothing happens.
    expect(await jobs.publishDueAnnouncements()).toEqual([]);

    // Its time comes.
    await prisma.announcement.update({
      where: { id: created.body.id },
      data: { scheduledFor: new Date(Date.now() - 1000) },
    });
    expect(await jobs.publishDueAnnouncements()).toEqual([created.body.id]);
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { eventType: 'ANNOUNCEMENT_PUBLISHED' },
    });
    expect(event.payload).toEqual({ announcementId: created.body.id });

    await jobs.processOutbox();
    expect(
      await prisma.notification.count({ where: { recipientId: player.id, type: 'ANNOUNCEMENT' } }),
    ).toBe(1);
    await makeDue();
    await jobs.sendDueEmails();
    expect(jobs.emailTransport.sent.map((m) => m.to)).toEqual([player.email]);
    expect(jobs.emailTransport.sent[0].text).toContain('Cambiar mis notificaciones');

    const playerToken = await login(app, player.email);
    const news = await request(app)
      .get('/api/notifications/me/news')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);
    expect(news.body.news.map((n) => n.title)).toEqual(['Canchas cerradas por lluvia']);

    const history = await request(app)
      .get('/api/admin/announcements')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(history.body.announcements[0]).toMatchObject({
      status: 'SENT',
      recipientsCount: 1,
      emails: { sent: 1, failed: 0 },
    });
  });

  it('a promotional announcement only reaches who authorized it; on a Sunday it proposes Monday', async () => {
    const admin = await seedUser({ roles: [ROLE_CODES.ADMINISTRADOR], firstName: 'Admin' });
    await seedUser({ roles: [ROLE_CODES.JUGADOR] });
    const token = await login(app, admin.email);
    const preview = await request(app)
      .post('/api/admin/announcements/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Promo de raquetas',
        body: 'Descuento',
        kind: 'PROMOTIONAL',
        audienceType: 'ALL',
      })
      .expect(200);
    // Nobody authorized promotions: all excluded.
    expect(preview.body.recipients).toBe(0);
    expect(preview.body.excluded).toBeGreaterThan(0);

    const sunday = '2030-10-06T10:00:00-05:00';
    const refused = await request(app)
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Promo de raquetas',
        body: 'Descuento',
        kind: 'PROMOTIONAL',
        audienceType: 'ALL',
        scheduledFor: sunday,
      })
      .expect(422);
    expect(refused.body.code).toBe('outside_promotional_hours');
    expect(refused.body.details.suggestedTime).toBe('2030-10-07T12:00:00.000Z'); // lunes 7:00 a. m.
  });

  it('publishing a tournament draw tells the players in the same transaction; a minor via the guardian', async () => {
    const admin = await seedUser({ roles: [ROLE_CODES.ADMINISTRADOR], firstName: 'Admin' });
    const adult = await seedUser({ roles: [ROLE_CODES.JUGADOR], firstName: 'Ana' });
    const minor = await seedUser({
      roles: [ROLE_CODES.JUGADOR],
      firstName: 'Lucía',
      birthDate: new Date('2014-05-01'),
    });
    const guardian = await seedUser({ firstName: 'Marta' });
    await prisma.guardianship.create({
      data: {
        guardianUserId: guardian.id,
        minorUserId: minor.id,
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedBy: admin.id,
      },
    });
    const token = await login(app, admin.email);
    const t = (
      await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Copa Octubre', category: 'CUARTA', modality: 'SINGLES' })
        .expect(201)
    ).body;
    for (const id of [adult.id, minor.id]) {
      await request(app)
        .post(`/api/tournaments/${t.id}/participants`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playerIds: [id] })
        .expect(201);
    }
    await request(app)
      .post(`/api/tournaments/${t.id}/generate-draw`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { eventType: 'TOURNAMENT_DRAW_PUBLISHED' },
    });
    expect(event.payload.playerIds.sort()).toEqual([adult.id, minor.id].sort());

    await jobs.processOutbox();
    expect(await prisma.notification.count({ where: { type: 'TOURNAMENT_DRAW_PUBLISHED' } })).toBe(
      2,
    );
    await makeDue();
    await jobs.sendDueEmails();
    const to = jobs.emailTransport.sent.map((m) => m.to).sort();
    expect(to).toEqual([adult.email, guardian.email].sort());
    expect(to).not.toContain(minor.email);
    const toGuardian = jobs.emailTransport.sent.find((m) => m.to === guardian.email);
    expect(toGuardian.text).toContain('acudiente de Lucía');
    expect(toGuardian.text).toContain(`/torneos/${t.id}#cuadros`);

    // The public page shows the minor as "Lucía P." (no authorization of the full name).
    const page = await request(app).get(`/api/tournaments/public/${t.id}`).expect(200);
    const names = page.body.participants.flatMap((p) => p.names).sort();
    expect(names).toEqual(['Ana Prueba', 'Lucía P.']);
    expect(JSON.stringify(page.body)).not.toContain('@example.com');
  });

  it('an outbox event that keeps failing is retried 3 times and keeps its error', async () => {
    const bad = await prisma.outboxEvent.create({
      data: {
        aggregateType: 'Tournament',
        aggregateId: randomUUID(),
        eventType: 'TOURNAMENT_CANCELLED',
        payload: { tournamentId: randomUUID(), name: 'X', playerIds: ['no-es-un-uuid'] },
      },
    });
    for (let i = 0; i < 5; i += 1) await jobs.processOutbox();
    const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: bad.id } });
    expect(row.attempts).toBe(3);
    expect(row.processedAt).toBeNull();
    expect(row.lastError).toBeTruthy();
  });

  it('"Dejar de recibir estos correos" works with the signed link, without login', async () => {
    const player = await seedUser({ roles: [ROLE_CODES.JUGADOR] });
    const token = jobs.unsubscribeTokens.create(player.id, 'CLUB_NOTICES');
    const res = await request(app)
      .post('/api/notifications/unsubscribe')
      .send({ token })
      .expect(200);
    expect(res.body).toMatchObject({ category: 'CLUB_NOTICES', changed: true });
    const pref = await prisma.notificationPreference.findUniqueOrThrow({
      where: {
        userId_category_channel: { userId: player.id, category: 'CLUB_NOTICES', channel: 'EMAIL' },
      },
    });
    expect(pref.enabled).toBe(false);
    await request(app)
      .post('/api/notifications/unsubscribe')
      .send({ token: `${token}x` })
      .expect(400);
  });
});
