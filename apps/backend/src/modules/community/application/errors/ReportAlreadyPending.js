import { CommunityError } from './CommunityError.js';

/** Thrown when this reporter already has a PENDING report on this exact
 * target -- mirrors challenges' ChallengeAlreadyPending precedent (one
 * pending row per pair, DB-backed by a matching partial unique index). */
export class ReportAlreadyPending extends CommunityError {
  constructor() {
    super('report_already_pending', 'You already have a pending report on this content.');
  }
}
