import { parseBasicFormat } from '@ctcj/shared';
import { Link } from 'react-router-dom';

const LINK = 'focus-ring rounded font-semibold text-navy-500 underline underline-offset-4';

function Inline({ pieces }) {
  return pieces.map((p, i) => {
    if (p.type === 'text') return <span key={i}>{p.text}</span>;
    if (p.type === 'bold') return <strong key={i}>{p.text}</strong>;
    if (p.href.startsWith('/')) {
      return (
        <Link key={i} to={p.href} className={LINK}>
          <Inline pieces={p.children} />
        </Link>
      );
    }
    return (
      <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className={LINK}>
        <Inline pieces={p.children} />
        <span className="sr-only"> (se abre en otro sitio)</span>
      </a>
    );
  });
}

/**
 * An announcement's text (bold, lists, links), rendered as React from the
 * same parser the emails use -- never as raw HTML.
 */
export function BasicFormat({ text, className }) {
  return (
    <div className={className}>
      {parseBasicFormat(text).map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <p key={i} className="mb-3 text-body text-ink">
              {block.lines.map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  <Inline pieces={line} />
                </span>
              ))}
            </p>
          );
        }
        const List = block.ordered ? 'ol' : 'ul';
        return (
          <List
            key={i}
            className={`mb-3 space-y-1 pl-6 text-body text-ink ${block.ordered ? 'list-decimal' : 'list-disc'}`}
          >
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline pieces={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
