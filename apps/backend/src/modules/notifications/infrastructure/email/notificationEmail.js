import {
  NOTIFICATION_CATEGORIES,
  escapeHtml,
  renderBasicFormatHtml,
  renderBasicFormatText,
} from '@ctcj/shared';

// Club colors (apps/frontend/tailwind.config.js). Contrast: white on navy
// 16:1, ink on white 17:1, navy on lime 11:1.
const NAVY = '#001A4D';
const LIME = '#9EE67C';
const INK = '#0E1A33';
const SOFT = '#4A5363';
const PAGE = '#F4F6F9';
const CLUB = 'Club de Tenis Ciudad Jardín';

const P = `margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK};`;
const LINK = `color:${NAVY};font-weight:bold;text-decoration:underline;`;

/**
 * Builds the HTML and plain-text versions of a notification email.
 * Accessible: lang="es", real headings, layout tables marked
 * role="presentation", 16px text, strong contrast, images with alt text,
 * links that say where they go. Health data never reaches a template:
 * callers only pass titles and links.
 *
 * @param {{ siteUrl: string, unsubscribeUrlFor: (userId: string, category: string) => string }} deps
 */
export function createNotificationEmailRenderer({ siteUrl, unsubscribeUrlFor }) {
  /**
   * @param {{ subject: string, heading: string, paragraphs?: string[], bodyFormat?: string,
   *   cta?: { label: string, path: string }, image?: { url: string, alt: string },
   *   kind: 'SERVICE'|'PROMOTIONAL', category: string,
   *   recipient: { userId: string, firstName: string, isGuardian: boolean },
   *   about?: { firstName: string } | null }} input
   */
  return function renderEmail({
    subject,
    heading,
    paragraphs = [],
    bodyFormat,
    cta,
    image,
    kind,
    category,
    recipient,
    about,
  }) {
    const greeting = `Hola, ${recipient.firstName}:`;
    const aboutLine = about
      ? `Te escribimos como acudiente de ${about.firstName}, porque este aviso es sobre su cuenta.`
      : null;
    const manageUrl = `${siteUrl}/mi-ctcj/notificaciones`;
    const unsubscribeUrl =
      kind === 'PROMOTIONAL' ? unsubscribeUrlFor(recipient.userId, category) : null;
    const absolute = (path) => (path.startsWith('/') ? `${siteUrl}${path}` : path);
    const categoryLabel = NOTIFICATION_CATEGORIES[category]?.label ?? '';

    const bodyHtml = [
      `<p style="${P}">${escapeHtml(greeting)}</p>`,
      aboutLine ? `<p style="${P}">${escapeHtml(aboutLine)}</p>` : '',
      ...paragraphs.map((t) => `<p style="${P}">${escapeHtml(t)}</p>`),
      bodyFormat
        ? renderBasicFormatHtml(bodyFormat, { siteUrl, linkStyle: LINK, textStyle: P })
        : '',
      image
        ? `<img src="${escapeHtml(absolute(image.url))}" alt="${escapeHtml(image.alt)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:8px;margin:0 0 16px;">`
        : '',
      cta
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:${NAVY};border-radius:8px;"><a href="${escapeHtml(absolute(cta.path))}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;">${escapeHtml(cta.label)}</a></td></tr></table>`
        : '',
    ].join('\n');

    const footerLinks = [
      `<a href="${escapeHtml(manageUrl)}" style="${LINK}">Cambiar mis notificaciones</a>`,
      unsubscribeUrl
        ? `<a href="${escapeHtml(unsubscribeUrl)}" style="${LINK}">Dejar de recibir estos correos</a>`
        : '',
    ]
      .filter(Boolean)
      .join(' &nbsp;·&nbsp; ');
    const why =
      kind === 'PROMOTIONAL'
        ? `Recibes este correo porque autorizaste mensajes de "${categoryLabel}". Puedes retirarlo con un clic.`
        : `Es un aviso del servicio sobre algo que tienes con el club (${categoryLabel.toLowerCase()}).`;

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:${NAVY};padding:20px 28px;border-bottom:6px solid ${LIME};">
<p style="margin:0;font-size:18px;font-weight:bold;color:#FFFFFF;">${CLUB}</p>
</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${NAVY};">${escapeHtml(heading)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 28px;background:${PAGE};">
<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${SOFT};">${escapeHtml(why)}</p>
<p style="margin:0;font-size:14px;line-height:1.5;color:${SOFT};">${footerLinks}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const text = [
      CLUB,
      '',
      heading,
      '',
      greeting,
      aboutLine,
      ...paragraphs,
      bodyFormat ? renderBasicFormatText(bodyFormat, { siteUrl }) : null,
      image ? `[Imagen: ${image.alt}]` : null,
      cta ? `${cta.label}: ${absolute(cta.path)}` : null,
      '',
      '--',
      why,
      `Cambiar mis notificaciones: ${manageUrl}`,
      unsubscribeUrl ? `Dejar de recibir estos correos: ${unsubscribeUrl}` : null,
    ]
      .filter((line) => line !== null && line !== undefined)
      .join('\n');

    return { html, text };
  };
}
