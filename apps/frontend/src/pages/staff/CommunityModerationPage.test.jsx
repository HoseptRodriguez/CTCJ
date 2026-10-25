import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityAdminClient } from '../../api/communityAdminClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { CommunityModerationPage } from './CommunityModerationPage.jsx';

vi.mock('../../api/communityAdminClient.js', () => ({
  communityAdminClient: {
    listReports: vi.fn(),
    dismissReport: vi.fn(),
    deletePost: vi.fn(),
    deleteComment: vi.fn(),
    hidePost: vi.fn(),
    unhidePost: vi.fn(),
  },
}));

const REPORT = {
  id: 'report-1',
  targetType: 'POST',
  targetId: 'post-1',
  targetContent: 'contenido reportado',
  targetAuthor: { id: 'player-1', firstName: 'Ana', lastName: 'Gomez' },
  reporter: { id: 'player-2', firstName: 'Luis', lastName: 'Perez' },
  reason: 'ofensivo',
  status: 'PENDING',
  createdAt: '2026-08-17T10:00:00.000Z',
};

function renderPage() {
  return render(
    <ToastProvider>
      <CommunityModerationPage />
    </ToastProvider>,
  );
}

async function openReview(user) {
  await screen.findByText('contenido reportado');
  await user.click(screen.getByRole('button', { name: 'Revisar' }));
  return screen.findByRole('dialog', { name: 'Revisar reporte' });
}

describe('CommunityModerationPage (Moderar comunidad)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no pending reports', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [] });
    renderPage();
    expect(await screen.findByText('No hay reportes pendientes')).toBeInTheDocument();
  });

  it('lists each report as a big row: what, whose, who reported it and why', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [REPORT] });
    renderPage();
    expect(await screen.findByText('contenido reportado')).toBeInTheDocument();
    expect(screen.getByText('Publicación de Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText(/Reportado por Luis Perez .* “ofensivo”/)).toBeInTheDocument();
  });

  it('dismissing keeps the content and removes the report from the queue', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [REPORT] });
    communityAdminClient.dismissReport.mockResolvedValue({ status: 'DISMISSED' });
    const user = userEvent.setup();
    renderPage();
    const panel = await openReview(user);
    await user.click(within(panel).getByRole('button', { name: 'Descartar el reporte' }));

    await waitFor(() =>
      expect(communityAdminClient.dismissReport).toHaveBeenCalledWith('report-1'),
    );
    expect(communityAdminClient.deletePost).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('contenido reportado')).not.toBeInTheDocument());
  });

  it('deleting a post asks for confirmation first, then calls deletePost', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [REPORT] });
    communityAdminClient.deletePost.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    const panel = await openReview(user);
    await user.click(within(panel).getByRole('button', { name: 'Eliminar publicación' }));
    expect(communityAdminClient.deletePost).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog', { name: '¿Eliminar esta publicación?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, eliminar publicación' }));
    await waitFor(() => expect(communityAdminClient.deletePost).toHaveBeenCalledWith('post-1'));
    await waitFor(() => expect(screen.queryByText('contenido reportado')).not.toBeInTheDocument());
  });

  it('a reported comment is deleted with deleteComment', async () => {
    communityAdminClient.listReports.mockResolvedValue({
      reports: [{ ...REPORT, targetType: 'COMMENT', targetId: 'comment-1' }],
    });
    communityAdminClient.deleteComment.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    const panel = await openReview(user);
    await user.click(within(panel).getByRole('button', { name: 'Eliminar comentario' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Eliminar este comentario?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, eliminar comentario' }));
    await waitFor(() =>
      expect(communityAdminClient.deleteComment).toHaveBeenCalledWith('comment-1'),
    );
  });

  it('a photo post hidden by 3 reports: shows its photos and can be shown again', async () => {
    communityAdminClient.listReports.mockResolvedValue({
      reports: [
        {
          ...REPORT,
          targetContent: '',
          targetHidden: true,
          targetHiddenReason: 'AUTO_REPORTS',
          targetMedia: [
            { id: 'm1', type: 'IMAGE', url: '/f1.webp', width: 1600, height: 1200, sortOrder: 0 },
          ],
          reason: 'Aparece un menor sin autorización',
        },
      ],
    });
    communityAdminClient.unhidePost.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Oculta por 3 reportes')).toBeInTheDocument();
    expect(screen.getByText(/con 1 foto/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Revisar' }));
    const panel = await screen.findByRole('dialog', { name: 'Revisar reporte' });
    expect(
      within(panel).getByRole('button', { name: 'Ver la foto en pantalla completa' }),
    ).toBeInTheDocument();
    // A post with only photos can still be deleted.
    expect(within(panel).getByRole('button', { name: 'Eliminar publicación' })).toBeEnabled();

    await user.click(within(panel).getByRole('button', { name: 'Mostrar de nuevo en el muro' }));
    await waitFor(() => expect(communityAdminClient.unhidePost).toHaveBeenCalledWith('post-1'));
    expect(
      await within(panel).findByRole('button', { name: 'Ocultar mientras reviso' }),
    ).toBeInTheDocument();
  });
});
