import { CommunityError } from './CommunityError.js';

/** Also thrown when a comment exists but the caller isn't its author --
 * same no-separate-forbidden-error precedent as PostNotFound. */
export class CommentNotFound extends CommunityError {
  constructor() {
    super('comment_not_found', 'No comment exists with that id.');
  }
}
