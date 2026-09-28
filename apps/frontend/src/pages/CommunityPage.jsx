import { useEffect, useState } from 'react';
import { MINOR_WITHOUT_CONSENT_REASON } from '@ctcj/shared';

import { communityClient } from '../api/communityClient.js';
import { consentClient } from '../api/consentClient.js';
import { MessageIcon } from '../components/icons/MessageIcon.jsx';
import { HeartIcon } from '../components/icons/HeartIcon.jsx';
import { OptionalAuthorization } from '../components/legal/OptionalAuthorization.jsx';
import { AnimatedList } from '../components/motion/AnimatedList.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { RadioCards, TextField } from '../components/ui/Field.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { cn } from '../components/ui/cn.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeCommunityError } from '../lib/communityErrorMessages.js';
import { useAsync } from '../lib/useAsync.js';

import { MediaComposer } from './community/MediaComposer.jsx';
import { PostMediaView } from './community/PostMediaView.jsx';
import { DATE_TIME_MEDIUM } from './mictcj/shared.jsx';

const PAGE_SIZE = 20;

function authorLabel(author) {
  return author ? `${author.firstName} ${author.lastName}` : 'Jugador';
}

const REPORT_REASONS = [
  { value: MINOR_WITHOUT_CONSENT_REASON, label: MINOR_WITHOUT_CONSENT_REASON },
  { value: 'Es ofensivo o inapropiado', label: 'Es ofensivo o inapropiado' },
  { value: 'otro', label: 'Otro motivo' },
];

/**
 * "Reportar" with a reason -- "Aparece un menor sin autorización" first.
 * Three reports from different players hide a post until staff review it.
 * The API's 409 on a repeat report is the backstop.
 */
