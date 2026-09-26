import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../../api/affiliationClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { RequestsPage } from './RequestsPage.jsx';

vi.mock('../../api/affiliationClient.js', () => ({
  affiliationClient: { listRequests: vi.fn(), decideRequest: vi.fn() },
}));
vi.mock('../../api/guardianshipClient.js', () => ({
  guardianshipClient: { listGuardianships: vi.fn(), decideGuardianship: vi.fn() },
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

function renderPage() {
  return render(
    <ToastProvider>
      <RequestsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  affiliationClient.listRequests.mockResolvedValue({ requests: [AFFILIATION_REQUEST] });
  guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [GUARDIANSHIP] });
});

describe('RequestsPage (Solicitudes)', () => {
  it('lists pending affiliations and guardianships as big rows', async () => {
    renderPage();
    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText('padre@example.com → hijo@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pide poder reservar canchas')).toBeInTheDocument();
    expect(affiliationClient.listRequests).toHaveBeenCalledWith('PENDING');
    expect(guardianshipClient.listGuardianships).toHaveBeenCalledWith('PENDING');
  });

  it('approving an affiliation asks first, then removes it from the list', async () => {
    affiliationClient.decideRequest.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    const list = await screen.findByRole('list', { name: 'Quieren ser jugadores' });
    await user.click(within(list).getByRole('button', { name: 'Revisar' }));

    const panel = await screen.findByRole('dialog', { name: 'Revisar solicitud' });
    expect(within(panel).getByText('Su mensaje: “Quiero unirme”')).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Aprobar' }));
    expect(affiliationClient.decideRequest).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog', { name: '¿Aprobar la solicitud?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, aprobar' }));
    await waitFor(() =>
      expect(affiliationClient.decideRequest).toHaveBeenCalledWith('req-1', {
        decision: 'APPROVED',
      }),
    );
    await waitFor(() => expect(within(list).queryByText('Ana Gomez')).not.toBeInTheDocument());
  });

  it('rejecting a guardianship sends the optional note', async () => {
    guardianshipClient.decideGuardianship.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    const list = await screen.findByRole('list', { name: 'Vinculaciones familiares' });
    await user.click(within(list).getByRole('button', { name: 'Revisar' }));

    const panel = await screen.findByRole('dialog', { name: 'Revisar solicitud' });
    await user.type(within(panel).getByLabelText(/Nota para el registro/), 'No es su acudiente');
    await user.click(within(panel).getByRole('button', { name: 'Rechazar' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Rechazar la solicitud?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, rechazar' }));

    await waitFor(() =>
      expect(guardianshipClient.decideGuardianship).toHaveBeenCalledWith('guard-1', {
        decision: 'REJECTED',
        notes: 'No es su acudiente',
      }),
    );
    await waitFor(() =>
      expect(
        within(list).queryByText('padre@example.com → hijo@example.com'),
      ).not.toBeInTheDocument(),
    );
  });

  it('says so when there is nothing pending', async () => {
    affiliationClient.listRequests.mockResolvedValue({ requests: [] });
    guardianshipClient.listGuardianships.mockResolvedValue({ guardianships: [] });
    renderPage();
    expect(
      await screen.findByText('No hay solicitudes de afiliación pendientes'),
    ).toBeInTheDocument();
    expect(screen.getByText('No hay vinculaciones pendientes')).toBeInTheDocument();
  });
});
