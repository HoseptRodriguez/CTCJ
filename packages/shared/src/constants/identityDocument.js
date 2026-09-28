/**
 * Identity document of a player: optional, never asked at public sign-up.
 * Reception fills it only when needed (an electronic invoice in the
 * player's name, or registration in league tournaments).
 */
export const DOCUMENT_TYPE = Object.freeze({
  CC: 'CC',
  TI: 'TI',
  CE: 'CE',
  PA: 'PA',
  NIT: 'NIT',
});

export const DOCUMENT_TYPE_LABELS = Object.freeze({
  CC: 'Cédula de ciudadanía',
  TI: 'Tarjeta de identidad',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
  NIT: 'NIT',
});
