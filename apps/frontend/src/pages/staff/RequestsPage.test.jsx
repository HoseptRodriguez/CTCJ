import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../../api/affiliationClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';

import { RequestsPage } from './RequestsPage.jsx';

vi.mock('../../api/affiliationClient.js', () => ({
  affiliationClient: {
    listRequests: vi.fn(),
    decideRequest: vi.fn(),
  },
}));

vi.mock('../../api/guardianshipClient.js', () => ({
  guardianshipClient: {
    listGuardianships: vi.fn(),
    decideGuardianship: vi.fn(),
  },
}));

const AFFILIATION_REQUEST = {
  id: 'req-1',
  userId: 'user-1',
  userEmail: 'ana@example.com',
  userFirstName: 'Ana',
  userLastName: 'Gomez',
  status: 'PENDING',
  requestedAt: '2026-08-01T10:00:00.000Z',
  notes: 'Quiero unirme',
};

const GUARDIANSHIP = {
  id: 'guard-1',
  guardianEmail: 'padre@example.com',
  minorEmail: 'hijo@example.com',
  canPay: false,
  canBook: true,
  status: 'PENDING',
  requestedAt: '2026-08-01T10:00:00.000Z',
};

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending affiliation requests and guardianships', async () => {
    affiliationClient.listRequests.mockResolvedValue({ requests: [AFFILIATION_REQUEST] });
    guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [GUARDIANSHIP] });

    render(<RequestsPage />);

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText(/padre@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/hijo@example.com/)).toBeInTheDocument();
    expect(affiliationClient.listRequests).toHaveBeenCalledWith('PENDING');
    expect(guardianshipClient.listGuardianships).toHaveBeenCalledWith('PENDING');
  });

  it('approving an affiliation request removes it from the pending list', async () => {
    affiliationClient.listRequests.mockResolvedValue({ requests: [AFFILIATION_REQUEST] });
    guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [] });
    affiliationClient.decideRequest.mockResolvedValue({ id: 'req-1', status: 'APPROVED' });

    const user = userEvent.setup();
    render(<RequestsPage />);

    await screen.findByText('Ana Gomez');
    await user.click(screen.getByRole('button', { name: 'Aprobar' }));

    await waitFor(() =>
      expect(affiliationClient.decideRequest).toHaveBeenCalledWith('req-1', {
        decision: 'APPROVED',
      }),
    );
    await waitFor(() => expect(screen.queryByText('Ana Gomez')).not.toBeInTheDocument());
  });

  it('rejecting a guardianship removes it from the pending list', async () => {
    affiliationClient.listRequests.mockResolvedValue({ requests: [] });
    guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [GUARDIANSHIP] });
    guardianshipClient.decideGuardianship.mockResolvedValue({ id: 'guard-1', status: 'REJECTED' });

    const user = userEvent.setup();
    render(<RequestsPage />);

    await screen.findByText(/padre@example.com/);
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));

    await waitFor(() =>
      expect(guardianshipClient.decideGuardianship).toHaveBeenCalledWith('guard-1', {
        decision: 'REJECTED',
      }),
    );
    await waitFor(() => expect(screen.queryByText(/padre@example.com/)).not.toBeInTheDocument());
  });

  it('shows the empty state when there is nothing pending', async () => {
    affiliationClient.listRequests.mockResolvedValue({ requests: [] });
    guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [] });

    render(<RequestsPage />);

    expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument();
    expect(screen.getByText('No hay vinculaciones pendientes.')).toBeInTheDocument();
  });
});
