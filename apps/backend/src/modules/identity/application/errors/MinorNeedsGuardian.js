import { DomainError } from '../../domain/errors/DomainError.js';

/** A minor can't give this authorization by themselves: their guardian gives it. */
export class MinorNeedsGuardian extends DomainError {
  constructor() {
    super(
      'minor_needs_guardian',
      'Esta autorización la da tu acudiente desde su perfil («Cuentas vinculadas»).',
    );
  }
}
