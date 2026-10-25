/**
 * Cuentas de prueba (una por rol) para capturas de pantalla y demostraciones.
 * Las crea prisma/seedTestUsers.js; las usa scripts/screenshots.js.
 *
 * Todas llevan isDemo = true: el servidor se niega a arrancar en producción
 * mientras exista alguna (ver checkDemoAccounts.js), así que nunca pueden
 * llegar a producción por accidente. Solo para desarrollo.
 */
export const TEST_PASSWORD = 'PruebaCtcj2026';

/**
 * Secreto TOTP (base32) de las cuentas de personal que exigen verificación en
 * dos pasos (MFA_ENFORCE_STAFF). Público a propósito: son cuentas de prueba.
 */
export const TEST_TOTP_SECRET = 'JBSWY3DPEHPK3PXPCTCJPRUEBASDEMOX';

export const TEST_USERS = Object.freeze([
  {
    key: 'usuario',
    email: 'usuario.prueba@ctcj.test',
    firstName: 'Ulises',
    lastName: 'Prueba',
    roles: ['USUARIO'],
  },
  {
    key: 'jugador',
    email: 'jugador.prueba@ctcj.test',
    firstName: 'Juliana',
    lastName: 'Prueba',
    roles: ['USUARIO', 'JUGADOR'],
    membershipStatus: 'ACTIVE',
  },
  {
    key: 'padre',
    email: 'padre.prueba@ctcj.test',
    firstName: 'Pablo',
    lastName: 'Prueba',
    roles: ['USUARIO', 'PADRE_TUTOR'],
  },
  {
    key: 'entrenador',
    email: 'entrenador.prueba@ctcj.test',
    firstName: 'Ernesto',
    lastName: 'Prueba',
    roles: ['USUARIO', 'ENTRENADOR'],
  },
  {
    key: 'recepcion',
    email: 'recepcion.prueba@ctcj.test',
    firstName: 'Rebeca',
    lastName: 'Prueba',
    roles: ['USUARIO', 'RECEPCION'],
  },
  {
    key: 'psicologo',
    email: 'psicologo.prueba@ctcj.test',
    firstName: 'Paula',
    lastName: 'Prueba',
    roles: ['USUARIO', 'PSICOLOGO'],
    mfa: true,
  },
  {
    key: 'neuropsicologo',
    email: 'neuropsicologo.prueba@ctcj.test',
    firstName: 'Nicolás',
    lastName: 'Prueba',
    roles: ['USUARIO', 'NEUROPSICOLOGO'],
    mfa: true,
  },
  {
    key: 'fisioterapeuta',
    email: 'fisioterapeuta.prueba@ctcj.test',
    firstName: 'Fernanda',
    lastName: 'Prueba',
    roles: ['USUARIO', 'FISIOTERAPEUTA'],
    mfa: true,
  },
  {
    key: 'admin',
    email: 'admin.prueba@ctcj.test',
    firstName: 'Andrés',
    lastName: 'Prueba',
    roles: ['USUARIO', 'ADMINISTRADOR'],
    mfa: true,
  },
]);
