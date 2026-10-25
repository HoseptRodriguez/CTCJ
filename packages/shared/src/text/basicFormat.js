/**
 * The small text format of announcements -- the same parser for the app,
 * the email and the preview, so all three show exactly the same thing:
 *
 *   **negrita**
 *   - elemento de lista        1. elemento numerado
 *   [texto del enlace](https://...)
 *
 * Blank lines separate paragraphs. Nothing else is interpreted, and no raw
 * HTML ever passes through: the HTML renderer escapes every character.
 * Links must be https (or a site path starting with "/").
 */

const LINK = /\[([^\]\n]{1,200})\]\(((?:https:\/\/|\/)[^\s)]{0,500})\)/;
const BOLD = /\*\*([^*\n]{1,500})\*\*/;

/** Inline pieces of one line: text, bold and links (links may hold bold). */
export function parseInline(text) {
  const out = [];
  let rest = text;
  while (rest.length) {
    const link = LINK.exec(rest);
    const bold = BOLD.exec(rest);
    const first = [link, bold].filter(Boolean).sort((a, b) => a.index - b.index)[0];
    if (!first) {
      out.push({ type: 'text', text: rest });
      break;
    }
    if (first.index > 0) out.push({ type: 'text', text: rest.slice(0, first.index) });
    if (first === link) {
      out.push({ type: 'link', href: link[2], children: parseInline(link[1]) });
    } else {
      out.push({ type: 'bold', text: bold[1] });
    }
    rest = rest.slice(first.index + first[0].length);
  }
  return out;
}

/**
 * @param {string} source
 * @returns {Array<{ type: 'paragraph', lines: ReturnType<typeof parseInline>[] }
 *   | { type: 'list', ordered: boolean, items: ReturnType<typeof parseInline>[] }>}
 */
export function parseBasicFormat(source) {
  const blocks = [];
  let paragraph = null;
  let list = null;
  const close = () => {
    paragraph = null;
    list = null;
  };
  for (const raw of String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d{1,3}[.)]\s+(.*)$/.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        paragraph = null;
        list = { type: 'list', ordered, items: [] };
        blocks.push(list);
      }
      list.items.push(parseInline(item[1]));
      continue;
    }
    list = null;
    if (!paragraph) {
      paragraph = { type: 'paragraph', lines: [] };
      blocks.push(paragraph);
    }
    paragraph.lines.push(parseInline(line));
  }
  return blocks;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {string} source
 * @param {{ siteUrl?: string, linkStyle?: string, textStyle?: string }} [options]
 *   `siteUrl` turns "/..." links into absolute ones (emails need them).
 */
export function renderBasicFormatHtml(
  source,
  { siteUrl = '', linkStyle = '', textStyle = '' } = {},
) {
  const attr = (style) => (style ? ` style="${escapeHtml(style)}"` : '');
  const inline = (pieces) =>
    pieces
      .map((p) => {
        if (p.type === 'text') return escapeHtml(p.text);
        if (p.type === 'bold') return `<strong>${escapeHtml(p.text)}</strong>`;
        const href = p.href.startsWith('/') ? `${siteUrl}${p.href}` : p.href;
        return `<a href="${escapeHtml(href)}"${attr(linkStyle)}>${inline(p.children)}</a>`;
      })
      .join('');
  return parseBasicFormat(source)
    .map((block) => {
      if (block.type === 'paragraph') {
        return `<p${attr(textStyle)}>${block.lines.map(inline).join('<br>')}</p>`;
      }
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map((i) => `<li${attr(textStyle)}>${inline(i)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    })
    .join('\n');
}

/** Plain-text version (for the text part of emails and for notifications). */
export function renderBasicFormatText(source, { siteUrl = '' } = {}) {
  const inline = (pieces) =>
    pieces
      .map((p) => {
        if (p.type === 'text') return p.text;
        if (p.type === 'bold') return p.text;
        const href = p.href.startsWith('/') ? `${siteUrl}${p.href}` : p.href;
        return `${inline(p.children)} (${href})`;
      })
      .join('');
  return parseBasicFormat(source)
    .map((block) =>
      block.type === 'paragraph'
        ? block.lines.map(inline).join('\n')
        : block.items.map((i, n) => `${block.ordered ? `${n + 1}.` : '-'} ${inline(i)}`).join('\n'),
    )
    .join('\n\n');
}
