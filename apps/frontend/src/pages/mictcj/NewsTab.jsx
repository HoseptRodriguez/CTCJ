import { notificationsClient } from '../../api/notificationsClient.js';
import { BasicFormat } from '../../components/forms/BasicFormat.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAsync } from '../../lib/useAsync.js';

import { DATE_TIME_MEDIUM, SectionCard } from './shared.jsx';

/** Mi CTCJ > Novedades: the club's announcements meant for this person. */
export function NewsTab() {
  useDocumentTitle('Novedades');
  const news = useAsync(() => notificationsClient.listNews().then((d) => d.news), []);
  return (
    <div className="space-y-6">
      <PageHeader title="Novedades" description="Los comunicados del club." />
      <SectionCard
        title="Comunicados"
        async={news}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'Todavía no hay comunicados' }}
      >
        {(list) => (
          <ul className="space-y-6">
            {list.map((n) => (
              <li key={n.id}>
                <article
                  aria-labelledby={`novedad-${n.id}`}
                  className="rounded-xl border border-line p-4 md:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={`novedad-${n.id}`} className="font-display text-h3 font-bold text-ink">
                      {n.title}
                    </h2>
                    {n.kind === 'PROMOTIONAL' && (
                      <StatusBadge status="suspendida" label="Promoción" />
                    )}
                  </div>
                  <p className="mb-3 text-body-sm text-ink-soft">
                    {DATE_TIME_MEDIUM.format(new Date(n.publishedAt))}
                  </p>
                  {n.imageUrl && (
                    <img
                      src={n.imageUrl}
                      alt={n.imageAlt}
                      loading="lazy"
                      className="mb-4 w-full max-w-xl rounded-lg"
                    />
                  )}
                  <BasicFormat text={n.body} />
                </article>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
