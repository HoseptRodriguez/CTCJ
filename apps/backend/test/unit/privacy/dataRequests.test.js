import { describe, expect, it } from 'vitest';

import { createDataRequestUseCases } from '../../../src/modules/privacy/application/useCases/dataRequests.js';
import { DataRequestAlreadyAnswered } from '../../../src/modules/privacy/application/errors/DataRequestAlreadyAnswered.js';
import { DeletionRequestAlreadyOpen } from '../../../src/modules/privacy/application/errors/DeletionRequestAlreadyOpen.js';
import { EraseOnlyForDeletionRequest } from '../../../src/modules/privacy/application/errors/EraseOnlyForDeletionRequest.js';
import { deadlineState } from '../../../src/modules/privacy/domain/policies/deadline.js';

function createFakeRepository() {
  const rows = [];
  let seq = 0;
  return {
    rows,
    async nextRadicado(year) {
      seq += 1;
      return `CTCJ-${year}-${String(seq).padStart(5, '0')}`;
    },
    async create(r) {
      rows.push({
        answer: null,
        answeredAt: null,
        answeredBy: null,
        accountAnonymizedAt: null,
        ...r,
      });
      return { ...rows.at(-1) };
    },
    async findById(id) {
      const r = rows.find((x) => x.id === id);
      return r ? { ...r } : null;
    },
    async listByUser(userId) {
      return rows.filter((r) => r.userId === userId).reverse();
    },
    async list({ openOnly }) {
      return rows.filter((r) => !openOnly || r.status !== 'RESPONDIDA');
    },
    async update(r) {
      const i = rows.findIndex((x) => x.id === r.id);
      rows[i] = { ...r };
      return { ...r };
    },
  };
}

function setup(now = new Date('2026-09-28T15:00:00Z')) {
  const clock = { now: () => now, set: (d) => (now = d) };
  const erased = [];
  const repo = createFakeRepository();
  const useCases = createDataRequestUseCases({
    dataRequestRepository: repo,
    personDirectory: {
      async getSummaries() {
        return new Map([['u1', { firstName: 'Ana', lastName: 'Ruiz', email: 'ana@x.co' }]]);
      },
    },
    accountEraser: {
      async eraseAccount(userId) {
        erased.push(userId);
      },
    },
    clock,
    clubId: 'club-1',
  });
  return { ...useCases, repo, erased, clock };
}

describe('data subject requests', () => {
  it('a consulta gets a radicado and 10 business days; a reclamo, 15', async () => {
    const { submitDataRequest } = setup();
    const consulta = await submitDataRequest({
      userId: 'u1',
      kind: 'CONSULTA',
      description: '¿Qué datos tienen de mí?',
    });
    expect(consulta).toMatchObject({
      radicado: 'CTCJ-2026-00001',
      requestType: 'CONSULTA',
      status: 'RECIBIDA',
      dueOn: '2026-10-13',
      alert: 'ON_TIME',
      businessDaysLeft: 10,
    });
    const reclamo = await submitDataRequest({
      userId: 'u1',
      kind: 'CORRECCION',
      description: 'Mi teléfono está mal escrito.',
    });
    expect(reclamo).toMatchObject({ requestType: 'RECLAMO', dueOn: '2026-10-20' });
  });

  it('warns when 3 business days or fewer are left, and once overdue', () => {
    const open = { status: 'RECIBIDA', dueOn: '2026-10-13' };
    // Monday 12 Oct is a holiday: from Tue 6 Oct there are 4 business days left.
    expect(deadlineState(open, new Date('2026-10-06T15:00:00Z')).alert).toBe('ON_TIME');
    expect(deadlineState(open, new Date('2026-10-07T15:00:00Z'))).toEqual({
      alert: 'DUE_SOON',
      businessDaysLeft: 3,
    });
    expect(deadlineState(open, new Date('2026-10-13T15:00:00Z')).alert).toBe('DUE_SOON');
    expect(deadlineState(open, new Date('2026-10-14T15:00:00Z'))).toEqual({
      alert: 'OVERDUE',
      businessDaysLeft: -1,
    });
    expect(deadlineState({ ...open, status: 'RESPONDIDA' }, new Date()).alert).toBe('ANSWERED');
  });

  it('the inbox says who asked', async () => {
    const { submitDataRequest, listDataRequests } = setup();
    await submitDataRequest({ userId: 'u1', kind: 'RECLAMO', description: 'Me llegó publicidad.' });
    const [row] = await listDataRequests({ openOnly: true });
    expect(row.requester).toEqual({ firstName: 'Ana', lastName: 'Ruiz', email: 'ana@x.co' });
  });

  it('answering: in progress first, then answered; never twice', async () => {
    const { submitDataRequest, answerDataRequest } = setup();
    const r = await submitDataRequest({
      userId: 'u1',
      kind: 'CONSULTA',
      description: '¿Para qué usan mi fecha de nacimiento?',
    });
    const inProgress = await answerDataRequest({
      id: r.id,
      staffUserId: 'adm',
      status: 'EN_TRAMITE',
    });
    expect(inProgress).toMatchObject({ status: 'EN_TRAMITE', answeredAt: null });
    const answered = await answerDataRequest({
      id: r.id,
      staffUserId: 'adm',
      status: 'RESPONDIDA',
      answer: 'Para saber si eres menor de edad.',
    });
    expect(answered).toMatchObject({ status: 'RESPONDIDA', alert: 'ANSWERED', answeredBy: 'adm' });
    await expect(
      answerDataRequest({ id: r.id, staffUserId: 'adm', status: 'RESPONDIDA', answer: 'Otra vez' }),
    ).rejects.toBeInstanceOf(DataRequestAlreadyAnswered);
  });

  it('only a deletion request, when answered, deletes the account; one open at a time', async () => {
    const { submitDataRequest, answerDataRequest, erased } = setup();
    const consulta = await submitDataRequest({
      userId: 'u1',
      kind: 'CONSULTA',
      description: 'Hola, una duda.',
    });
    await expect(
      answerDataRequest({
        id: consulta.id,
        staffUserId: 'adm',
        status: 'RESPONDIDA',
        answer: 'Listo.',
        eraseAccount: true,
      }),
    ).rejects.toBeInstanceOf(EraseOnlyForDeletionRequest);

    const deletion = await submitDataRequest({
      userId: 'u1',
      kind: 'SUPRESION',
      description: 'Quiero eliminar mi cuenta.',
    });
    await expect(
      submitDataRequest({ userId: 'u1', kind: 'SUPRESION', description: 'Otra vez, eliminar.' }),
    ).rejects.toBeInstanceOf(DeletionRequestAlreadyOpen);

    const done = await answerDataRequest({
      id: deletion.id,
      staffUserId: 'adm',
      status: 'RESPONDIDA',
      answer: 'Eliminamos tu cuenta; conservamos las facturas por obligación legal.',
      eraseAccount: true,
    });
    expect(erased).toEqual(['u1']);
    expect(done.accountAnonymizedAt).toBeInstanceOf(Date);
  });
});
