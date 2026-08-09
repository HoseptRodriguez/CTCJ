import { CommunityError } from './CommunityError.js';

/** Also thrown when a post exists but the caller isn't its author (for the
 * self-service delete path) -- a post only ever exists from its own
 * author's point of view there, matching challenges'/goals' identical
 * *NotFound precedent (no separate "forbidden" error for a row that isn't
 * yours). Staff moderation deletes go through deleteContentAsStaff.js
 * instead, which doesn't apply this ownership filter. */
export class PostNotFound extends CommunityError {
  constructor() {
    super('post_not_found', 'No post exists with that id.');
  }
}
