/**
 * "Configurar cookies" can be pressed from the footer of any screen and from
 * /cookies. It only announces the wish; the consent banner (Parte 4) listens
 * and opens its settings panel.
 */
export const OPEN_COOKIE_SETTINGS_EVENT = 'ctcj:open-cookie-settings';

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
