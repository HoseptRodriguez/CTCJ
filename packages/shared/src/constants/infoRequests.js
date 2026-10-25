/** "Solicitar información" (home and program pages) and the staff inbox. */
export const INFO_REQUEST_PROGRAM = Object.freeze({
  ADULTOS: 'ADULTOS',
  ESCUELA_INFANTIL: 'ESCUELA_INFANTIL',
  COMPETENCIA: 'COMPETENCIA',
  NO_SEGURO: 'NO_SEGURO',
});

export const INFO_REQUEST_PROGRAM_LABELS = Object.freeze({
  ADULTOS: 'Adultos',
  ESCUELA_INFANTIL: 'Escuela infantil',
  COMPETENCIA: 'Competencia',
  NO_SEGURO: 'No estoy seguro',
});

export const INFO_REQUEST_FOR = Object.freeze({ SELF: 'SELF', CHILD: 'CHILD' });

export const INFO_REQUEST_TIMES = Object.freeze({
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
  FIN_DE_SEMANA: 'Fin de semana',
});

export const INFO_REQUEST_STATUS = Object.freeze({
  NUEVA: 'NUEVA',
  CONTACTADA: 'CONTACTADA',
  INSCRITA: 'INSCRITA',
  DESCARTADA: 'DESCARTADA',
});

export const INFO_REQUEST_STATUS_LABELS = Object.freeze({
  NUEVA: 'Nueva',
  CONTACTADA: 'Contactada',
  INSCRITA: 'Inscrita',
  DESCARTADA: 'Descartada',
});

export const INFO_REQUEST_MESSAGE_MAX = 500;

/** Minimum seconds between getting the form and sending it (bots are faster). */
export const INFO_REQUEST_MIN_FILL_SECONDS = 3;

/**
 * A Colombian number: mobile (10 digits starting with 3) or landline
 * (10 digits starting with 60), with or without +57. Returns "+57XXXXXXXXXX"
 * or null.
 */
export function normalizeColombianPhone(text) {
  let digits = String(text ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2);
  if (!/^(3\d{9}|60\d{8})$/.test(digits)) return null;
  return `+57${digits}`;
}
