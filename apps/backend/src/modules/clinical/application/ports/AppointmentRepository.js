/**
 * @typedef {import('../../domain/entities/ClinicalAppointment.js').ClinicalAppointment} ClinicalAppointment
 */
export class AppointmentRepository {
  /** Persists a new SCHEDULED appointment. Translates a DB exclusion-
   * constraint violation (SQLSTATE 23P01) into PractitionerTimeConflict.
   * @returns {Promise<ClinicalAppointment>} */
  async create(_appointment) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ClinicalAppointment|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Persists cancel()/markCompleted()/markNoShow() field changes. @returns {Promise<ClinicalAppointment>} */
  async update(_appointment) {
    throw new Error('Not implemented');
  }

  /**
   * @param {{ playerId?: string, practitionerId?: string }} filters
   * @returns {Promise<ClinicalAppointment[]>} newest first, bare scheduling fields only
   */
  async list(_filters) {
    throw new Error('Not implemented');
  }
}