function ReportControl({ onReport, withReasons = true }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(null);
  const [other, setOther] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (done)
    return (
      <span className="inline-flex min-h-btn items-center text-body-sm text-ink-soft">
        Reportado. Gracias, el club lo revisará.
      </span>
    );

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Reportar
      </Button>
    );
  }

  async function handleSubmit() {
    const reason = !withReasons || choice === 'otro' ? other.trim() : choice;
    if (withReasons && !choice) {
      setError('Elige por qué lo reportas.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onReport(reason || undefined);
      setDone(true);
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-3 rounded-lg bg-page p-3">
      {withReasons && (
        <RadioCards
          legend="¿Por qué lo reportas?"
          name={`motivo-${Math.random().toString(36).slice(2)}`}
          options={REPORT_REASONS}
          value={choice}
          onChange={(v) => {
            setChoice(v);
            setError(null);
          }}
        />
      )}
      {(!withReasons || choice === 'otro') && (
        <TextField
          label={withReasons ? 'Cuéntanos el motivo' : '¿Por qué lo reportas?'}
          value={other}
          maxLength={300}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Motivo (opcional)"
        />
      )}
      {error && (
        <p role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          loading={submitting}
          loadingText="Enviando…"
          onClick={handleSubmit}
        >
          Enviar reporte
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          No reportar
        </Button>
      </div>
    </div>
  );
}

/** Delete with confirmation (it can't be undone). */
function DeleteButton({ what, onConfirm }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setOpen(false);
      toast({
        title: `No se pudo eliminar el ${what}`,
        description: describeCommunityError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Eliminar
      </Button>
      <ConfirmDialog
        open={open}
        title={`¿Eliminar tu ${what}?`}
        description="Desaparece para todos y no se puede recuperar."
        confirmLabel={`Sí, eliminar ${what}`}
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

function CommentList({ comments, currentUserId, onCommentDeleted }) {
  if (comments.length === 0) {
    return <p className="text-body text-ink-soft">Sin comentarios todavía.</p>;
  }
  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <li key={c.id} className="rounded-lg bg-page p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body font-semibold text-ink">{authorLabel(c.author)}</span>
            <span className="text-body-sm text-ink-soft">
              {DATE_TIME_MEDIUM.format(new Date(c.createdAt))}
            </span>
          </div>
          <p className="mt-1 text-body text-ink">{c.content}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {c.authorId === currentUserId ? (
              <DeleteButton
                what="comentario"
                onConfirm={async () => {
                  await communityClient.deleteComment(c.id);
                  onCommentDeleted(c.id);
                }}
              />
            ) : null}
            <ReportControl
              withReasons={false}
              onReport={(reason) => communityClient.reportComment(c.id, { reason })}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PostCard({ post, currentUserId, onDeleted, onToggleLike }) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  async function toggleComments() {
    if (comments === null) {
      try {
        const data = await communityClient.listComments(post.id);
        setComments(data.comments);
      } catch (err) {
        setError(describeCommunityError(err));
        setComments([]);
      }
    }
    setExpanded((prev) => !prev);
  }

  async function handleAddComment(e) {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    setPosting(true);
    setError(null);
    try {
      const created = await communityClient.createComment(post.id, { content });
      setComments((prev) => [...(prev ?? []), { ...created, author: null }]);
      setNewComment('');
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setPosting(false);
    }
  }

  return (
    <article className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      {post.hiddenAt && (
        <p className="mb-4 rounded-lg bg-amber-soft p-3 text-body font-semibold text-amber-dark">
          Tu publicación está oculta mientras la administración del club la revisa.
        </p>
      )}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-3">
          <Avatar
            firstName={post.author?.firstName ?? 'J'}
            lastName={post.author?.lastName}
            size="sm"
          />
          <span className="font-display text-h3 font-bold text-ink">
            {authorLabel(post.author)}
          </span>
        </span>
        <span className="text-body-sm text-ink-soft">
          {DATE_TIME_MEDIUM.format(new Date(post.createdAt))}
        </span>
      </header>
      {post.content && (
        <p className="mt-3 whitespace-pre-wrap text-lead text-ink">{post.content}</p>
      )}
      <PostMediaView media={post.media} />

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          aria-pressed={post.likedByMe}
          className={cn(
            'focus-ring inline-flex min-h-btn items-center gap-2 rounded-lg border-2 px-4 text-body font-semibold',
            post.likedByMe
              ? 'border-navy-500 bg-lime text-navy-500'
              : 'border-line-strong text-ink hover:bg-page',
          )}
        >
          <HeartIcon className="h-5 w-5" />
          {post.likedByMe ? 'Te gusta' : 'Me gusta'} ({post.likeCount})
        </button>
        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={expanded}
          className="focus-ring inline-flex min-h-btn items-center gap-2 rounded-lg border-2 border-line-strong px-4 text-body font-semibold text-ink hover:bg-page"
        >
          <MessageIcon className="h-5 w-5" />
          Comentarios ({post.commentCount})
        </button>
        {post.authorId === currentUserId ? (
          <DeleteButton
            what="publicación"
            onConfirm={async () => {
              await communityClient.deletePost(post.id);
              onDeleted(post.id);
            }}
          />
        ) : null}
        <ReportControl onReport={(reason) => communityClient.reportPost(post.id, { reason })} />
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <CommentList
            comments={comments ?? []}
            currentUserId={currentUserId}
            onCommentDeleted={(id) =>
              setComments((prev) => (prev ?? []).filter((c) => c.id !== id))
            }
          />
          <form onSubmit={handleAddComment} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <TextField
                label="Tu comentario"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                error={error}
              />
            </div>
            <Button type="submit" variant="secondary" loading={posting} loadingText="Enviando…">
              Comentar
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

/** Mi CTCJ → Comunidad. */
/**
 * First use of the Community: the rules (and the declaration about people
 * who appear in photos and videos) are accepted before the composer shows.
 * If they can't be loaded, the composer shows anyway: the server enforces.
 */
function CommunityRulesGate({ children }) {
  const authorizations = useAsync(() => consentClient.getMyAuthorizations(), []);
  if (authorizations.status === 'loading') return null;
  const rules = authorizations.data?.items.find((i) => i.type === 'COMMUNITY_RULES');
  if (authorizations.status !== 'ready' || !rules || rules.accepted) return children;
  return (
    <div className="space-y-2">
      <p className="text-body text-ink-soft">
        Antes de tu primera publicación o comentario, lee y acepta las reglas.
      </p>
      <OptionalAuthorization
        item={rules}
        isMinor={authorizations.data.isMinor}
        headingLevel="h2"
        onSaved={(saved) =>
          authorizations.setData((d) => ({
            ...d,
            items: d.items.map((i) => (i.type === saved.type ? saved : i)),
          }))
        }
      />
    </div>
  );
}

export function CommunityPage() {
  useDocumentTitle('Comunidad');
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  function refetch() {
    return communityClient
      .listPosts({ limit: PAGE_SIZE })
      .then((data) => {
        setPosts(data.posts);
        setHasMore(data.posts.length === PAGE_SIZE);
      })
      .catch((err) => {
        setPosts([]);
        setError(describeCommunityError(err));
      });
  }

  useEffect(() => {
    refetch();
  }, []);

  async function handleLoadMore() {
    const last = posts[posts.length - 1];
    setLoadingMore(true);
    try {
      const data = await communityClient.listPosts({ limit: PAGE_SIZE, before: last.createdAt });
      setPosts((prev) => [...prev, ...data.posts]);
      setHasMore(data.posts.length === PAGE_SIZE);
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleToggleLike(post) {
    // Optimistic: flip at once, undo if the server refuses.
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p,
      ),
    );
    try {
      if (post.likedByMe) await communityClient.unlikePost(post.id);
      else await communityClient.likePost(post.id);
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likedByMe: post.likedByMe, likeCount: post.likeCount } : p,
        ),
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Comunidad"
        description="Comparte con otros jugadores del club: resultados, entrenamientos y más."
        className="mb-0 md:mb-0"
      />
      <Card>
        <CommunityRulesGate>
          <MediaComposer userId={user.id} onPublished={refetch} />
        </CommunityRulesGate>
      </Card>
      {error && (
        <p role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      )}

      {posts === null && (
        <SkeletonGroup label="Cargando publicaciones…" className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </SkeletonGroup>
      )}
      {posts?.length === 0 && (
        <EmptyState
          icon={<MessageIcon />}
          title="Todavía no hay publicaciones. ¡Sé el primero!"
          description="Cuenta cómo te fue en tu último partido."
        />
      )}
      {posts?.length > 0 && (
        <AnimatedList
          aria-label="Publicaciones"
          className="space-y-5"
          items={posts}
          getKey={(post) => post.id}
          renderItem={(post) => (
            <PostCard
              post={post}
              currentUserId={user.id}
              onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
              onToggleLike={handleToggleLike}
            />
          )}
        />
      )}
      {posts?.length > 0 && hasMore && (
        <Button
          variant="secondary"
          loading={loadingMore}
          loadingText="Cargando…"
          onClick={handleLoadMore}
        >
          Cargar más publicaciones
        </Button>
      )}
    </div>
  );
}
