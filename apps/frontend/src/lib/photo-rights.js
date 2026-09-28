/**
 * Rights of every photo the site can publish (Ley 1581 de 2012 for the
 * image of identifiable people; Ley 1098 de 2006 for minors; Ley 23 de 1982
 * for authorship). One entry per photo in photos-src/fotos-club.
 *
 * - source / author: where it comes from and who took it.
 * - identifiablePeople: someone can be recognized (face, name, number...).
 * - minors: a minor appears, or may appear (then it counts as a minor).
 * - imageAuthorization: the club holds the written authorization of every
 *   identifiable person (for a minor, of their guardian). Set it to true
 *   only with the document in hand, and name it in `authorizationRef`.
 *
 * A photo with minors and no authorization is never published: the photos
 * script doesn't generate it and the production build fails if it's in
 * public/ or used by the code (scripts/check-photo-rights.mjs). Adults
 * without authorization are listed as pending in docs/LEGAL_PENDIENTES.md.
 */
export const PHOTO_RIGHTS = {
  'canchas-panoramica-nubes': {
    source: 'Folleto oficial del club',
    author: '[COMPLETAR]',
    identifiablePeople: false,
    minors: false,
    imageAuthorization: false,
    authorizationRef: null,
    notes: 'Solo canchas, banderines y montañas.',
  },
  'jugador-desplazamiento': {
    source: 'Folleto oficial del club',
    author: '[COMPLETAR]',
    identifiablePeople: true,
    minors: false,
    imageAuthorization: false,
    authorizationRef: null,
    notes: 'Jugador adulto reconocible. Pendiente de autorización.',
  },
  'jugador-espera-recepcion': {
    source: 'Folleto oficial del club',
    author: '[COMPLETAR]',
    identifiablePeople: true,
    minors: false,
    imageAuthorization: false,
    authorizationRef: null,
    notes: 'Jugador adulto reconocible. Pendiente de autorización.',
  },
  'academia-chaqueta-orlando-rodriguez': {
    source: 'Folleto oficial del club',
    author: '[COMPLETAR]',
    identifiablePeople: true,
    minors: false,
    imageAuthorization: false,
    authorizationRef: null,
    notes: 'Orlando Rodríguez, de espaldas y nombrado en el texto. Pendiente de su autorización.',
  },
  'jugador-saque-azul': {
    source: 'Folleto oficial del club',
    author: '[COMPLETAR]',
    identifiablePeople: true,
    minors: true,
    imageAuthorization: false,
    authorizationRef: null,
    notes: 'Puede ser menor de edad: se trata como menor hasta que el club confirme su edad.',
  },
  'nino-saque': {
    source: 'Folleto oficial del club',
    author: '[COMPLETAR]',
    identifiablePeople: true,
    minors: true,
    imageAuthorization: false,
    authorizationRef: null,
    notes: 'Niño de la escuela reconocible. Necesita la autorización escrita de su acudiente.',
  },
};

/** A photo can be published unless a minor appears without authorization. */
export function isPhotoPublishable(name) {
  const rights = PHOTO_RIGHTS[name];
  if (!rights) return false;
  return !(rights.minors && !rights.imageAuthorization);
}

/**
 * What blocks a production build.
 * @param {{ published: string[], referenced: string[] }} photos
 *   published: photo names found in public/img/club;
 *   referenced: photo names used by the app's code.
 * @returns {string[]} problems in Spanish, empty when all is well
 */
export function photoRightsProblems({ published, referenced }) {
  const problems = [];
  for (const name of new Set([...published, ...referenced])) {
    if (!PHOTO_RIGHTS[name]) {
      problems.push(`La foto "${name}" no está en photo-rights.js: registra su origen y derechos.`);
    } else if (!isPhotoPublishable(name)) {
      const where = [
        published.includes(name) && 'está en public/img/club',
        referenced.includes(name) && 'la usa el código',
      ]
        .filter(Boolean)
        .join(' y ');
      problems.push(
        `La foto "${name}" muestra (o puede mostrar) a un menor sin autorización de su acudiente, y ${where}.`,
      );
    }
  }
  return problems;
}
