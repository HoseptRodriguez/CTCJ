import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingClient } from '../../api/billingClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';
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
    listInvoicesClubWide: vi.fn(),
    generateInvoice: vi.fn(),
    recordInvoicePayment: vi.fn(),
    cancelInvoice: vi.fn(),
  },
}));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

const PLAYER = {
  id: 'user-1',
  email: 'jugador@example.com',
  firstName: 'Ana',
  lastName: 'Gomez',
  roleCodes: ['USUARIO', 'JUGADOR'],
  membershipStatus: null,
};
const MEMBERSHIP = {
  id: '33333333-3333-4333-8333-333333333333',
  planName: 'Iniciación',
  currentPriceCop: 150000,
  status: 'ACTIVE',
};
const INVOICE = { id: 'inv-1', amountCop: 150000, dueDate: '2099-01-05', status: 'PENDING' };

function renderAs(roles, path = '/staff/membresias') {
  useAuth.mockReturnValue({ user: { id: 'staff-1', roles } });
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <MembershipStatusPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function searchFor(user, email) {
  await user.type(screen.getByLabelText('Correo del jugador'), email);
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  membershipClient.getOverduePolicy.mockResolvedValue({ enabled: false });
  membershipClient.lookupUser.mockResolvedValue(PLAYER);
  billingClient.listMemberships.mockResolvedValue({ memberships: [] });
  billingClient.listPlans.mockResolvedValue({ plans: [] });
  billingClient.listInvoices.mockResolvedValue({ invoices: [] });
  billingClient.listInvoicesClubWide.mockResolvedValue({
    invoices: [{ ...INVOICE, id: 'inv-9', playerFirstName: 'Luis', playerLastName: 'Paz' }],
    totalCop: 150000,
    count: 1,
  });
});

describe('MembershipStatusPage (Membresías)', () => {
  it('before searching, lists the invoices to collect with "Registrar pago"', async () => {
    renderAs(['RECEPCION']);
    expect(await screen.findByText('Luis Paz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar pago' })).toBeInTheDocument();
  });

  it('admin: finds a player and changes the status after confirming', async () => {
    membershipClient.setMembershipStatus.mockResolvedValue({ membershipStatus: 'ACTIVE' });
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await searchFor(user, PLAYER.email);

    expect(await screen.findByRole('heading', { name: 'Ana Gomez' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cambiar estado' }));
    const panel = await screen.findByRole('dialog', { name: 'Cambiar estado de membresía' });
    await user.click(within(panel).getByRole('radio', { name: /Al día/ }));
    await user.click(within(panel).getByRole('button', { name: 'Guardar estado' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Cambiar el estado?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cambiar estado' }));
    await waitFor(() =>
      expect(membershipClient.setMembershipStatus).toHaveBeenCalledWith('user-1', 'ACTIVE'),
    );
  });

  it('opens the player from the top search link (?correo=)', async () => {
    renderAs(['RECEPCION'], '/staff/membresias?correo=jugador%40example.com');
    expect(await screen.findByRole('heading', { name: 'Ana Gomez' })).toBeInTheDocument();
    expect(membershipClient.lookupUser).toHaveBeenCalledWith('jugador@example.com');
  });

  it('shows a clear error when the e-mail is not found', async () => {
    membershipClient.lookupUser.mockRejectedValue(
      Object.assign(new Error('x'), { status: 404, code: 'USER_NOT_FOUND' }),
    );
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await searchFor(user, 'nadie@example.com');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('admin: toggles the overdue booking policy after confirming', async () => {
    membershipClient.setOverduePolicy.mockResolvedValue({ enabled: true });
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await user.click(await screen.findByRole('button', { name: 'Activar bloqueo' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: '¿Activar el bloqueo por mora?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, activar' }));
    await waitFor(() => expect(membershipClient.setOverduePolicy).toHaveBeenCalledWith(true));
    expect(await screen.findByRole('button', { name: 'Desactivar bloqueo' })).toBeInTheDocument();
  });

  it('Recepción: can record payments, but cannot change status, invoices or the policy', async () => {
    billingClient.listMemberships.mockResolvedValue({ memberships: [MEMBERSHIP] });
    billingClient.listInvoices.mockResolvedValue({ invoices: [INVOICE] });
    const user = userEvent.setup();
    renderAs(['RECEPCION']);
    await searchFor(user, PLAYER.email);

    expect(await screen.findByRole('button', { name: 'Registrar pago' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar estado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generar factura' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
    expect(screen.queryByText('Bloqueo de reservas por mora')).not.toBeInTheDocument();
  });

  it('records an invoice payment with the chosen method', async () => {
    billingClient.listMemberships.mockResolvedValue({ memberships: [MEMBERSHIP] });
    billingClient.listInvoices.mockResolvedValue({ invoices: [INVOICE] });
    billingClient.recordInvoicePayment.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await searchFor(user, PLAYER.email);

    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }));
    const panel = await screen.findByRole('dialog', { name: 'Registrar pago de Ana Gomez' });
    await user.click(within(panel).getByRole('radio', { name: 'Transferencia' }));
    await user.click(within(panel).getByRole('button', { name: 'Marcar como pagada' }));
    await waitFor(() =>
      expect(billingClient.recordInvoicePayment).toHaveBeenCalledWith('inv-1', {
        method: 'TRANSFER',
      }),
    );
  });

  it('admin: cancelling an invoice needs a reason', async () => {
    billingClient.listMemberships.mockResolvedValue({ memberships: [MEMBERSHIP] });
    billingClient.listInvoices.mockResolvedValue({ invoices: [INVOICE] });
    billingClient.cancelInvoice.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await searchFor(user, PLAYER.email);

    await user.click(await screen.findByRole('button', { name: 'Anular' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Anular la factura?' });
    await user.type(within(dialog).getByLabelText('Motivo'), 'Cobro duplicado');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, anular factura' }));
    await waitFor(() =>
      expect(billingClient.cancelInvoice).toHaveBeenCalledWith('inv-1', {
        reason: 'Cobro duplicado',
      }),
    );
  });

  it('admin: generates an invoice for the membership', async () => {
    billingClient.listMemberships.mockResolvedValue({ memberships: [MEMBERSHIP] });
    billingClient.generateInvoice.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['ADMINISTRADOR']);
    await searchFor(user, PLAYER.email);

    await user.click(await screen.findByRole('button', { name: 'Generar factura' }));
    const panel = await screen.findByRole('dialog', { name: 'Generar factura' });
    await user.click(within(panel).getByRole('button', { name: 'Generar factura' }));
    await waitFor(() =>
      expect(billingClient.generateInvoice).toHaveBeenCalledWith(
        MEMBERSHIP.id,
        expect.objectContaining({
          periodStart: expect.any(String),
          periodEnd: expect.any(String),
          dueDate: expect.any(String),
        }),
      ),
    );
  });
});
