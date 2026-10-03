import { HttpError } from '../../../../shared/errors/httpError.js';
import { NotificationsError } from '../../application/errors/NotificationsError.js';

const STATUS_BY_CODE = {
  notification_not_found: 404,
  announcement_not_found: 404,
  announcement_not_cancellable: 409,
  outside_promotional_hours: 422,
  announcement_invalid: 400,
  unsubscribe_link_invalid: 400,
};

export function mapNotificationsError(err) {
  if (err instanceof NotificationsError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    const mapped = new HttpError(status, err.code, err.message);
    // The next allowed time, so the console can offer it.
    if (err.suggestedTime) mapped.details = { suggestedTime: err.suggestedTime };
    return mapped;
  }
  return err;
}
