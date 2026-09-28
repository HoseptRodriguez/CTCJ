import { HttpError } from '../../../../shared/errors/httpError.js';
import { CommunityError } from '../../application/errors/CommunityError.js';

const STATUS_BY_CODE = {
  post_not_found: 404,
  comment_not_found: 404,
  content_not_found: 404,
  report_not_found: 404,
  report_already_pending: 409,
  player_not_eligible: 409,
  minor_media_not_allowed: 403,
  minor_pending_guardian_authorization: 403,
  daily_media_limit: 429,
  video_upload_unavailable: 409,
};

export function mapCommunityError(err) {
  if (err instanceof CommunityError) {
    // media_* (InvalidMedia) fall through to 400.
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
