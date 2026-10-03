/**
 * How a player appears on the public tournament pages: only the name
 * (never contact data). A minor appears with the first name and the
 * initial of the last name ("Lucía R."), unless the guardian authorized
 * the full name (MINOR_PUBLIC_NAME). Adults appear with their full name.
 *
 * @param {{ firstName?: string|null, lastName?: string|null }} person
 * @param {boolean} fullNameAllowed
 */
export function publicPlayerName({ firstName, lastName }, fullNameAllowed) {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (!first && !last) return 'Jugador del club';
  if (fullNameAllowed || !last) return `${first} ${last}`.trim();
  // First given name only, and the initial of the first surname.
  return `${first.split(/\s+/)[0]} ${last[0].toLocaleUpperCase('es-CO')}.`;
}
