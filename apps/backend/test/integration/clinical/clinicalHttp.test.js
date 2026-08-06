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

describe('Clinical HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetClinical();
    await resetUsers();
  });
  afterEach(async () => {
    await resetClinical();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('role gates: scheduling roles can schedule/cancel, RECEPCION cannot mark outcomes, only PSICOLOGO/NEUROPSICOLOGO touch notes (ADMINISTRADOR excluded)', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const recepcion = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const psicologo = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const recepcionToken = await login(app, recepcion.email, recepcion.password);
    const psicologoToken = await login(app, psicologo.email, psicologo.password);
    const jugadorToken = await login(app, jugador.email, jugador.password);

    // RECEPCION can schedule (logistics only).
    const scheduleRes = await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${recepcionToken}`)
      .send({
        playerId: jugador.id,
        practitionerId: psicologo.id,
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      })
      .expect(201);
    expect(scheduleRes.body.status).toBe('SCHEDULED');

    // RECEPCION cannot mark a session's outcome.
    await request(app)
      .post(`/api/admin/clinical/appointments/${scheduleRes.body.id}/complete`)
      .set('Authorization', `Bearer ${recepcionToken}`)
      .expect(403);

    // PSICOLOGO (practitioner) can mark it completed.
    await request(app)
      .post(`/api/admin/clinical/appointments/${scheduleRes.body.id}/complete`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .expect(200);

    // ADMINISTRADOR is excluded from note content -- both read and write.
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ noteType: 'FOLLOW_UP', visibility: 'PRIVATE', content: 'x' })
      .expect(403);
    await request(app)
      .get(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    // RECEPCION is also excluded from notes.
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${recepcionToken}`)
      .send({ noteType: 'FOLLOW_UP', visibility: 'PRIVATE', content: 'x' })
      .expect(403);

    // PSICOLOGO can create and read notes.
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .send({ noteType: 'FOLLOW_UP', visibility: 'PRIVATE', content: 'Buena sesion.' })
      .expect(201);

    // JUGADOR cannot schedule for themselves (staff-assisted only).
    await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${jugadorToken}`)
      .send({
        playerId: jugador.id,
        practitionerId: psicologo.id,
        start: '2026-03-02T10:00:00-05:00',
        end: '2026-03-02T11:00:00-05:00',
      })
      .expect(403);
  });

  it('prevents double-booking the same practitioner with a clean 409, not a raw 500', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const psicologo = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    const jugador1 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const jugador2 = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);

    await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: jugador1.id,
        practitionerId: psicologo.id,
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      })
      .expect(201);

    const conflictRes = await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: jugador2.id,
        practitionerId: psicologo.id,
        start: '2026-03-01T10:30:00-05:00',
        end: '2026-03-01T11:30:00-05:00',
      })
      .expect(409);
    expect(conflictRes.body.code).toBe('practitioner_time_conflict');
  });

  it('full flow: schedule -> complete -> note created -> player sees PLAYER_VISIBLE note only via /me/notes, and their own appointment via /me/appointments', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const psicologo = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const psicologoToken = await login(app, psicologo.email, psicologo.password);
    const jugadorToken = await login(app, jugador.email, jugador.password);

    const scheduleRes = await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: jugador.id,
        practitionerId: psicologo.id,
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      })
      .expect(201);

    await request(app)
      .post(`/api/admin/clinical/appointments/${scheduleRes.body.id}/complete`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .expect(200);

    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .send({
        noteType: 'SESSION_NOTE',
        visibility: 'PRIVATE',
        content: 'nota privada',
        appointmentId: scheduleRes.body.id,
      })
      .expect(201);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .send({ noteType: 'RECOMMENDATION', visibility: 'PLAYER_VISIBLE', content: 'nota visible' })
      .expect(201);

    const myNotesRes = await request(app)
      .get('/api/clinical/me/notes')
      .set('Authorization', `Bearer ${jugadorToken}`)
      .expect(200);
    expect(myNotesRes.body.notes).toHaveLength(1);
    expect(myNotesRes.body.notes[0].content).toBe('nota visible');

    const myAppointmentsRes = await request(app)
      .get('/api/clinical/me/appointments')
      .set('Authorization', `Bearer ${jugadorToken}`)
      .expect(200);
    expect(myAppointmentsRes.body.appointments).toHaveLength(1);
    expect(myAppointmentsRes.body.appointments[0].status).toBe('COMPLETED');
  });

  it('rejects scheduling for a non-JUGADOR player or a non-clinical-role practitioner', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const psicologo = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    const notAPlayer = await seedVerifiedUser();
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const notAPractitioner = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const adminToken = await login(app, admin.email, admin.password);

    const playerRes = await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: notAPlayer.id,
        practitionerId: psicologo.id,
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      })
      .expect(409);
    expect(playerRes.body.code).toBe('player_not_eligible');

    const practitionerRes = await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: jugador.id,
        practitionerId: notAPractitioner.id,
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      })
      .expect(409);
    expect(practitionerRes.body.code).toBe('practitioner_not_eligible');
  });

  it('unauthenticated requests get 401 everywhere', async () => {
    const psicologo = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });

    await request(app)
      .post('/api/admin/clinical/appointments')
      .send({
        playerId: jugador.id,
        practitionerId: psicologo.id,
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      })
      .expect(401);
    await request(app).get('/api/admin/clinical/appointments').expect(401);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .send({ noteType: 'FOLLOW_UP', visibility: 'PRIVATE', content: 'x' })
      .expect(401);
    await request(app).get(`/api/admin/clinical/players/${jugador.id}/notes`).expect(401);
    await request(app).get('/api/clinical/me/appointments').expect(401);
    await request(app).get('/api/clinical/me/notes').expect(401);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/recovery-plans`)
      .send({ title: 'x', visibility: 'PRIVATE' })
      .expect(401);
    await request(app).get(`/api/admin/clinical/players/${jugador.id}/recovery-plans`).expect(401);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/medical-history`)
      .send({ condition: 'x', visibility: 'PRIVATE' })
      .expect(401);
    await request(app).get(`/api/admin/clinical/players/${jugador.id}/medical-history`).expect(401);
    await request(app).get('/api/clinical/me/recovery-plans').expect(401);
    await request(app).get('/api/clinical/me/medical-history').expect(401);
  });

  it('a FISIOTERAPEUTA can schedule appointments and write notes, tagged with PHYSIOTHERAPY discipline', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const fisio = await seedVerifiedUser({ roleCode: ROLE_CODES.FISIOTERAPEUTA });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const fisioToken = await login(app, fisio.email, fisio.password);

    const scheduleRes = await request(app)
      .post('/api/admin/clinical/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: jugador.id,
        practitionerId: fisio.id,
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      })
      .expect(201);
    expect(scheduleRes.body.discipline).toBe('PHYSIOTHERAPY');

    const noteRes = await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({ noteType: 'SESSION_NOTE', visibility: 'PRIVATE', content: 'sesion de fisioterapia' })
      .expect(201);
    expect(noteRes.body.discipline).toBe('PHYSIOTHERAPY');
  });

  it('discipline siloing: a PSICOLOGO never sees Physiotherapy notes and a FISIOTERAPEUTA never sees Psychology notes', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const psicologo = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    const fisio = await seedVerifiedUser({ roleCode: ROLE_CODES.FISIOTERAPEUTA });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const psicologoToken = await login(app, psicologo.email, psicologo.password);
    const fisioToken = await login(app, fisio.email, fisio.password);

    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .send({ noteType: 'FOLLOW_UP', visibility: 'PLAYER_VISIBLE', content: 'nota de psicologia' })
      .expect(201);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({ noteType: 'GENERAL', visibility: 'PLAYER_VISIBLE', content: 'nota de fisioterapia' })
      .expect(201);

    const psychView = await request(app)
      .get(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .expect(200);
    expect(psychView.body.notes).toHaveLength(1);
    expect(psychView.body.notes[0].content).toBe('nota de psicologia');

    const physioView = await request(app)
      .get(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .expect(200);
    expect(physioView.body.notes).toHaveLength(1);
    expect(physioView.body.notes[0].content).toBe('nota de fisioterapia');

    // ADMINISTRADOR is still excluded from note content entirely, regardless of discipline.
    await request(app)
      .get(`/api/admin/clinical/players/${jugador.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('recovery plans and medical history are Fisioterapeuta-only -- ADMINISTRADOR and PSICOLOGO are both rejected', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const psicologo = await seedVerifiedUser({ roleCode: ROLE_CODES.PSICOLOGO });
    const fisio = await seedVerifiedUser({ roleCode: ROLE_CODES.FISIOTERAPEUTA });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const psicologoToken = await login(app, psicologo.email, psicologo.password);
    const fisioToken = await login(app, fisio.email, fisio.password);

    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/recovery-plans`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'x', visibility: 'PRIVATE' })
      .expect(403);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/recovery-plans`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .send({ title: 'x', visibility: 'PRIVATE' })
      .expect(403);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/medical-history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ condition: 'x', visibility: 'PRIVATE' })
      .expect(403);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/medical-history`)
      .set('Authorization', `Bearer ${psicologoToken}`)
      .send({ condition: 'x', visibility: 'PRIVATE' })
      .expect(403);

    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/recovery-plans`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({
        title: 'Rehabilitacion de rodilla',
        goal: 'Recuperar movilidad',
        visibility: 'PRIVATE',
      })
      .expect(201);
    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/medical-history`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({ condition: 'Esguince de tobillo', visibility: 'PRIVATE' })
      .expect(201);
  });

  it('full recovery plan lifecycle: create -> complete, and a separate plan discontinued with a reason, visible to the player only when PLAYER_VISIBLE', async () => {
    const fisio = await seedVerifiedUser({ roleCode: ROLE_CODES.FISIOTERAPEUTA });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const fisioToken = await login(app, fisio.email, fisio.password);
    const jugadorToken = await login(app, jugador.email, jugador.password);

    const planRes = await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/recovery-plans`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({ title: 'Rehabilitacion de rodilla', visibility: 'PLAYER_VISIBLE' })
      .expect(201);
    expect(planRes.body.status).toBe('ACTIVE');

    const privatePlanRes = await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/recovery-plans`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({ title: 'Plan privado', visibility: 'PRIVATE' })
      .expect(201);

    await request(app)
      .post(`/api/admin/clinical/recovery-plans/${planRes.body.id}/complete`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .expect(200);
    await request(app)
      .post(`/api/admin/clinical/recovery-plans/${privatePlanRes.body.id}/discontinue`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({ reason: 'jugador se mudo de ciudad' })
      .expect(200);

    const staffView = await request(app)
      .get(`/api/admin/clinical/players/${jugador.id}/recovery-plans`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .expect(200);
    expect(staffView.body.plans).toHaveLength(2);

    const myPlansRes = await request(app)
      .get('/api/clinical/me/recovery-plans')
      .set('Authorization', `Bearer ${jugadorToken}`)
      .expect(200);
    expect(myPlansRes.body.plans).toHaveLength(1);
    expect(myPlansRes.body.plans[0].title).toBe('Rehabilitacion de rodilla');
    expect(myPlansRes.body.plans[0].status).toBe('COMPLETED');
  });

  it('full medical history lifecycle: create -> resolve, visible to the player only when PLAYER_VISIBLE', async () => {
    const fisio = await seedVerifiedUser({ roleCode: ROLE_CODES.FISIOTERAPEUTA });
    const jugador = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const fisioToken = await login(app, fisio.email, fisio.password);
    const jugadorToken = await login(app, jugador.email, jugador.password);

    const entryRes = await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/medical-history`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({
        condition: 'Esguince de tobillo',
        description: 'Grado II',
        visibility: 'PLAYER_VISIBLE',
      })
      .expect(201);
    expect(entryRes.body.status).toBe('ACTIVE');

    await request(app)
      .post(`/api/admin/clinical/players/${jugador.id}/medical-history`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .send({ condition: 'condicion privada', visibility: 'PRIVATE' })
      .expect(201);

    await request(app)
      .post(`/api/admin/clinical/medical-history/${entryRes.body.id}/resolve`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .expect(200);

    const staffView = await request(app)
      .get(`/api/admin/clinical/players/${jugador.id}/medical-history`)
      .set('Authorization', `Bearer ${fisioToken}`)
      .expect(200);
    expect(staffView.body.entries).toHaveLength(2);

    const myHistoryRes = await request(app)
      .get('/api/clinical/me/medical-history')
      .set('Authorization', `Bearer ${jugadorToken}`)
      .expect(200);
    expect(myHistoryRes.body.entries).toHaveLength(1);
    expect(myHistoryRes.body.entries[0].condition).toBe('Esguince de tobillo');
    expect(myHistoryRes.body.entries[0].status).toBe('RESOLVED');
  });
});
