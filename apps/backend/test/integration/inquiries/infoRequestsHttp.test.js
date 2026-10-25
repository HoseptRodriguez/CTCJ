import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { prisma, resetUsers, TEST_CLUB_ID } from '../identity/testDb.js';

const PASSWORD = 'ClaveSegura123';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function seedStaff(role) {
  const email = `info-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash: await createArgon2PasswordHasher().hash(PASSWORD),
      firstName: 'Marta',
      lastName: 'Recepción',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  for (const code of new Set([ROLE_CODES.USUARIO, role])) {
    const r = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: r.id } });
  }
  return email;
}

const reset = async () => {
  await prisma.infoRequestConsent.deleteMany({});
  await prisma.infoRequest.deleteMany({});
  await resetUsers();
};

const FORM = {
  fullName: 'Ana Gómez',
  phone: '310 555 1234',
  program: 'ESCUELA_INFANTIL',
  forWhom: 'CHILD',
  childAge: 9,
  preferredTimes: ['TARDE'],
  message: 'Para mi hija',
  acceptPrivacy: true,
  marketing: false,
};

describe('Solicitar información HTTP API (real Postgres)', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = createApp();
    await reset();
    // One form token, old enough for every test (the minimum is 3 seconds).
    token = (await request(app).get('/api/info-requests/form-token').expect(200)).body.formToken;
    await wait(3100);
  });
  beforeEach(reset);
  afterEach(reset);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const send = (body) => request(app).post('/api/info-requests').send(body);

  it('stores the request and the proof of the authorization; no account needed', async () => {
    await send({ ...FORM, formToken: token }).expect(201, { received: true });
    const row = await prisma.infoRequest.findFirstOrThrow({ include: { consents: true } });
    expect(row).toMatchObject({
      phone: '+573105551234',
      forWhom: 'CHILD',
      childAge: 9,
      status: 'NUEVA',
      marketingOptIn: false,
    });
    expect(row.consents.map((c) => c.consentType)).toEqual(['INFO_REQUEST_PRIVACY']);
  });

  it('refuses a form sent too fast, a missing authorization, a bad phone and a child without age', async () => {
    const fresh = (await request(app).get('/api/info-requests/form-token')).body.formToken;
    const tooFast = await send({ ...FORM, formToken: fresh }).expect(400);
    expect(tooFast.body.code).toBe('form_token_invalid');
    await send({ ...FORM, formToken: token, acceptPrivacy: false }).expect(400);
    const phone = await send({ ...FORM, formToken: token, phone: '12345' }).expect(400);
    expect(phone.body.title).toMatch(/celular colombiano/);
    await send({ ...FORM, formToken: token, childAge: undefined }).expect(400);
    expect(await prisma.infoRequest.count()).toBe(0);
  });

  it('the trap field looks like success and stores nothing', async () => {
    await send({ ...FORM, formToken: token, website: 'http://spam.example' }).expect(201);
    expect(await prisma.infoRequest.count()).toBe(0);
  });

  it('the inbox: reception and admin only; status, notes and who handled it', async () => {
    await send({ ...FORM, formToken: token }).expect(201);
    const recepcion = await seedStaff(ROLE_CODES.RECEPCION);
    const coach = await seedStaff(ROLE_CODES.ENTRENADOR);
    const login = async (email) =>
      (await request(app).post('/api/auth/login').send({ email, password: PASSWORD })).body
        .accessToken;
    const tRecep = await login(recepcion);
    const tCoach = await login(coach);

    await request(app).get('/api/admin/info-requests').expect(401);
    await request(app)
      .get('/api/admin/info-requests')
      .set('Authorization', `Bearer ${tCoach}`)
      .expect(403);
    const count = await request(app)
      .get('/api/admin/info-requests/count-new')
      .set('Authorization', `Bearer ${tRecep}`)
      .expect(200);
    expect(count.body).toEqual({ count: 1 });

    const list = await request(app)
      .get('/api/admin/info-requests?status=NUEVA&program=ESCUELA_INFANTIL')
      .set('Authorization', `Bearer ${tRecep}`)
      .expect(200);
    const id = list.body.requests[0].id;
    await request(app)
      .post(`/api/admin/info-requests/${id}/notes`)
      .set('Authorization', `Bearer ${tRecep}`)
      .send({ text: 'Le escribí por WhatsApp.' })
      .expect(201);
    const updated = await request(app)
      .put(`/api/admin/info-requests/${id}/status`)
      .set('Authorization', `Bearer ${tRecep}`)
      .send({ status: 'CONTACTADA' })
      .expect(200);
    expect(updated.body).toMatchObject({
      status: 'CONTACTADA',
      handledBy: { firstName: 'Marta' },
      notes: [{ text: 'Le escribí por WhatsApp.', author: { firstName: 'Marta' } }],
    });
  });

  it('deleting a request keeps the proof of the authorization (without the data)', async () => {
    await send({ ...FORM, formToken: token }).expect(201);
    await prisma.infoRequest.deleteMany({});
    const proofs = await prisma.infoRequestConsent.findMany();
    expect(proofs).toHaveLength(1);
    expect(proofs[0].requestId).toBeNull();
    await expect(
      prisma.infoRequestConsent.update({
        where: { id: proofs[0].id },
        data: { documentVersion: '9' },
      }),
    ).rejects.toThrow(/append-only/);
  });
});
