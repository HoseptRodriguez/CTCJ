/** Kinds of authorization kept as proof in the `consents` table (Ley 1581 de 2012). */
export const CONSENT_TYPE = Object.freeze({
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  TERMS: 'TERMS',
  MARKETING: 'MARKETING',
  MINOR_DATA_IMAGE: 'MINOR_DATA_IMAGE',
  HEALTH_DATA: 'HEALTH_DATA',
  COMMUNITY_RULES: 'COMMUNITY_RULES',
  COOKIES: 'COOKIES',
  MINOR_PUBLIC_NAME: 'MINOR_PUBLIC_NAME',
});

export const CONSENT_ACTION = Object.freeze({
  ACCEPTED: 'ACCEPTED',
  WITHDRAWN: 'WITHDRAWN',
});

/**
 * The guardian's authorization for the data and image of a linked minor.
 * Draft wording: it must be reviewed by a Colombian lawyer before
 * publishing (docs/LEGAL_PENDIENTES.md). A new wording = a new version.
 */
export const MINOR_AUTHORIZATION = Object.freeze({
  VERSION: '1',
  TITLE: 'Autorización del acudiente para los datos y la imagen del menor',
  TEXT: [
    'Como acudiente o representante legal del menor, autorizo al club a tratar sus datos personales para crear y usar su cuenta, sus reservas, su seguimiento deportivo y su participación en la Comunidad, según la Política de Tratamiento de Datos Personales.',
    'Entiendo que en la Comunidad el menor solo puede publicar texto, y que cualquier foto o video en el que aparezca necesita esta autorización.',
    'Puedo retirar esta autorización en cualquier momento desde mi perfil. Al retirarla, la cuenta del menor vuelve a quedar pendiente: puede entrar y ver información, pero no reservar ni publicar.',
  ],
});
