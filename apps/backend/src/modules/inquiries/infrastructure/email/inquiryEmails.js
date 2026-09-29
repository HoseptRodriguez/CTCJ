import { INFO_REQUEST_PROGRAM_LABELS, INFO_REQUEST_TIMES } from '@ctcj/shared';

/** Everything the person typed is escaped before going into an HTML email. */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const forWhom = (r) =>
  r.forWhom === 'CHILD' ? `Para su hijo o hija (${r.childAge} años)` : 'Para la persona misma';
const times = (r) =>
  r.preferredTimes.length
    ? r.preferredTimes.map((t) => INFO_REQUEST_TIMES[t]).join(', ')
    : 'Sin preferencia';

/** To the person who asked (only if they left an email). */
export function confirmationEmail(r) {
  const program = INFO_REQUEST_PROGRAM_LABELS[r.program];
  return {
    subject: 'Recibimos tu solicitud - Club de Tenis Ciudad Jardín',
    text:
      `Hola, ${r.fullName}. Recibimos tu solicitud de información sobre: ${program}.\n` +
      'Te contactaremos por WhatsApp en horario de atención.\n\n' +
      'Si no fuiste tú, ignora este correo.',
    html:
      `<p>Hola, ${escapeHtml(r.fullName)}.</p>` +
      `<p>Recibimos tu solicitud de información sobre: <strong>${escapeHtml(program)}</strong>.</p>` +
      '<p>Te contactaremos por WhatsApp en horario de atención.</p>' +
      '<p>Si no fuiste tú, ignora este correo.</p>',
  };
}

/** To the club's mailbox (INFO_REQUEST_TO). */
export function clubNoticeEmail(r, appPublicUrl) {
  const program = INFO_REQUEST_PROGRAM_LABELS[r.program];
  const lines = [
    ['Nombre', r.fullName],
    ['Celular / WhatsApp', r.phone],
    ['Correo', r.email ?? 'No dejó'],
    ['Programa', program],
    ['Para quién', forWhom(r)],
    ['Horario preferido', times(r)],
    ['Mensaje', r.message ?? '—'],
    ['Quiere recibir novedades', r.marketingOptIn ? 'Sí' : 'No'],
  ];
  const link = `${appPublicUrl}/staff/solicitudes-informacion`;
  return {
    subject: `Nueva solicitud de información: ${program}`,
    text: `${lines.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nVer en la consola: ${link}`,
    html:
      '<p>Llegó una nueva solicitud de información:</p><ul>' +
      lines.map(([k, v]) => `<li><strong>${k}:</strong> ${escapeHtml(v)}</li>`).join('') +
      `</ul><p><a href="${escapeHtml(link)}">Ver en la consola</a></p>`,
  };
}
