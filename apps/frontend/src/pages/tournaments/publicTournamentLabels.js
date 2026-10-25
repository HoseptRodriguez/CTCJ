export const PUBLIC_STATUS = {
  OPEN: { label: 'Inscripciones abiertas', badge: 'al-dia' },
  IN_PROGRESS: { label: 'En curso', badge: 'pendiente' },
  FINISHED: { label: 'Finalizado', badge: 'suspendida' },
};

export const CATEGORY = {
  SEGUNDA: 'Segunda',
  TERCERA: 'Tercera',
  CUARTA: 'Cuarta',
  QUINTA: 'Quinta',
};
export const MODALITY = { SINGLES: 'Singles', DOBLES: 'Dobles' };

const DAY = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
export const MATCH_TIME = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Del 12 de octubre al 20 de octubre de 2026" / "Desde el ..." / null. */
export function datesText(startsOn, endsOn) {
  const f = (d) => DAY.format(new Date(`${d}T00:00:00Z`));
  if (startsOn && endsOn) return `Del ${f(startsOn)} al ${f(endsOn)}`;
  if (startsOn) return `Desde el ${f(startsOn)}`;
  if (endsOn) return `Hasta el ${f(endsOn)}`;
  return null;
}
