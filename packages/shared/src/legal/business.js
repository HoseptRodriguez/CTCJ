/**
 * Business details shown in the footer and in the legal pages (Ley 1480 de
 * 2011, art. 50). Nothing here is invented: every value the club hasn't
 * provided is a [COMPLETAR] marker, and `npm run legal:check` blocks a
 * production build while any is left (docs/LEGAL_PENDIENTES.md).
 */
export const BUSINESS = Object.freeze({
  commercialName: 'Club de Tenis Ciudad Jardín',
  legalName: '[COMPLETAR: razón social]',
  nit: '[COMPLETAR: NIT]',
  legalRepresentative: '[COMPLETAR: representante legal]',
  address: 'Kilómetro 1 vía Fusagasugá – Tibacuy, junto al Conjunto Toscana',
  city: 'Fusagasugá, Cundinamarca, Colombia',
  noticesAddress: '[COMPLETAR: dirección de notificaciones]',
  phone: '+57 310 864 6361',
  contactEmail: '[COMPLETAR: correo de contacto]',
  privacyEmail: '[COMPLETAR: correo para datos personales]',
});
