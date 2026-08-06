import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { affiliationClient } from '../api/affiliationClient.js';
import { billingClient } from '../api/billingClient.js';
import { bookingClient } from '../api/bookingClient.js';
import { clinicalClient } from '../api/clinicalClient.js';
import { coachingClient } from '../api/coachingClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { membershipClient } from '../api/membershipClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import { MyCtcjPage } from './MyCtcjPage.jsx';

function renderPage() {
  return render(
    <MemoryRouter>
      <MyCtcjPage />
    </MemoryRouter>,
  );
}

vi.mock('../api/bookingClient.js', () => ({
  bookingClient: { getSchedule: vi.fn() },
}));

vi.mock('../api/membershipClient.js', () => ({
  membershipClient: { getMyStatus: vi.fn() },
}));

vi.mock('../api/affiliationClient.js', () => ({
  affiliationClient: { getMyRequests: vi.fn(), submitRequest: vi.fn() },
}));

vi.mock('../api/guardianshipClient.js', () => ({
  guardianshipClient: { listMine: vi.fn(), requestGuardianship: vi.fn() },
}));

vi.mock('../api/billingClient.js', () => ({
  billingClient: { getMyMemberships: vi.fn(), getMyInvoices: vi.fn() },
}));

vi.mock('../api/coachingClient.js', () => ({
  coachingClient: { getMyNotes: vi.fn(), getMyPerformance: vi.fn() },
}));

