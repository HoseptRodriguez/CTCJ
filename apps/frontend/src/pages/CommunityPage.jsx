import { useEffect, useState } from 'react';

import { communityClient } from '../api/communityClient.js';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeCommunityError } from '../lib/communityErrorMessages.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const PAGE_SIZE = 20;

function authorLabel(author) {
  return author ? `${author.firstName} ${author.lastName}` : 'Jugador';
}

/** Small reason-optional confirm, collapses back to the report link once
 * submitted -- the API's 409 on a second report is the backstop, this is
 * just the happy-path UI. */
function ReportControl({ onReport }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (done) {
    return <span className="text-xs text-tertiary">Reportado</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-tertiary underline hover:text-secondary"
      >
        Reportar
      </button>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await onReport(reason.trim() || undefined);
      setDone(true);
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional)"
        className="rounded-md border border-neutral-300 bg-canvas px-2 py-1 text-xs sm:w-48"
      />
      <Button
        type="button"
        variant="outline"
        className="px-2 py-1 text-xs"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'Enviando...' : 'Enviar reporte'}
      </Button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </div>
  );
}

function CommentList({ comments, currentUserId, onCommentDeleted }) {
  async function handleDelete(commentId) {
    await communityClient.deleteComment(commentId);
    onCommentDeleted(commentId);
  }

  if (comments.length === 0) {
    return <p className="mt-2 text-xs text-secondary">Sin comentarios todavía.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {comments.map((c) => (
        <li key={c.id} className="rounded-md bg-sunken px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-primary">{authorLabel(c.author)}</span>
            <span className="text-xs text-tertiary">
              {DATE_FORMATTER.format(new Date(c.createdAt))}
            </span>
          </div>
          <p className="mt-1 text-secondary">{c.content}</p>
          <div className="mt-1 flex items-center gap-3">
            {c.authorId === currentUserId ? (
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="text-xs text-tertiary underline hover:text-secondary"
              >
                Eliminar
              </button>
            ) : null}
            <ReportControl onReport={(reason) => communityClient.reportComment(c.id, { reason })} />
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

  async function loadComments() {
    if (comments === null) {
      const data = await communityClient.listComments(post.id);
      setComments(data.comments);
    }
    setExpanded((prev) => !prev);
  }

  async function handleAddComment() {
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

  function handleCommentDeleted(commentId) {
    setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId));
  }

  async function handleDeletePost() {
    await communityClient.deletePost(post.id);
    onDeleted(post.id);
  }

  return (
    <li className="rounded-lg border border-neutral-200 bg-canvas p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display font-semibold text-primary">{authorLabel(post.author)}</span>
        <span className="text-xs text-tertiary">
          {DATE_FORMATTER.format(new Date(post.createdAt))}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-secondary">{post.content}</p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          className={post.likedByMe ? 'font-semibold text-action' : 'text-secondary'}
        >
          {post.likedByMe ? 'Te gusta' : 'Me gusta'} ({post.likeCount})
        </button>
        <button type="button" onClick={loadComments} className="text-secondary">
          Comentarios ({post.commentCount})
        </button>
        {post.authorId === currentUserId ? (
          <button
            type="button"
            onClick={handleDeletePost}
            className="text-xs text-tertiary underline hover:text-secondary"
          >
            Eliminar
          </button>
        ) : null}
        <ReportControl onReport={(reason) => communityClient.reportPost(post.id, { reason })} />
      </div>

      {expanded ? (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <CommentList
            comments={comments ?? []}
            currentUserId={currentUserId}
            onCommentDeleted={handleCommentDeleted}
          />
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm sm:min-w-[16rem]"
            />
            <Button
              type="button"
              variant="outline"
              className="px-3 py-1 text-xs"
              disabled={posting}
              onClick={handleAddComment}
            >
              {posting ? 'Enviando...' : 'Comentar'}
            </Button>
          </div>
          {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

export function CommunityPage() {
  useDocumentTitle('Comunidad');
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePublish() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setPosting(true);
    setError(null);
    try {
      await communityClient.createPost({ content: trimmed });
      setContent('');
      await refetch();
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setPosting(false);
    }
  }

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

  function handlePostDeleted(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  async function handleToggleLike(post) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p,
      ),
    );
    try {
      if (post.likedByMe) {
        await communityClient.unlikePost(post.id);
      } else {
        await communityClient.likePost(post.id);
      }
    } catch {
      // Revert the optimistic update on failure.
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likedByMe: post.likedByMe, likeCount: post.likeCount } : p,
        ),
      );
    }
  }

  return (
    <Section
      heading={{
        eyebrow: 'Mi CTCJ',
        title: 'Comunidad',
        lede: 'Comparte con otros jugadores del club: resultados, entrenamientos, y más.',
      }}
    >
      <Button to="/mi-ctcj" variant="ghost" className="px-0">
        Volver al panel
      </Button>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-canvas p-4">
        <label className="block text-sm font-semibold text-primary" htmlFor="community-compose">
          Publicar algo
        </label>
        <textarea
          id="community-compose"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={1000}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
        <Button
          type="button"
          variant="primary"
          className="mt-2 px-3 py-1 text-sm"
          disabled={posting}
          onClick={handlePublish}
        >
          {posting ? 'Publicando...' : 'Publicar'}
        </Button>
        {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      </div>

      {posts === null ? <p className="mt-4 text-secondary">Cargando...</p> : null}
      {posts?.length === 0 ? (
        <p className="mt-4 text-secondary">Todavía no hay publicaciones. ¡Sé el primero!</p>
      ) : null}

      {posts?.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              onDeleted={handlePostDeleted}
              onToggleLike={handleToggleLike}
            />
          ))}
        </ul>
      ) : null}

      {posts?.length > 0 && hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={loadingMore}
          onClick={handleLoadMore}
        >
          {loadingMore ? 'Cargando...' : 'Cargar más'}
        </Button>
      ) : null}
    </Section>
  );
}
