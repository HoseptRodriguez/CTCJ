import { HttpError } from '../../../../shared/errors/httpError.js';
import { NotificationsError } from '../../application/errors/NotificationsError.js';

const STATUS_BY_CODE = {
  notification_not_found: 404,
};

export function mapNotificationsError(err) {
  if (err instanceof NotificationsError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
