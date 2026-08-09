import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityAdminClient } from '../../api/communityAdminClient.js';

import { CommunityModerationPage } from './CommunityModerationPage.jsx';

vi.mock('../../api/communityAdminClient.js', () => ({
  communityAdminClient: {
    listReports: vi.fn(),
    dismissReport: vi.fn(),
    deletePost: vi.fn(),
    deleteComment: vi.fn(),
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

describe('CommunityModerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no pending reports', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [] });
    render(<CommunityModerationPage />);
    expect(await screen.findByText('No hay reportes pendientes.')).toBeInTheDocument();
  });

  it('renders a pending report with target content, author, and reporter', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [REPORT] });
    render(<CommunityModerationPage />);

    expect(await screen.findByText('contenido reportado')).toBeInTheDocument();
    expect(screen.getByText(/Publicación de Ana Gomez/)).toBeInTheDocument();
    expect(screen.getByText(/Reportado por Luis Perez/)).toBeInTheDocument();
    expect(screen.getByText('“ofensivo”')).toBeInTheDocument();
  });

  it('dismissing a report removes it from the queue without deleting content', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [REPORT] });
    communityAdminClient.dismissReport.mockResolvedValue({ status: 'DISMISSED' });
    const user = userEvent.setup();

    render(<CommunityModerationPage />);
    await screen.findByText('contenido reportado');
    await user.click(screen.getByRole('button', { name: 'Descartar reporte' }));

    await waitFor(() =>
      expect(communityAdminClient.dismissReport).toHaveBeenCalledWith('report-1'),
    );
    expect(communityAdminClient.deletePost).not.toHaveBeenCalled();
    expect(screen.queryByText('contenido reportado')).not.toBeInTheDocument();
  });

  it('deleting the content calls deletePost for a POST target', async () => {
    communityAdminClient.listReports.mockResolvedValue({ reports: [REPORT] });
    communityAdminClient.deletePost.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CommunityModerationPage />);
    await screen.findByText('contenido reportado');
    await user.click(screen.getByRole('button', { name: 'Eliminar contenido' }));

    await waitFor(() => expect(communityAdminClient.deletePost).toHaveBeenCalledWith('post-1'));
    expect(screen.queryByText('contenido reportado')).not.toBeInTheDocument();
  });

  it('deleting the content calls deleteComment for a COMMENT target', async () => {
    communityAdminClient.listReports.mockResolvedValue({
      reports: [{ ...REPORT, targetType: 'COMMENT', targetId: 'comment-1' }],
    });
    communityAdminClient.deleteComment.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CommunityModerationPage />);
    await screen.findByText('contenido reportado');
    await user.click(screen.getByRole('button', { name: 'Eliminar contenido' }));

    await waitFor(() =>
      expect(communityAdminClient.deleteComment).toHaveBeenCalledWith('comment-1'),
    );
  });
});
