import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingClient } from '../../api/billingClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

import { MembershipStatusPage } from './MembershipStatusPage.jsx';

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: {
    lookupUser: vi.fn(),
    setMembershipStatus: vi.fn(),
    getOverduePolicy: vi.fn(),
    setOverduePolicy: vi.fn(),
  },
}));

vi.mock('../../api/billingClient.js', () => ({
  billingClient: {
    listMemberships: vi.fn(),
    listPlans: vi.fn(),
    enrollPlayer: vi.fn(),
    listInvoices: vi.fn(),
    generateInvoice: vi.fn(),
    recordInvoicePayment: vi.fn(),
    cancelInvoice: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const PLAYER = {
  id: 'user-1',
  email: 'jugador@example.com',
  firstName: 'Ana',
  lastName: 'Gomez',
  roleCodes: ['USUARIO', 'JUGADOR'],
  membershipStatus: null,
};

function renderAsAdmin() {
  useAuth.mockReturnValue({ user: { id: 'admin-1', roles: ['ADMINISTRADOR'] } });
  membershipClient.getOverduePolicy.mockResolvedValue({ enabled: false });
  return render(<MembershipStatusPage />);
}

async function searchFor(user, email) {
  await user.type(screen.getByLabelText('Correo del jugador'), email);
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
}

describe('MembershipStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billingClient.listMemberships.mockResolvedValue({ memberships: [] });
    billingClient.listPlans.mockResolvedValue({ plans: [] });
    billingClient.listInvoices.mockResolvedValue({ invoices: [] });
  });

  it('admin: looks up a player and can set a new status', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    membershipClient.setMembershipStatus.mockResolvedValue({
      userId: PLAYER.id,
      membershipStatus: 'OVERDUE',
    });

    const user = userEvent.setup();
    renderAsAdmin();
    await waitFor(() => expect(membershipClient.getOverduePolicy).toHaveBeenCalled());

    await searchFor(user, PLAYER.email);

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText(PLAYER.email)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado de membresía'), 'Vencido');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(membershipClient.setMembershipStatus).toHaveBeenCalledWith(PLAYER.id, 'OVERDUE'),
    );
    expect(await screen.findByText('Estado actualizado.')).toBeInTheDocument();
  });

  it('shows a Spanish error when the email is not found', async () => {
    const notFound = new Error('not found');
    notFound.code = 'user_not_found';
    membershipClient.lookupUser.mockRejectedValue(notFound);

    const user = userEvent.setup();
    renderAsAdmin();
    await waitFor(() => expect(membershipClient.getOverduePolicy).toHaveBeenCalled());

    await searchFor(user, 'nadie@example.com');

    expect(
      await screen.findByText('No se encontró ningún usuario con ese correo.'),
    ).toBeInTheDocument();
  });

  it('admin: can toggle the overdue booking policy', async () => {
    membershipClient.getOverduePolicy.mockResolvedValue({ enabled: false });
    membershipClient.setOverduePolicy.mockResolvedValue({ enabled: true });

    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { id: 'admin-1', roles: ['ADMINISTRADOR'] } });
    render(<MembershipStatusPage />);

    expect(await screen.findByText('Desactivado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activar bloqueo' }));

    await waitFor(() => expect(membershipClient.setOverduePolicy).toHaveBeenCalledWith(true));
    expect(await screen.findByText('Activo')).toBeInTheDocument();
  });

  it('RECEPCION can look up a player but has no write controls', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    useAuth.mockReturnValue({ user: { id: 'staff-1', roles: ['RECEPCION'] } });

    const user = userEvent.setup();
    render(<MembershipStatusPage />);

    await searchFor(user, PLAYER.email);

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.queryByLabelText('Estado de membresía')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
    expect(screen.queryByText('Bloqueo de reservas por mora')).not.toBeInTheDocument();
    expect(membershipClient.getOverduePolicy).not.toHaveBeenCalled();
  });

  const MEMBERSHIP = {
    id: 'membership-1',
    planName: 'Iniciación',
    currentPriceCop: 100000,
    status: 'ACTIVE',
  };

  it('admin: generates an invoice for an enrolled membership', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    billingClient.listMemberships.mockResolvedValue({ memberships: [MEMBERSHIP] });
    billingClient.generateInvoice.mockResolvedValue({ id: 'invoice-1' });

    const user = userEvent.setup();
    renderAsAdmin();
    await waitFor(() => expect(membershipClient.getOverduePolicy).toHaveBeenCalled());

    await searchFor(user, PLAYER.email);
    expect(await screen.findByText('Sin facturas generadas todavía.')).toBeInTheDocument();

    // Date inputs have sr-only labels with per-membership ids; query via the form instead.
    const form = screen.getByText('Generar factura').closest('form');
    const dateInputs = form.querySelectorAll('input[type="date"]');
    await user.type(dateInputs[0], '2026-03-01');
    await user.type(dateInputs[1], '2026-04-01');
    await user.type(dateInputs[2], '2026-03-05');
    await user.click(screen.getByRole('button', { name: 'Generar factura' }));

    await waitFor(() =>
      expect(billingClient.generateInvoice).toHaveBeenCalledWith('membership-1', {
        periodStart: '2026-03-01',
        periodEnd: '2026-04-01',
        dueDate: '2026-03-05',
      }),
    );
  });

  it('admin: records a payment and can cancel a PENDING invoice', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    billingClient.listMemberships.mockResolvedValue({ memberships: [MEMBERSHIP] });
    billingClient.listInvoices.mockResolvedValue({
      invoices: [{ id: 'invoice-1', status: 'PENDING', amountCop: 100000, dueDate: '2026-03-05' }],
    });
    billingClient.recordInvoicePayment.mockResolvedValue({ id: 'invoice-1', status: 'PAID' });
    billingClient.cancelInvoice.mockResolvedValue({ id: 'invoice-1', status: 'CANCELLED' });

    const user = userEvent.setup();
    renderAsAdmin();
    await waitFor(() => expect(membershipClient.getOverduePolicy).toHaveBeenCalled());

    await searchFor(user, PLAYER.email);
    const facturas = (await screen.findByText('Facturas')).closest('div');
    expect(within(facturas).getByText('Pendiente')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Registrar pago' }));
    await waitFor(() =>
      expect(billingClient.recordInvoicePayment).toHaveBeenCalledWith('invoice-1', {
        method: 'CASH',
        notes: undefined,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Anular' }));
    await user.type(screen.getByPlaceholderText('Motivo de anulación'), 'error de digitación');
    await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }));

    await waitFor(() =>
      expect(billingClient.cancelInvoice).toHaveBeenCalledWith('invoice-1', {
        reason: 'error de digitación',
      }),
    );
  });

  it('RECEPCION sees "Registrar pago" but not "Generar factura" or "Anular"', async () => {
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    billingClient.listMemberships.mockResolvedValue({ memberships: [MEMBERSHIP] });
    billingClient.listInvoices.mockResolvedValue({
      invoices: [{ id: 'invoice-1', status: 'PENDING', amountCop: 100000, dueDate: '2026-03-05' }],
    });
    useAuth.mockReturnValue({ user: { id: 'staff-1', roles: ['RECEPCION'] } });

    const user = userEvent.setup();
    render(<MembershipStatusPage />);
    await searchFor(user, PLAYER.email);

    expect(await screen.findByRole('button', { name: 'Registrar pago' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generar factura' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
  });
});
