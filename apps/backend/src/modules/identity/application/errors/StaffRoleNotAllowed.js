import { DomainError } from '../../domain/errors/DomainError.js';

/** Not a staff role (only Administración, Recepción, entrenadores y salud). */
export class StaffRoleNotAllowed extends DomainError {
  constructor() {
    super('staff_role_not_allowed', 'Ese rol no se asigna desde aquí.');
  }
}

/** A staff role needs an active account with a confirmed email. */
export class StaffRoleNeedsActiveAccount extends DomainError {
  constructor() {
    super(
      'staff_role_needs_active_account',
      'La cuenta debe estar activa y con el correo confirmado para darle un rol del personal.',
    );
  }
}
