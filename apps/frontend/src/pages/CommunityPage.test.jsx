import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityClient } from '../api/communityClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import { CommunityPage } from './CommunityPage.jsx';

vi.mock('../api/communityClient.js', () => ({
  communityClient: {
    createPost: vi.fn(),
    listPosts: vi.fn(),
    deletePost: vi.fn(),
    listComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    reportPost: vi.fn(),
    reportComment: vi.fn(),
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CommunityPage />
    </MemoryRouter>,
  );
}

const POST_BY_ME = {
  id: 'post-1',
  authorId: 'me',
  author: { id: 'me', firstName: 'Ana', lastName: 'Gomez' },
  content: 'Buen partido hoy!',
  createdAt: '2026-08-16T10:00:00.000Z',
  commentCount: 0,
  likeCount: 0,
  likedByMe: false,
};

const POST_BY_OTHER = {
  ...POST_BY_ME,
  id: 'post-2',
  authorId: 'other',
  author: { id: 'other', firstName: 'Luis', lastName: 'Perez' },
};

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'me', roles: ['USUARIO', 'JUGADOR'] } });
  });

  it('shows an empty state when there are no posts', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    renderPage();
    expect(
      await screen.findByText('Todavía no hay publicaciones. ¡Sé el primero!'),
    ).toBeInTheDocument();
  });

  it('publishes a new post and refetches the feed', async () => {
    communityClient.listPosts
      .mockResolvedValueOnce({ posts: [] })
      .mockResolvedValueOnce({ posts: [POST_BY_ME] });
    communityClient.createPost.mockResolvedValue(POST_BY_ME);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Todavía no hay publicaciones. ¡Sé el primero!');
    await user.type(screen.getByLabelText('Publicar algo'), 'Buen partido hoy!');
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() =>
      expect(communityClient.createPost).toHaveBeenCalledWith({ content: 'Buen partido hoy!' }),
    );
    expect(await screen.findByText('Buen partido hoy!')).toBeInTheDocument();
  });

  it('toggles a like optimistically and calls likePost', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [POST_BY_OTHER] });
    communityClient.likePost.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();
    const likeButton = await screen.findByRole('button', { name: 'Me gusta (0)' });
    await user.click(likeButton);

    expect(await screen.findByRole('button', { name: 'Te gusta (1)' })).toBeInTheDocument();
    expect(communityClient.likePost).toHaveBeenCalledWith('post-2');
  });

  it('expands comments and posts a new one', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [POST_BY_OTHER] });
    communityClient.listComments.mockResolvedValue({ comments: [] });
    communityClient.createComment.mockResolvedValue({
      id: 'c1',
      postId: 'post-2',
      authorId: 'me',
      content: 'Felicidades!',
      createdAt: '2026-08-16T11:00:00.000Z',
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Comentarios (0)' }));
    expect(await screen.findByText('Sin comentarios todavía.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Escribe un comentario...'), 'Felicidades!');
    await user.click(screen.getByRole('button', { name: 'Comentar' }));

    await waitFor(() =>
      expect(communityClient.createComment).toHaveBeenCalledWith('post-2', {
        content: 'Felicidades!',
      }),
    );
    expect(await screen.findByText('Felicidades!')).toBeInTheDocument();
  });

  it("shows the delete button only for the caller's own post", async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [POST_BY_ME, POST_BY_OTHER] });
    renderPage();

    await screen.findAllByText('Buen partido hoy!');
    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    expect(deleteButtons).toHaveLength(1);
  });

  it('deleting a post removes it from the feed', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [POST_BY_ME] });
    communityClient.deletePost.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Buen partido hoy!');
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(communityClient.deletePost).toHaveBeenCalledWith('post-1'));
    expect(screen.queryByText('Buen partido hoy!')).not.toBeInTheDocument();
  });

  it('reports a post with an optional reason', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [POST_BY_OTHER] });
    communityClient.reportPost.mockResolvedValue({ id: 'report-1', status: 'PENDING' });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Reportar' }));
    await user.type(screen.getByPlaceholderText('Motivo (opcional)'), 'Contenido inapropiado');
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    await waitFor(() =>
      expect(communityClient.reportPost).toHaveBeenCalledWith('post-2', {
        reason: 'Contenido inapropiado',
      }),
    );
    expect(await screen.findByText('Reportado')).toBeInTheDocument();
  });
});
