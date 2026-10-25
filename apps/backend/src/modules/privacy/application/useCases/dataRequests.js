import { randomUUID } from 'node:crypto';

import {
  DATA_REQUEST_KIND,
  DATA_REQUEST_STATUS,
  DATA_REQUEST_TYPE_BY_KIND,
  clubDateOf,
} from '@ctcj/shared';

import { deadlineState, dueOnFor } from '../../domain/policies/deadline.js';
import { DataRequestAlreadyAnswered } from '../errors/DataRequestAlreadyAnswered.js';
import { DataRequestNotFound } from '../errors/DataRequestNotFound.js';
import { DeletionRequestAlreadyOpen } from '../errors/DeletionRequestAlreadyOpen.js';
import { EraseOnlyForDeletionRequest } from '../errors/EraseOnlyForDeletionRequest.js';

/**
 * Consultas y reclamos about personal data (Ley 1581 de 2012, arts. 14 y
 * 15): the person files them from "Mis datos y privacidad" and gets a
 * radicado; the club answers from its inbox within 10 (consulta) or 15
 * (reclamo) business days, with a warning when the deadline is near.
 * Answering a deletion request can delete (anonymize) the account.
 *
 * @param {{
 *   dataRequestRepository: import('../ports/DataRequestRepository.js').DataRequestRepository,
 *   personDirectory: import('../ports/PersonDirectory.js').PersonDirectory,
 *   accountEraser: import('../ports/AccountEraser.js').AccountEraser,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createDataRequestUseCases({
  dataRequestRepository,
  personDirectory,
  accountEraser,
  clock,
  clubId,
}) {
  function view(request, now) {
    return { ...request, ...deadlineState(request, now) };
  }

  return {
    /** @param {{ userId: string, kind: string, description: string }} input */
    async submitDataRequest({ userId, kind, description }) {
      if (kind === DATA_REQUEST_KIND.SUPRESION) {
        const mine = await dataRequestRepository.listByUser(userId);
        const open = mine.some(
          (r) =>
            r.kind === DATA_REQUEST_KIND.SUPRESION && r.status !== DATA_REQUEST_STATUS.RESPONDIDA,
        );
        if (open) throw new DeletionRequestAlreadyOpen();
      }
      const now = clock.now();
      const requestType = DATA_REQUEST_TYPE_BY_KIND[kind];
      const created = await dataRequestRepository.create({
        id: randomUUID(),
        clubId,
        radicado: await dataRequestRepository.nextRadicado(Number(clubDateOf(now).slice(0, 4))),
        userId,
        requestType,
        kind,
        description,
        status: DATA_REQUEST_STATUS.RECIBIDA,
        receivedAt: now,
        dueOn: dueOnFor(requestType, now),
      });
      return view(created, now);
    },

    /** @param {{ userId: string }} input newest first */
    async listMyDataRequests({ userId }) {
      const now = clock.now();
      return (await dataRequestRepository.listByUser(userId)).map((r) => view(r, now));
    },

    /**
     * The club's inbox: open ones first by deadline, with who asked.
     * @param {{ openOnly?: boolean }} input
     */
    async listDataRequests({ openOnly = false } = {}) {
      const now = clock.now();
      const rows = await dataRequestRepository.list({ clubId, openOnly });
      const people = await personDirectory.getSummaries([...new Set(rows.map((r) => r.userId))]);
      return rows.map((r) => ({ ...view(r, now), requester: people.get(r.userId) ?? null }));
    },

    /**
     * @param {{ id: string, staffUserId: string, status: string, answer?: string,
     *   eraseAccount?: boolean }} input
     */
    async answerDataRequest({ id, staffUserId, status, answer, eraseAccount = false }) {
      const request = await dataRequestRepository.findById(id);
      if (!request || request.clubId !== clubId) throw new DataRequestNotFound();
      if (request.status === DATA_REQUEST_STATUS.RESPONDIDA) throw new DataRequestAlreadyAnswered();
      if (
        eraseAccount &&
        (request.kind !== DATA_REQUEST_KIND.SUPRESION || status !== DATA_REQUEST_STATUS.RESPONDIDA)
      ) {
        throw new EraseOnlyForDeletionRequest();
      }
      const now = clock.now();
      if (eraseAccount) {
        await accountEraser.eraseAccount(request.userId);
      }
      const updated = await dataRequestRepository.update({
        ...request,
        status,
        answer: answer ?? request.answer ?? null,
        answeredAt: status === DATA_REQUEST_STATUS.RESPONDIDA ? now : null,
        answeredBy: staffUserId,
        accountAnonymizedAt: eraseAccount ? now : request.accountAnonymizedAt,
      });
      return view(updated, now);
    },
  };
}
