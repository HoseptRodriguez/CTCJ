import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetClinical, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser({ roleCode } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `${(roleCode ?? 'usuario').toLowerCase()}-${randomUUID()}@example.com`;
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

function auditReadsBy(actorUserId) {
  return prisma.$queryRaw`
    SELECT "actor_user_id"::text AS actor, "actor_roles" AS roles, "action", "entity_type",
           "entity_id"::text AS note_id, "after_state" AS details, "occurred_at"
    FROM "audit_logs"
    WHERE "actor_user_id" = ${actorUserId}::uuid AND "action" = 'CLINICAL_NOTE_READ'
    ORDER BY "occurred_at"`;
}

describe("Administration's access to Physiotherapy (real Postgres)", () => {
  let app;
  let admin;
  let physio;
  let psych;
  let player;
  let tokens;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetClinical();
    await resetUsers();
    admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    physio = await seedVerifiedUser({ roleCode: ROLE_CODES.FISIOTERAPEUTA });
    psych = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    tokens = {
      admin: await login(app, admin.email, admin.password),
      physio: await login(app, physio.email, physio.password),
      psych: await login(app, psych.email, psych.password),
      player: await login(app, player.email, player.password),
    };
    // One note per discipline about the player.
    await request(app)
      .post(`/api/admin/clinical/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${tokens.physio}`)
      .send({
        noteType: 'SESSION_NOTE',
        visibility: 'PRIVATE',
        content: 'Esguince grado 2, tobillo derecho',
      })
      .expect(201);
    await request(app)
      .post(`/api/admin/clinical/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${tokens.psych}`)
      .send({ noteType: 'SESSION_NOTE', visibility: 'PRIVATE', content: 'Nota de psicología' })
      .expect(201);
  });
  afterEach(async () => {
    await resetClinical();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const readAsAdmin = () =>
    request(app)
      .get(`/api/admin/clinical/players/${player.id}/physio-notes`)
      .set('Authorization', `Bearer ${tokens.admin}`);
  const consentAs = (method) =>
    request(app)
      [method]('/api/clinical/me/consents/admin-physio-notes')
      .set('Authorization', `Bearer ${tokens.player}`);

  it('without authorization 403; with it 200 (physio notes only); after withdrawing, 403 again', async () => {
    const denied = await readAsAdmin().expect(403);
    expect(denied.body.code).toBe('clinical_consent_required');
    expect(JSON.stringify(denied.body)).not.toContain('Esguince');

    const granted = await consentAs('post').expect(200);
    expect(granted.body.authorized).toBe(true);
    expect(granted.body.grantedAt).toBeTruthy();

    const allowed = await readAsAdmin().expect(200);
    expect(allowed.body.notes.map((n) => n.content)).toEqual(['Esguince grado 2, tobillo derecho']);

    const revoked = await consentAs('delete').expect(200);
    expect(revoked.body).toMatchObject({ authorized: false });
    expect(revoked.body.revokedAt).toBeTruthy();
    expect(revoked.body.grantedAt).toBe(granted.body.grantedAt);

    await readAsAdmin().expect(403);

    // Both dates are stored in the database.
    const rows = await prisma.clinicalAccessConsent.findMany({ where: { playerId: player.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].grantedAt).toBeInstanceOf(Date);
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
  });

  it('every read of a clinical note is written to audit_logs: who, when, which player', async () => {
    await consentAs('post').expect(200);
    const { body } = await readAsAdmin().expect(200);

    const adminReads = await auditReadsBy(admin.id);
    expect(adminReads).toHaveLength(1);
    expect(adminReads[0]).toMatchObject({
      actor: admin.id,
      action: 'CLINICAL_NOTE_READ',
      entity_type: 'clinical_note',
      note_id: body.notes[0].id,
      details: { playerId: player.id, via: 'ADMIN_WITH_PLAYER_CONSENT' },
    });
    expect(adminReads[0].roles).toContain('ADMINISTRADOR');
    expect(adminReads[0].occurred_at).toBeInstanceOf(Date);

    // A practitioner reading their own discipline is audited too.
    await request(app)
      .get(`/api/admin/clinical/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${tokens.physio}`)
      .expect(200);
    const physioReads = await auditReadsBy(physio.id);
    expect(physioReads).toHaveLength(1);
    expect(physioReads[0].details).toEqual({ playerId: player.id, via: 'PRACTITIONER' });

    // A refused read serves nothing and logs nothing.
    await consentAs('delete').expect(200);
    await readAsAdmin().expect(403);
    expect(await auditReadsBy(admin.id)).toHaveLength(1);
  });

  it('the front desk and practitioners cannot use the administration route; the admin still cannot use the practitioner route', async () => {
    const recepcion = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const recepcionToken = await login(app, recepcion.email, recepcion.password);
    await consentAs('post').expect(200);

    for (const token of [recepcionToken, tokens.physio, tokens.player]) {
      await request(app)
        .get(`/api/admin/clinical/players/${player.id}/physio-notes`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    }
    await request(app)
      .get(`/api/admin/clinical/players/${player.id}/notes`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(403);
  });

  it('summary: appointments, attendance, active plan and "Apto / No apto" -- no clinical text', async () => {
    await request(app)
      .post(`/api/admin/clinical/players/${player.id}/recovery-plans`)
      .set('Authorization', `Bearer ${tokens.physio}`)
      .send({ title: 'Recuperación de ligamento', goal: 'Volver a jugar', visibility: 'PRIVATE' })
      .expect(201);

    // Only the physiotherapist sets fitness; a psychologist cannot.
    await request(app)
      .post(`/api/admin/clinical/players/${player.id}/fitness-status`)
      .set('Authorization', `Bearer ${tokens.psych}`)
      .send({ status: 'FIT' })
      .expect(403);
    await request(app)
      .post(`/api/admin/clinical/players/${player.id}/fitness-status`)
      .set('Authorization', `Bearer ${tokens.physio}`)
      .send({ status: 'FIT', unfitUntil: '2099-01-01' })
      .expect(400);
    const set = await request(app)
      .post(`/api/admin/clinical/players/${player.id}/fitness-status`)
      .set('Authorization', `Bearer ${tokens.physio}`)
      .send({ status: 'UNFIT', unfitUntil: '2099-01-15' })
      .expect(201);
    expect(set.body).toMatchObject({ status: 'UNFIT', unfitUntil: '2099-01-15' });

    const { body } = await request(app)
      .get(`/api/admin/clinical/players/${player.id}/physio-summary`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    expect(body.hasActiveRecoveryPlan).toBe(true);
    expect(body.fitness).toMatchObject({ status: 'UNFIT', unfitUntil: '2099-01-15' });
    expect(body.attendance).toEqual({ completed: 0, noShow: 0, cancelled: 0, rate: null });
    expect(body.notesAccess).toEqual({ authorized: false, grantedAt: null });
    const text = JSON.stringify(body);
    expect(text).not.toContain('ligamento');
    expect(text).not.toContain('Esguince');

    // The front desk never sees it.
    const recepcion = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const recepcionToken = await login(app, recepcion.email, recepcion.password);
    await request(app)
      .get(`/api/admin/clinical/players/${player.id}/physio-summary`)
      .set('Authorization', `Bearer ${recepcionToken}`)
      .expect(403);
  });
});
