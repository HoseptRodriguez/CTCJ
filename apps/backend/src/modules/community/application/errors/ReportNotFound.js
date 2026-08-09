import { CommunityError } from './CommunityError.js';

/** Thrown by dismissReport.js for an unknown or already-resolved report id. */
export class ReportNotFound extends CommunityError {
  constructor() {
    super('report_not_found', 'No pending report exists with that id.');
  }
}
