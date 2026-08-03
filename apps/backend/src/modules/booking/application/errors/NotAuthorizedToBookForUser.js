import { DomainError } from '../../domain/errors/DomainError.js';

/**
 * Thrown by createHold when the caller books for a different holderUserId
 * without an approved, canBook-enabled guardianship link (Phase 6). Must
 * extend booking's own DomainError -- mapBookingError only special-cases
 * DomainError instances, so a bare Error here would surface as a 500.
 */
export class NotAuthorizedToBookForUser extends DomainError {
  constructor() {
    super(
      'not_authorized_to_book_for_user',
      'You are not authorized to create a reservation on behalf of this user.',
    );
  }
}
