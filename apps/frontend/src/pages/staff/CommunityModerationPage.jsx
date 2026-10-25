import { useState } from 'react';

import { communityAdminClient } from '../../api/communityAdminClient.js';
import { ShieldIcon } from '../../components/icons/ShieldIcon.jsx';
import { AnimatedList } from '../../components/motion/AnimatedList.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeCommunityError } from '../../lib/communityErrorMessages.js';
import { formatDayShort, formatTime } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PostMediaView } from '../community/PostMediaView.jsx';
import { SectionCard } from '../mictcj/shared.jsx';

import { FormAlert, StaffRow } from './staffShared.jsx';

const TARGET_LABELS = { POST: 'Publicación', COMMENT: 'Comentario' };
// Spanish gender agreement for each kind of content.
const WORDS = {
  POST: {
    noun: 'publicación',
    this: 'esta publicación',
    stays: 'La publicación sigue publicada.',
    deleted: 'Publicación eliminada',
  },
  COMMENT: {
    noun: 'comentario',
    this: 'este comentario',
    stays: 'El comentario sigue publicado.',
    deleted: 'Comentario eliminado',
  },
};
const person = (p) => (p ? `${p.firstName} ${p.lastName}` : 'Un jugador');
const when = (iso) => `${formatDayShort(iso)} · ${formatTime(iso)}`;
// null = the content was already deleted ('' is a post with only photos/video).
const exists = (report) => report.targetContent != null;

function mediaSummary(media = []) {
  const photos = media.filter((m) => m.type === 'IMAGE').length;
  if (media.some((m) => m.type === 'VIDEO')) return 'con un video';
  if (photos) return photos === 1 ? 'con 1 foto' : `con ${photos} fotos`;
  return null;
}

function HiddenBadge({ report }) {
  if (!report.targetHidden) return null;
  return (
    <StatusBadge
      status="pendiente"
      label={
        report.targetHiddenReason === 'AUTO_REPORTS'
          ? 'Oculta por 3 reportes'
          : 'Oculta por el club'
      }
    />
  );
}

