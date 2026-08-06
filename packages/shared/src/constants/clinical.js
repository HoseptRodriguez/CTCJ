export const CLINICAL_APPOINTMENT_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
});

export const CLINICAL_NOTE_TYPE = Object.freeze({
  FOLLOW_UP: 'FOLLOW_UP',
  RECOMMENDATION: 'RECOMMENDATION',
  SESSION_NOTE: 'SESSION_NOTE',
  GENERAL: 'GENERAL',
});

export const CLINICAL_NOTE_VISIBILITY = Object.freeze({
  PRIVATE: 'PRIVATE',
  PLAYER_VISIBLE: 'PLAYER_VISIBLE',
});

// Phase 15 (Physiotherapy) -----------------------------------------------

export const CLINICAL_DISCIPLINE = Object.freeze({
  PSYCHOLOGY: 'PSYCHOLOGY',
  PHYSIOTHERAPY: 'PHYSIOTHERAPY',
});

export const RECOVERY_PLAN_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  DISCONTINUED: 'DISCONTINUED',
});

export const MEDICAL_HISTORY_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
});
