import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityClient } from '../api/communityClient.js';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { readVideoMeta } from '../lib/media.js';

import { CommunityPage } from './CommunityPage.jsx';

vi.mock('../api/communityClient.js', () => ({
  communityClient: {
    createPost: vi.fn(),
    createMediaPost: vi.fn(),
    getMediaCapabilities: vi.fn(),
    uploadVideoDirect: vi.fn(),
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
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
// jsdom can't decode media: the browser measurements are faked here.
vi.mock('../lib/media.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readVideoMeta: vi.fn(),
  captureVideoPoster: vi.fn().mockResolvedValue(new Blob(['poster'], { type: 'image/jpeg' })),
}));

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

const CAPS = {
  canUploadMedia: true,
  isMinor: false,
  videoUpload: 'server',
  remainingMediaPostsToday: 10,
};
const POST_BY_ME = {
  id: 'post-1',
  authorId: 'me',
  author: { id: 'me', firstName: 'Ana', lastName: 'Gomez' },
  content: 'Buen partido hoy!',
  createdAt: '2026-08-16T10:00:00.000Z',
  commentCount: 0,
  likeCount: 0,
  likedByMe: false,
  media: [],
};
const POST_BY_OTHER = {
  ...POST_BY_ME,
  id: 'post-2',
  authorId: 'other',
  author: { id: 'other', firstName: 'Luis', lastName: 'Perez' },
};
const photoFile = (name = 'foto.jpg', size = 1000) =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { id: 'me', roles: ['USUARIO', 'JUGADOR'] } });
  communityClient.getMediaCapabilities.mockResolvedValue(CAPS);
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('CommunityPage', () => {
  it('shows an empty state when there are no posts', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    renderPage();
    expect(
      await screen.findByText('Todavía no hay publicaciones. ¡Sé el primero!'),
    ).toBeInTheDocument();
  });

  it('publishes a text post and refetches the feed', async () => {
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
    await user.click(await screen.findByRole('button', { name: 'Me gusta (0)' }));
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

  it('deleting my post asks first, then removes it from the feed', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [POST_BY_ME, POST_BY_OTHER] });
    communityClient.deletePost.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Buen partido hoy!');
    const buttons = screen.getAllByRole('button', { name: 'Eliminar' });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    expect(communityClient.deletePost).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Sí, eliminar publicación' }));
    await waitFor(() => expect(communityClient.deletePost).toHaveBeenCalledWith('post-1'));
  });
});

