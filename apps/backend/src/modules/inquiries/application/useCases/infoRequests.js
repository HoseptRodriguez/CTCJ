import { randomUUID } from 'node:crypto';

import {
  INFO_REQUEST_FOR,
  INFO_REQUEST_MIN_FILL_SECONDS,
  INFO_REQUEST_STATUS,
  normalizeColombianPhone,
} from '@ctcj/shared';

import { FormTokenInvalid } from '../errors/FormTokenInvalid.js';
import { InfoRequestNotFound } from '../errors/InfoRequestNotFound.js';

/** A form token older than this is refused (the page was left open too long). */
const FORM_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * "Solicitar información": the public form and the staff inbox.
 *
 * Anti-spam without third parties:
 *   - a signed form token from the server: the form must be sent at least
 *     INFO_REQUEST_MIN_FILL_SECONDS after it was loaded (and within 2 hours);
 *   - a trap field ("website") hidden from people: if it comes filled, the
 *     answer looks like a success but nothing is stored or sent;
 *   - a limit of sends per IP (at the route).
 *
 * Only the child's AGE is kept, never their name. The proof of the
 * authorization goes to info_request_consents (the person has no account).
 *
 * @param {{
 *   infoRequestRepository: import('../ports/InfoRequestRepository.js').InfoRequestRepository,
 *   formTokens: import('../ports/FormTokenService.js').FormTokenService,
 *   mailer: import('../ports/InquiryMailer.js').InquiryMailer,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 *   privacyVersion: string,
 *   marketingVersion: string,
 *   onMailError?: (err: Error) => void,
 * }} deps
 */
export function createInfoRequestUseCases({
  infoRequestRepository,
  formTokens,
  mailer,
  clock,
  clubId,
  privacyVersion,
  marketingVersion,
  onMailError = () => {},
}) {
  async function findOrFail(id) {
    const request = await infoRequestRepository.findById(id);
    if (!request || request.clubId !== clubId) throw new InfoRequestNotFound();
    return request;
  }

  return {
    /** A new token for the form, when the page loads. */
    issueFormToken() {
      return { formToken: formTokens.issue(clock.now()) };
    },

    /**
     * @param {object} input the validated form (infoRequestSchema)
     * @returns {Promise<{ received: true }>} the same answer for people and bots
     */
    async submitInfoRequest(input) {
      const now = clock.now();
      const issuedAt = formTokens.verify(input.formToken);
      const age = issuedAt ? now.getTime() - issuedAt.getTime() : -1;
      if (age < INFO_REQUEST_MIN_FILL_SECONDS * 1000 || age > FORM_TOKEN_MAX_AGE_MS) {
        throw new FormTokenInvalid();
      }
      // Trap field filled: a bot. Look normal, keep nothing.
      if (input.website) return { received: true };

      const forChild = input.forWhom === INFO_REQUEST_FOR.CHILD;
      const request = {
        id: randomUUID(),
        clubId,
        fullName: input.fullName.trim(),
        phone: normalizeColombianPhone(input.phone),
        email: input.email ? input.email.trim().toLowerCase() : null,
        program: input.program,
        forWhom: input.forWhom,
        childAge: forChild ? input.childAge : null,
        preferredTimes: [...new Set(input.preferredTimes ?? [])],
        message: input.message ? input.message.trim() : null,
        marketingOptIn: input.marketing === true,
        createdAt: now,
      };
      await infoRequestRepository.create(request, {
        consents: [
          { consentType: 'INFO_REQUEST_PRIVACY', documentVersion: privacyVersion },
          ...(request.marketingOptIn
            ? [{ consentType: 'MARKETING', documentVersion: marketingVersion }]
            : []),
        ],
      });

      // The request is saved; a failed email must not lose it.
      await Promise.all([
        request.email ? mailer.sendConfirmation(request).catch(onMailError) : Promise.resolve(),
        mailer.notifyClub(request).catch(onMailError),
      ]);
      return { received: true };
    },

    /** @param {{ status?: string, program?: string }} filters newest first */
    async listInfoRequests(filters = {}) {
      return infoRequestRepository.list({ clubId, ...filters });
    },

    async countNewInfoRequests() {
      return {
        count: await infoRequestRepository.countByStatus(clubId, INFO_REQUEST_STATUS.NUEVA),
      };
    },

    /** @param {{ id: string, status: string, staffUserId: string }} input */
    async setInfoRequestStatus({ id, status, staffUserId }) {
      await findOrFail(id);
      return infoRequestRepository.update(id, {
        status,
        handledBy: staffUserId,
        handledAt: clock.now(),
      });
    },

    /** @param {{ id: string, text: string, staffUserId: string }} input */
    async addInfoRequestNote({ id, text, staffUserId }) {
      await findOrFail(id);
      await infoRequestRepository.addNote(id, {
        text,
        authorId: staffUserId,
        createdAt: clock.now(),
      });
      return infoRequestRepository.update(id, { handledBy: staffUserId, handledAt: clock.now() });
    },

    /**
     * Deletes discarded requests and those never answered (still "Nueva")
     * older than `months`. Without a period set by the club, it deletes
     * nothing. The proof of the authorization is kept (without the data).
     * @param {{ months: number|null }} input
     */
    async purgeOldInfoRequests({ months }) {
      if (!months) return { deleted: 0 };
      const cutoff = new Date(clock.now());
      cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
      const deleted = await infoRequestRepository.deleteOlderThan(clubId, cutoff, [
        INFO_REQUEST_STATUS.DESCARTADA,
        INFO_REQUEST_STATUS.NUEVA,
      ]);
      return { deleted };
    },
  };
}
