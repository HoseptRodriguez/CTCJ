import { DomainError } from '../../domain/errors/DomainError.js';

/** Health data can't be recorded without the player's (or guardian's) explicit authorization. */
export class HealthAuthorizationRequired extends DomainError {
  constructor() {
    super(
      'health_authorization_required',
      'El jugador no ha autorizado el tratamiento de sus datos de salud. Puede darla en Mi CTCJ, en «Mis datos y privacidad» (si es menor de edad, la da su acudiente).',
    );
  }
}
