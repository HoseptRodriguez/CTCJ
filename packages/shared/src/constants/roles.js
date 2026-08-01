/**
 * Canonical role catalog, ported from v7 (docs/roles/MATRIZ-DE-PERMISOS.md).
 * Only USUARIO is self-assignable; every other role requires an admin grant,
 * enforced independently at the domain layer (see identity/domain/services/grantRole.js).
 */
export const ROLE_CODES = Object.freeze({
  USUARIO: 'USUARIO',
  JUGADOR: 'JUGADOR',
  PADRE_TUTOR: 'PADRE_TUTOR',
  ENTRENADOR: 'ENTRENADOR',
  RECEPCION: 'RECEPCION',
  PSICOLOGO: 'PSICOLOGO',
  NEUROPSICOLOGO: 'NEUROPSICOLOGO',
  FISIOTERAPEUTA: 'FISIOTERAPEUTA',
  ADMINISTRADOR: 'ADMINISTRADOR',
});

export const ROLE_DEFINITIONS = Object.freeze([
  { code: ROLE_CODES.USUARIO, name: 'Usuario', selfAssignable: true, requiresMfa: false },
  { code: ROLE_CODES.JUGADOR, name: 'Jugador', selfAssignable: false, requiresMfa: false },
  {
    code: ROLE_CODES.PADRE_TUTOR,
    name: 'Padre/Tutor',
    selfAssignable: false,
    requiresMfa: false,
  },
  { code: ROLE_CODES.ENTRENADOR, name: 'Entrenador', selfAssignable: false, requiresMfa: false },
  { code: ROLE_CODES.RECEPCION, name: 'Recepcion', selfAssignable: false, requiresMfa: false },
  { code: ROLE_CODES.PSICOLOGO, name: 'Psicologo', selfAssignable: false, requiresMfa: true },
  {
    code: ROLE_CODES.NEUROPSICOLOGO,
    name: 'Neuropsicologo',
    selfAssignable: false,
    requiresMfa: true,
  },
  {
    code: ROLE_CODES.FISIOTERAPEUTA,
    name: 'Fisioterapeuta',
    selfAssignable: false,
    requiresMfa: true,
  },
  {
    code: ROLE_CODES.ADMINISTRADOR,
    name: 'Administrador',
    selfAssignable: false,
    requiresMfa: true,
  },
]);

export function isSelfAssignableRole(code) {
  const def = ROLE_DEFINITIONS.find((r) => r.code === code);
  return def ? def.selfAssignable : false;
}
