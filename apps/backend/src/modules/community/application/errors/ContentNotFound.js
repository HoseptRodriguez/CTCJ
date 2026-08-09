import { CommunityError } from './CommunityError.js';

/** Thrown by reportContent.js/deleteContentAsStaff.js when the target
 * (POST or COMMENT) doesn't exist -- generic over both, since those two
 * use cases are themselves generic over targetType. */
export class ContentNotFound extends CommunityError {
  constructor() {
    super('content_not_found', 'No post or comment exists with that id.');
  }
}
