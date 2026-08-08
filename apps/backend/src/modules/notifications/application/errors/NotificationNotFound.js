import { NotificationsError } from './NotificationsError.js';

/** Also thrown when a notification exists but belongs to someone else -- a
 * notification only ever exists from its own recipient's point of view,
 * matching goals' identical GoalNotFound precedent (no separate "forbidden"
 * error for a row that belongs to someone else). */
export class NotificationNotFound extends NotificationsError {
  constructor() {
    super('notification_not_found', 'No notification exists with that id.');
  }
}
