import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { prisma, resetUsers, TEST_CLUB_ID } from '../identity/testDb.js';
import { resetCommunity } from '../community/testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedUser({ roleCode = ROLE_CODES.JUGADOR } = {}) {
  const email = `privacidad-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash: await createArgon2PasswordHasher().hash(PASSWORD),
      firstName: 'Ana',
      lastName: 'Ruiz',
      phone: '3001234567',
      birthDate: new Date('1990-01-01'),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  for (const code of new Set([ROLE_CODES.USUARIO, roleCode])) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  await prisma.consent.create({
    data: {
      userId: user.id,
      consentType: 'PRIVACY_POLICY',
      documentVersion: '1',
      action: 'ACCEPTED',
    },
  });
  return { id: user.id, email };
}

async function login(app, email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res;
}

describe('Privacy HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetCommunity();
    await resetUsers();
  });
  afterEach(async () => {
    await resetCommunity();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('download my data: my profile and authorizations as a JSON file, never secrets', async () => {
    const ana = await seedUser();
    const token = (await login(app, ana.email)).body.accessToken;
    const res = await request(app)
      .get('/api/privacy/me/export')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="mis-datos-ctcj-/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data.perfil).toMatchObject({ email: ana.email, phone: '3001234567' });
    expect(res.body.data.autorizaciones[0]).toMatchObject({ consentType: 'PRIVACY_POLICY' });
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/passwordHash|mfaSecret|tokenHash/);
    // Health data never goes into an export (privacy policy, section 4).
    expect(res.body.data.salud).not.toHaveProperty('citas');
  });

  it('a request gets a radicado and a deadline; only the administration sees the inbox', async () => {
    const ana = await seedUser();
    const admin = await seedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const recepcion = await seedUser({ roleCode: ROLE_CODES.RECEPCION });
    const tokenAna = (await login(app, ana.email)).body.accessToken;
    const tokenAdmin = (await login(app, admin.email)).body.accessToken;
    const tokenRecepcion = (await login(app, recepcion.email)).body.accessToken;

    await request(app)
      .post('/api/privacy/me/requests')
      .set('Authorization', `Bearer ${tokenAna}`)
      .send({ kind: 'CONSULTA', description: 'corto' })
      .expect(400);
    const created = await request(app)
      .post('/api/privacy/me/requests')
      .set('Authorization', `Bearer ${tokenAna}`)
      .send({ kind: 'CONSULTA', description: '¿Qué datos míos tienen?' })
      .expect(201);
    expect(created.body.radicado).toMatch(/^CTCJ-\d{4}-\d{5}$/);
    expect(created.body.dueOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(created.body.alert).toBe('ON_TIME');

    await request(app)
      .get('/api/admin/privacy/requests')
      .set('Authorization', `Bearer ${tokenRecepcion}`)
      .expect(403);
    const inbox = await request(app)
      .get('/api/admin/privacy/requests?open=true')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(inbox.body.requests).toHaveLength(1);
    expect(inbox.body.requests[0].requester.email).toBe(ana.email);

    await request(app)
      .post(`/api/admin/privacy/requests/${created.body.id}/answer`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'RESPONDIDA' })
      .expect(400); // an answer is required
    await request(app)
      .post(`/api/admin/privacy/requests/${created.body.id}/answer`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'RESPONDIDA', answer: 'Te enviamos el detalle.' })
      .expect(200);
    const mine = await request(app)
      .get('/api/privacy/me/requests')
      .set('Authorization', `Bearer ${tokenAna}`)
      .expect(200);
    expect(mine.body.requests[0]).toMatchObject({
      status: 'RESPONDIDA',
      answer: 'Te enviamos el detalle.',
    });
  });

  it('deleting the account: anonymized, cannot sign in, posts gone, proofs kept', async () => {
    const ana = await seedUser();
    const admin = await seedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const tokenAna = (await login(app, ana.email)).body.accessToken;
    const tokenAdmin = (await login(app, admin.email)).body.accessToken;
    await prisma.communityPost.create({
      data: { id: randomUUID(), authorId: ana.id, content: 'Mi publicación' },
    });

    const deletion = await request(app)
      .post('/api/privacy/me/requests')
      .set('Authorization', `Bearer ${tokenAna}`)
      .send({ kind: 'SUPRESION', description: 'Quiero eliminar mi cuenta.' })
      .expect(201);
    await request(app)
      .post(`/api/admin/privacy/requests/${deletion.body.id}/answer`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        status: 'RESPONDIDA',
        answer: 'Eliminamos tu cuenta.',
        eraseAccount: true,
      })
      .expect(200);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: ana.id } });
    expect(row).toMatchObject({
      firstName: 'Cuenta',
      lastName: 'eliminada',
      phone: null,
      birthDate: null,
      passwordHash: null,
      status: 'DEACTIVATED',
    });
    expect(row.email).not.toBe(ana.email);
    expect(row.deletedAt).toBeInstanceOf(Date);
    expect(await prisma.communityPost.count({ where: { authorId: ana.id } })).toBe(0);
    expect(await prisma.consent.count({ where: { userId: ana.id } })).toBe(1);
    expect(
      await prisma.dataSubjectRequest.findUnique({ where: { id: deletion.body.id } }),
    ).toMatchObject({ status: 'RESPONDIDA' });
    expect((await login(app, ana.email)).status).toBe(401);
  });
});
