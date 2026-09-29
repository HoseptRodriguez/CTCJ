/** Real, published club contact details -- the single source for every page. */
export const CLUB_NAME = 'Club de Tenis Ciudad Jardín';
export const WHATSAPP_NUMBER = '+57 310 864 6361';
export const WHATSAPP_LINK = 'https://wa.me/573108646361';
export const ADDRESS = 'Km 1 vía Fusagasugá – Tibacuy, junto al conjunto Toscana';
export const SOCIAL_HANDLE = '@clubdetenisciudadjardin';

// Official brochure address and directions ("¿Dónde encontrarnos?").
export const ADDRESS_FULL =
  'Kilómetro 1 vía Fusagasugá – Tibacuy, junto al Conjunto Toscana, la primera vía alterna frente al Colegio Gimnasio Americano.';
// A link (not an embedded map): opens Google Maps searching for the club.
export const MAPS_LINK =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Club de Tenis Ciudad Jardín, Fusagasugá');

// The club hasn't given its profiles' addresses yet: never guess them. A
// network is shown only once its url is a real https address.
export const SOCIAL_LINKS = [
  { network: 'Instagram', url: '[COMPLETAR: URL del perfil de Instagram]' },
  { network: 'Facebook', url: '[COMPLETAR: URL de la página de Facebook]' },
  { network: 'TikTok', url: '[COMPLETAR: URL del perfil de TikTok]' },
];

/** A complete https address (no placeholder, no spaces). */
export function isPublishableUrl(value) {
  if (typeof value !== 'string' || /[\s[\]]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** The networks the site may show (the rest stay hidden). */
export const PUBLISHED_SOCIAL_LINKS = SOCIAL_LINKS.filter(({ url }) => isPublishableUrl(url));
