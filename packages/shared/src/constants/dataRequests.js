/**
 * Requests of the data subject (Ley 1581 de 2012, arts. 14 y 15). A
 * consulta is answered within 10 business days; a reclamo (correction,
 * update, deletion, withdrawal of an authorization, or a breach) within
 * 15. Each gets a radicado so the person can follow it.
 */
export const DATA_REQUEST_TYPE = Object.freeze({
  CONSULTA: 'CONSULTA',
  RECLAMO: 'RECLAMO',
});

/** What the request is about; decides whether it's a consulta or a reclamo. */
export const DATA_REQUEST_KIND = Object.freeze({
  CONSULTA: 'CONSULTA',
  CORRECCION: 'CORRECCION',
  SUPRESION: 'SUPRESION',
  REVOCATORIA: 'REVOCATORIA',
  RECLAMO: 'RECLAMO',
});

export const DATA_REQUEST_KIND_LABELS = Object.freeze({
  CONSULTA: 'Consulta sobre mis datos',
  CORRECCION: 'Corregir o actualizar mis datos',
  SUPRESION: 'Eliminar mi cuenta',
  REVOCATORIA: 'Revocar una autorización',
  RECLAMO: 'Reclamo por el uso de mis datos',
});

export const DATA_REQUEST_TYPE_BY_KIND = Object.freeze({
  CONSULTA: DATA_REQUEST_TYPE.CONSULTA,
  CORRECCION: DATA_REQUEST_TYPE.RECLAMO,
  SUPRESION: DATA_REQUEST_TYPE.RECLAMO,
  REVOCATORIA: DATA_REQUEST_TYPE.RECLAMO,
  RECLAMO: DATA_REQUEST_TYPE.RECLAMO,
});

/** Business days to answer (arts. 14 y 15). [VERIFICAR] extensions (+5 / +8). */
export const DATA_REQUEST_DEADLINE_BUSINESS_DAYS = Object.freeze({
  CONSULTA: 10,
  RECLAMO: 15,
});

/** With this many business days left or fewer, the inbox warns. */
export const DATA_REQUEST_DUE_SOON_BUSINESS_DAYS = 3;

export const DATA_REQUEST_STATUS = Object.freeze({
  RECIBIDA: 'RECIBIDA',
  EN_TRAMITE: 'EN_TRAMITE',
  RESPONDIDA: 'RESPONDIDA',
});

export const DATA_REQUEST_STATUS_LABELS = Object.freeze({
  RECIBIDA: 'Recibida',
  EN_TRAMITE: 'En trámite',
  RESPONDIDA: 'Respondida',
});
