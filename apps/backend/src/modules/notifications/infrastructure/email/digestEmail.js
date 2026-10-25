import { escapeHtml } from '@ctcj/shared';

const NAVY = '#001A4D';
const LIME = '#9EE67C';
const INK = '#0E1A33';
const SOFT = '#4A5363';
const PAGE = '#F4F6F9';

/**
 * "Resumen diario": one email with the subject of every notice of the day.
 * Each notice is already in the person's bell in Mi CTCJ.
 *
 * @param {{ siteUrl: string }} deps
 */
export function createDigestRenderer({ siteUrl }) {
  return function renderDigest({ items }) {
    const subject = `Tu resumen del club: ${items.length} ${items.length === 1 ? 'aviso' : 'avisos'}`;
    const manageUrl = `${siteUrl}/mi-ctcj/notificaciones`;
    const listHtml = items
      .map(
        (i) =>
          `<li style="margin:0 0 8px;font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(i.subject)}</li>`,
      )
      .join('');
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAGE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:${NAVY};padding:20px 28px;border-bottom:6px solid ${LIME};"><p style="margin:0;font-size:18px;font-weight:bold;color:#FFFFFF;">Club de Tenis Ciudad Jardín</p></td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${NAVY};">Tu resumen de hoy</h1>
<ul style="margin:0 0 20px;padding-left:20px;">${listHtml}</ul>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${NAVY};border-radius:8px;"><a href="${escapeHtml(`${siteUrl}/mi-ctcj`)}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Ver todo en Mi CTCJ</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 28px;background:${PAGE};"><p style="margin:0;font-size:14px;line-height:1.5;color:${SOFT};">Recibes un solo correo al día porque elegiste el resumen diario. <a href="${escapeHtml(manageUrl)}" style="color:${NAVY};font-weight:bold;">Cambiar mis notificaciones</a></p></td></tr>
</table></td></tr></table>
</body></html>`;
    const text = [
      'Club de Tenis Ciudad Jardín',
      '',
      'Tu resumen de hoy',
      '',
      ...items.map((i) => `- ${i.subject}`),
      '',
      `Ver todo en Mi CTCJ: ${siteUrl}/mi-ctcj`,
      '',
      '--',
      'Recibes un solo correo al día porque elegiste el resumen diario.',
      `Cambiar mis notificaciones: ${manageUrl}`,
    ].join('\n');
    return { subject, html, text };
  };
}
