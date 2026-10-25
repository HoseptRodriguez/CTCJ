import { CommunityError } from './CommunityError.js';

/** Posting, commenting or uploading needs the Community rules accepted first. */
export class CommunityRulesNotAccepted extends CommunityError {
  constructor() {
    super(
      'community_rules_not_accepted',
      'Antes de publicar o comentar, acepta las reglas de la Comunidad.',
    );
  }
}