vi.mock('../api/clinicalClient.js', () => ({
  clinicalClient: { getMyAppointments: vi.fn(), getMyNotes: vi.fn() },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

describe('MyCtcjPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.getSchedule.mockResolvedValue({ reservations: [] });
    affiliationClient.getMyRequests.mockResolvedValue({ requests: [] });
    guardianshipClient.listMine.mockResolvedValue({ guardianships: [] });
    billingClient.getMyMemberships.mockResolvedValue({ memberships: [] });
    billingClient.getMyInvoices.mockResolvedValue({ invoices: [] });
    coachingClient.getMyNotes.mockResolvedValue({ notes: [] });
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [],
      summary: { ratedAreas: [], latestByArea: {}, progressByArea: {} },
    });
    clinicalClient.getMyAppointments.mockResolvedValue({ appointments: [] });
    clinicalClient.getMyNotes.mockResolvedValue({ notes: [] });
  });

  it('shows a JUGADOR their own membership status', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: 'OVERDUE' });

    renderPage();

    expect(await screen.findByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('Estado de membresía:')).toBeInTheDocument();
  });

  it('shows "Sin membresía" for a JUGADOR not yet enrolled (null status)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Sin membresía')).toBeInTheDocument();
  });

  it('never shows a membership status for a plain USUARIO', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(screen.queryByText('Estado de membresía:')).not.toBeInTheDocument();
  });

  it('a plain USUARIO sees the affiliation request form and can submit it', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    affiliationClient.submitRequest.mockResolvedValue({ id: 'req-1', status: 'PENDING' });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Afiliación a la academia')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Solicitar afiliación' }));

    await waitFor(() =>
      expect(affiliationClient.submitRequest).toHaveBeenCalledWith({ notes: undefined }),
    );
  });

  it('a JUGADOR does not see the affiliation section', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(screen.queryByText('Afiliación a la academia')).not.toBeInTheDocument();
  });

  it('can request a guardianship link and see it listed', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    guardianshipClient.requestGuardianship.mockResolvedValue({ id: 'g1', status: 'PENDING' });
    guardianshipClient.listMine.mockResolvedValueOnce({ guardianships: [] }).mockResolvedValueOnce({
      guardianships: [{ id: 'g1', minorEmail: 'hijo@example.com', status: 'PENDING' }],
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Cuentas vinculadas')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Correo del menor'), 'hijo@example.com');
    await user.click(screen.getByRole('button', { name: 'Solicitar vinculación' }));

    await waitFor(() =>
      expect(guardianshipClient.requestGuardianship).toHaveBeenCalledWith({
        minorEmail: 'hijo@example.com',
        canPay: false,
        canBook: true,
      }),
    );
    expect(await screen.findByText('hijo@example.com')).toBeInTheDocument();
  });

  it('a JUGADOR with an active plan sees "Mi plan"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    billingClient.getMyMemberships.mockResolvedValue({
      memberships: [{ id: 'm1', planName: 'Iniciación', currentPriceCop: 50000, status: 'ACTIVE' }],
    });

    renderPage();

    expect(await screen.findByText('Mi plan')).toBeInTheDocument();
    expect(screen.getByText('Iniciación')).toBeInTheDocument();
  });

  it('does not show "Mi plan" when there are no memberships', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(billingClient.getMyMemberships).toHaveBeenCalled());
    expect(screen.queryByText('Mi plan')).not.toBeInTheDocument();
  });

  it('shows the player their own invoices, read-only, under "Mi plan"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    billingClient.getMyMemberships.mockResolvedValue({
      memberships: [{ id: 'm1', planName: 'Iniciación', currentPriceCop: 50000, status: 'ACTIVE' }],
    });
    billingClient.getMyInvoices.mockResolvedValue({
      invoices: [
        {
          id: 'inv1',
          membershipId: 'm1',
          status: 'PENDING',
          amountCop: 50000,
          dueDate: '2026-03-05',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Mi plan')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar pago/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anular/i })).not.toBeInTheDocument();
  });

  it('a JUGADOR with notes sees "Mis notas", read-only', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    coachingClient.getMyNotes.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          noteType: 'RECOMMENDATION',
          content: 'Sigue trabajando el saque.',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Mis notas')).toBeInTheDocument();
    expect(screen.getByText('Sigue trabajando el saque.')).toBeInTheDocument();
  });

  it('does not show "Mis notas" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(coachingClient.getMyNotes).toHaveBeenCalled());
    expect(screen.queryByText('Mis notas')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Mis notas" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(coachingClient.getMyNotes).not.toHaveBeenCalled();
  });

  it('a JUGADOR with no ratings sees the "Mi rendimiento" empty state', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    expect(await screen.findByText('Mi rendimiento')).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes evaluaciones registradas.')).toBeInTheDocument();
  });

  it('a JUGADOR with ratings sees qualitative bands, not bare numbers', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [{ id: 'r1', area: 'SERVE', rating: 8, recordedAt: '2026-03-01T00:00:00.000Z' }],
      summary: { ratedAreas: ['SERVE'], latestByArea: { SERVE: 8 }, progressByArea: {} },
    });

    renderPage();

    const areaLabel = await screen.findByText('Saque');
    expect(areaLabel).toBeInTheDocument();
    const bandLabel = screen.getByText('Muy bueno');
    expect(bandLabel).toBeInTheDocument();
    // The band list item itself must show the qualitative label, not the raw
    // "8" -- the chart's own axis ticks legitimately render numbers and are
    // out of scope for this assertion.
    expect(bandLabel.closest('li')).toHaveTextContent('Saque');
    expect(bandLabel.closest('li')).not.toHaveTextContent('8');
  });

  it('a plain USUARIO never sees "Mi rendimiento" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(coachingClient.getMyPerformance).not.toHaveBeenCalled();
  });

  it('a JUGADOR with a scheduled appointment sees "Mis citas"', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    clinicalClient.getMyAppointments.mockResolvedValue({
      appointments: [
        {
          id: 'appt-1',
          status: 'SCHEDULED',
          periodStart: '2026-03-01T15:00:00.000Z',
          practitionerName: 'Dra. Sofia Reyes',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Mis citas')).toBeInTheDocument();
    expect(screen.getByText(/Dra. Sofia Reyes/)).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
  });

  it('does not show "Mis citas" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(clinicalClient.getMyAppointments).toHaveBeenCalled());
    expect(screen.queryByText('Mis citas')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Mis citas" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(clinicalClient.getMyAppointments).not.toHaveBeenCalled();
  });

  it('a JUGADOR with a visible clinical note sees "Notas de psicología", read-only', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });
    clinicalClient.getMyNotes.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          noteType: 'RECOMMENDATION',
          content: 'Practica ejercicios de respiración antes de competir.',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Notas de psicología')).toBeInTheDocument();
    expect(
      screen.getByText('Practica ejercicios de respiración antes de competir.'),
    ).toBeInTheDocument();
  });

  it('does not show "Notas de psicología" when there are none', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO', 'JUGADOR'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(clinicalClient.getMyNotes).toHaveBeenCalled());
    expect(screen.queryByText('Notas de psicología')).not.toBeInTheDocument();
  });

  it('a plain USUARIO never sees "Notas de psicología" (never fetched)', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1', roles: ['USUARIO'] } });
    membershipClient.getMyStatus.mockResolvedValue({ status: null });

    renderPage();

    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
    expect(clinicalClient.getMyNotes).not.toHaveBeenCalled();
  });
});