describe('Community: photos and videos', () => {
  it('shows "Agregar fotos" / "Agregar video" and the notice about minors', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Agregar fotos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar video' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Solo publica fotos o videos de menores de edad si tienes autorización de su acudiente.',
      ),
    ).toBeInTheDocument();
  });

  it("a minor's account only gets the text box", async () => {
    communityClient.getMediaCapabilities.mockResolvedValue({
      ...CAPS,
      canUploadMedia: false,
      isMinor: true,
    });
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    renderPage();
    expect(
      await screen.findByText(/puedes publicar texto, pero no fotos ni videos/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar fotos' })).not.toBeInTheDocument();
  });

  it('previews the chosen photos, "Quitar" removes one, and publishing sends them with progress', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    communityClient.createMediaPost.mockImplementation(async (form, onProgress) => {
      onProgress(50);
      return { ...POST_BY_ME, media: [] };
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Agregar fotos' });
    await user.upload(screen.getByLabelText('Elegir fotos'), [
      photoFile('uno.jpg'),
      photoFile('dos.jpg'),
    ]);

    const chosen = screen.getByRole('list', { name: 'Archivos elegidos' });
    expect(within(chosen).getAllByRole('listitem')).toHaveLength(2);
    await user.click(within(chosen).getByRole('button', { name: 'Quitar uno.jpg' }));
    expect(within(chosen).getAllByRole('listitem')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(communityClient.createMediaPost).toHaveBeenCalled());
    const form = communityClient.createMediaPost.mock.calls[0][0];
    expect(form.getAll('images')).toHaveLength(1);
    expect(form.get('content')).toBe('');
  });

  it('more than 4 photos is refused before uploading', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Agregar fotos' });
    await user.upload(
      screen.getByLabelText('Elegir fotos'),
      ['1', '2', '3', '4', '5'].map((n) => photoFile(`${n}.jpg`)),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Puedes publicar hasta 4 fotos a la vez.');
  });

  it('a video over 50 MB gets the clear message', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    readVideoMeta.mockResolvedValue({ durationSeconds: 20, width: 1280, height: 720 });
    const big = new File(['x'], 'grande.mp4', { type: 'video/mp4' });
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Agregar video' });
    await user.upload(screen.getByLabelText('Elegir video'), big);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El video pesa más de 50 MB. Recórtalo o elige uno más corto.',
    );
  });

  it('a video of up to 60 s goes with its measurements and cover', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [] });
    communityClient.createMediaPost.mockResolvedValue(POST_BY_ME);
    readVideoMeta.mockResolvedValue({ durationSeconds: 45, width: 1280, height: 720 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Agregar video' });
    await user.upload(
      screen.getByLabelText('Elegir video'),
      new File(['v'], 'saque.mp4', { type: 'video/mp4' }),
    );
    expect(await screen.findByText('Video · 45 s')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(communityClient.createMediaPost).toHaveBeenCalled());
    const form = communityClient.createMediaPost.mock.calls[0][0];
    expect(form.get('video')).toBeInstanceOf(File);
    expect(JSON.parse(form.get('videoMeta'))).toEqual({
      durationSeconds: 45,
      width: 1280,
      height: 720,
    });
    expect(form.get('poster')).toBeInstanceOf(Blob);
  });

  it('in the feed: photos in a grid that open full screen; videos never autoplay', async () => {
    communityClient.listPosts.mockResolvedValue({
      posts: [
        {
          ...POST_BY_OTHER,
          media: [
            { id: 'm1', type: 'IMAGE', url: '/f1.webp', width: 1600, height: 1200, sortOrder: 0 },
            { id: 'm2', type: 'IMAGE', url: '/f2.webp', width: 1600, height: 1200, sortOrder: 1 },
          ],
        },
        {
          ...POST_BY_ME,
          id: 'post-3',
          media: [
            {
              id: 'v1',
              type: 'VIDEO',
              url: '/v.mp4',
              posterUrl: '/p.webp',
              durationSeconds: 30,
              width: 1280,
              height: 720,
            },
          ],
        },
      ],
    });
    const user = userEvent.setup();
    renderPage();
    const grid = await screen.findByRole('list', { name: '2 fotos' });
    const imgs = [...grid.querySelectorAll('img')];
    expect(imgs).toHaveLength(2);
    expect(imgs.every((img) => img.getAttribute('loading') === 'lazy')).toBe(true);

    await user.click(
      within(grid).getByRole('button', { name: 'Ver la foto 2 en pantalla completa' }),
    );
    const viewer = screen.getByRole('dialog', { name: 'Foto 2 de 2' });
    await user.click(within(viewer).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Lazy: far from the screen only the cover is there, no <video> yet.
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('img[src="/p.webp"]')).toHaveAttribute('loading', 'lazy');
  });

  it('a video mounts when it nears the screen: controls, cover, metadata only, no autoplay', async () => {
    const original = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(cb) {
        this.cb = cb;
      }
      observe() {
        this.cb([{ isIntersecting: true }]);
      }
      disconnect() {}
    };
    communityClient.listPosts.mockResolvedValue({
      posts: [
        {
          ...POST_BY_ME,
          id: 'post-3',
          media: [
            {
              id: 'v1',
              type: 'VIDEO',
              url: '/v.mp4',
              posterUrl: '/p.webp',
              durationSeconds: 30,
              width: 1280,
              height: 720,
            },
          ],
        },
      ],
    });
    renderPage();
    await screen.findByText('Buen partido hoy!');
    const video = await waitFor(() => {
      const v = document.querySelector('video');
      expect(v).not.toBeNull();
      return v;
    });
    globalThis.IntersectionObserver = original;
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('poster', '/p.webp');
    expect(video).toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('autoplay');
  });

  it('reporting offers "Aparece un menor sin autorización"', async () => {
    communityClient.listPosts.mockResolvedValue({ posts: [POST_BY_OTHER] });
    communityClient.reportPost.mockResolvedValue({ id: 'r1', status: 'PENDING' });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Reportar' }));
    await user.click(screen.getByRole('radio', { name: 'Aparece un menor sin autorización' }));
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }));
    await waitFor(() =>
      expect(communityClient.reportPost).toHaveBeenCalledWith('post-2', {
        reason: 'Aparece un menor sin autorización',
      }),
    );
    expect(await screen.findByText(/Reportado/)).toBeInTheDocument();
  });

  it('my hidden post is marked as under review', async () => {
    communityClient.listPosts.mockResolvedValue({
      posts: [{ ...POST_BY_ME, hiddenAt: '2026-09-27T12:00:00Z', hiddenReason: 'AUTO_REPORTS' }],
    });
    renderPage();
    expect(
      await screen.findByText(
        'Tu publicación está oculta mientras la administración del club la revisa.',
      ),
    ).toBeInTheDocument();
  });
});
