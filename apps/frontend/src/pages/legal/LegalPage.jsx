import {
  ACCESSIBILITY_STATEMENT,
  COOKIES_POLICY,
  PRIVACY_POLICY,
  REFUNDS_POLICY,
  TERMS,
} from '@ctcj/shared';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { openCookieSettings } from '../../lib/cookieSettingsEvent.js';

const UPDATED_ON = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** The legal pages, in the order the footer lists them. */
export const LEGAL_PAGES = [
  { doc: PRIVACY_POLICY, label: 'Política de datos personales' },
  { doc: TERMS, label: 'Términos y condiciones' },
  { doc: COOKIES_POLICY, label: 'Política de cookies' },
  { doc: REFUNDS_POLICY, label: 'Cancelaciones y reembolsos' },
  { doc: ACCESSIBILITY_STATEMENT, label: 'Accesibilidad' },
];

export function LegalBlock({ block }) {
  if (block.p) return <p className="text-body text-ink">{block.p}</p>;
  if (block.list)
    return (
      <ul className="list-disc space-y-2 pl-6 text-body text-ink">
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  if (block.table)
    return (
      // Wide tables scroll inside their own box, never the page.
      <div
        className="overflow-x-auto rounded-lg border border-line"
        tabIndex={0}
        role="region"
        aria-label="Tabla (se puede desplazar)"
      >
        <table className="w-full min-w-[36rem] border-collapse text-left text-body">
          <thead className="bg-page">
            <tr>
              {block.table.head.map((h) => (
                <th key={h} scope="col" className="border-b border-line p-3 font-semibold text-ink">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row) => (
              <tr key={row.join('|')} className="align-top">
                {row.map((cell, i) => (
                  <td key={`${i}-${cell}`} className="border-b border-line p-3 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return null;
}

/**
 * One legal document: title, version, last update, contents and sections.
 * The text comes from @ctcj/shared, the same content whose hash is stored in
 * legal_documents -- what's shown is exactly what's proven.
 */
export function LegalPage({ doc }) {
  useDocumentTitle(doc.title);
  const updated = UPDATED_ON.format(new Date(`${doc.publishedOn}T12:00:00Z`));
  return (
    <article className="mx-auto max-w-editorial px-4 py-10 md:px-8 md:py-14">
      <h1 className="font-display text-title font-bold text-ink md:text-title-lg">{doc.title}</h1>
      <p className="mt-3 text-body text-ink-soft">
        Versión {doc.version} · Última actualización: {updated}
      </p>

      <nav aria-label="Contenido" className="mt-8 rounded-xl bg-page p-5">
        <h2 className="text-lead font-bold text-ink">Contenido</h2>
        <ol className="mt-3 space-y-1">
          {doc.sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="focus-ring inline-flex min-h-btn items-center rounded text-body font-semibold text-navy-500 underline underline-offset-4"
              >
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {doc.sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-titulo`}
            className="scroll-mt-28 space-y-4"
          >
            <h2 id={`${s.id}-titulo`} className="font-display text-h2 font-bold text-ink">
              {s.heading}
            </h2>
            {s.blocks.map((block, i) => (
              // eslint-disable-next-line react/no-array-index-key -- static content, never reordered
              <LegalBlock key={i} block={block} />
            ))}
          </section>
        ))}
      </div>

      {doc.type === 'COOKIES' && (
        <div className="mt-10">
          <Button size="lg" onClick={openCookieSettings}>
            Configurar cookies
          </Button>
        </div>
      )}

      <nav aria-label="Otros documentos" className="mt-12">
        <h2 className="text-lead font-bold text-ink">Otros documentos</h2>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {LEGAL_PAGES.filter((p) => p.doc !== doc).map((p) => (
            <li key={p.doc.path}>
              <Link
                to={p.doc.path}
                className="focus-ring inline-flex min-h-btn items-center rounded text-body font-semibold text-navy-500 underline underline-offset-4"
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
