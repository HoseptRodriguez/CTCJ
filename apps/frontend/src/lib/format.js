/**
 * Colombian formats used everywhere: money as "$ 35.000" (COP, no
 * decimals) and dates/times in the club's time zone (America/Bogota),
 * never the viewer's device zone.
 */
export const CLUB_TIME_ZONE = 'America/Bogota';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 35000 -> "$ 35.000" (with a non-breaking space, so it never wraps). */
export function formatCop(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return COP.format(Number(amount));
}

const TIME = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: CLUB_TIME_ZONE,
});
const DAY_LONG = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: CLUB_TIME_ZONE,
});
const DAY_SHORT = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: CLUB_TIME_ZONE,
});

/** ISO/Date -> "7:00 a. m." in club time. */
export function formatTime(value) {
  return TIME.format(new Date(value)).replace(/\s/g, ' ');
}

/** ISO/Date -> "sábado, 27 de septiembre" in club time. */
export function formatDayLong(value) {
  return DAY_LONG.format(new Date(value));
}

/** ISO/Date -> "sáb, 27 sept" in club time. */
export function formatDayShort(value) {
  return DAY_SHORT.format(new Date(value));
}

/** Capitalizes the first letter ("sábado" -> "Sábado"). */
export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