function ReviewPanel({ report, onClose, onResolved, onUpdated }) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const words = WORDS[report?.targetType] ?? WORDS.POST;

  async function run(kind) {
    setBusy(kind === 'hide' || kind === 'unhide' ? 'visibility' : kind);
    setError(null);
    try {
      if (kind === 'hide' || kind === 'unhide') {
        // Visibility only: the report stays open for review.
        if (kind === 'hide') await communityAdminClient.hidePost(report.targetId);
        else await communityAdminClient.unhidePost(report.targetId);
        const hidden = kind === 'hide';
        toast({
          title: hidden ? 'Publicación oculta' : 'Publicación visible de nuevo',
          description: hidden ? 'Nadie la ve en el muro mientras la revisas.' : undefined,
          tone: 'success',
        });
        onUpdated(report.id, { targetHidden: hidden, targetHiddenReason: hidden ? 'STAFF' : null });
        return;
      }
      if (kind === 'dismiss') {
        await communityAdminClient.dismissReport(report.id);
        toast({ title: 'Reporte descartado', description: words.stays, tone: 'success' });
      } else {
        if (report.targetType === 'POST') await communityAdminClient.deletePost(report.targetId);
        else await communityAdminClient.deleteComment(report.targetId);
        toast({ title: words.deleted, tone: 'success' });
      }
      onResolved(report.id);
    } catch (err) {
      setConfirmDelete(false);
      setError(describeCommunityError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <SlidePanel
        open={report != null}
        onClose={onClose}
        title="Revisar reporte"
        footer={
          report && (
            <div className="flex flex-col gap-3">
              <Button
                variant="danger"
                size="lg"
                fullWidth
                disabled={!exists(report) || busy != null}
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar {words.noun}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                loading={busy === 'dismiss'}
                loadingText="Descartando…"
                onClick={() => run('dismiss')}
              >
                Descartar el reporte
              </Button>
              {report.targetType === 'POST' && exists(report) && (
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  loading={busy === 'visibility'}
                  loadingText="Guardando…"
                  onClick={() => run(report.targetHidden ? 'unhide' : 'hide')}
                >
                  {report.targetHidden ? 'Mostrar de nuevo en el muro' : 'Ocultar mientras reviso'}
                </Button>
              )}
            </div>
          )
        }
      >
        {report && (
          <div className="space-y-6">
            <div>
              <p className="text-body font-semibold text-ink-soft">
                {TARGET_LABELS[report.targetType] ?? 'Contenido'} de {person(report.targetAuthor)}
              </p>
              <blockquote className="mt-2 whitespace-pre-line rounded-xl border-l-4 border-navy-500 bg-page p-4 text-lead text-ink">
                {exists(report) ? (
                  report.targetContent || <em className="text-ink-soft">Sin texto.</em>
                ) : (
                  <em className="text-ink-soft">El contenido ya fue eliminado.</em>
                )}
              </blockquote>
              <div className="mt-3">
                <HiddenBadge report={report} />
              </div>
              <PostMediaView media={report.targetMedia} />
            </div>
            <div className="rounded-xl bg-amber-soft p-4">
              <p className="text-body font-semibold text-amber-dark">
                Lo reportó {person(report.reporter)} · {when(report.createdAt)}
              </p>
              {report.reason && <p className="mt-2 text-body text-ink">“{report.reason}”</p>}
            </div>
            <FormAlert>{error}</FormAlert>
          </div>
        )}
      </SlidePanel>
      <ConfirmDialog
        open={confirmDelete}
        title={`¿Eliminar ${words.this}?`}
        description={`Se borra para todos y no se puede recuperar. ${person(report?.targetAuthor)} no recibirá un aviso automático.`}
        confirmLabel={`Sí, eliminar ${words.noun}`}
        loading={busy === 'delete'}
        onConfirm={() => run('delete')}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

export function CommunityModerationPage() {
  useDocumentTitle('Moderar comunidad');
  const reports = useAsync(() => communityAdminClient.listReports().then((d) => d.reports), []);
  const [reviewingId, setReviewingId] = useState(null);
  const reviewing = reports.data?.find((r) => r.id === reviewingId) ?? null;

  return (
    <div>
      <PageHeader
        title="Moderar comunidad"
        description="Publicaciones y comentarios que los jugadores reportaron. Revísalos y decide si se quedan o se eliminan."
      />
      <SectionCard
        title="Reportes pendientes"
        async={reports}
        isEmpty={(d) => d.length === 0}
        empty={{
          icon: <ShieldIcon />,
          title: 'No hay reportes pendientes',
          description: 'Cuando un jugador reporte algo, aparecerá aquí.',
        }}
        errorTitle="No pudimos cargar los reportes"
      >
        {(list) => (
          <AnimatedList
            aria-label="Reportes pendientes"
            items={list}
            getKey={(r) => r.id}
            renderItem={(r) => (
              <StaffRow
                title={`${TARGET_LABELS[r.targetType] ?? 'Contenido'} de ${person(r.targetAuthor)}`}
                badge={<HiddenBadge report={r} />}
                subtitle={
                  exists(r) ? (
                    <span className="line-clamp-2">
                      {r.targetContent || <em className="text-ink-soft">Sin texto</em>}
                      {mediaSummary(r.targetMedia) && ` (${mediaSummary(r.targetMedia)})`}
                    </span>
                  ) : (
                    <em className="text-ink-soft">Contenido ya eliminado</em>
                  )
                }
                meta={`Reportado por ${person(r.reporter)} · ${when(r.createdAt)}${r.reason ? ` · “${r.reason}”` : ''}`}
                actions={<Button onClick={() => setReviewingId(r.id)}>Revisar</Button>}
              />
            )}
          />
        )}
      </SectionCard>
      <ReviewPanel
        key={reviewingId ?? 'none'}
        report={reviewing}
        onClose={() => setReviewingId(null)}
        onUpdated={(id, patch) =>
          reports.setData((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
        }
        onResolved={(id) => {
          setReviewingId(null);
          reports.setData((list) => list.filter((r) => r.id !== id));
        }}
      />
    </div>
  );
}
