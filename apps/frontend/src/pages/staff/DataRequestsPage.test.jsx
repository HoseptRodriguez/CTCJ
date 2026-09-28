import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { privacyClient } from '../../api/privacyClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { DataRequestsPage, deadlineBadge } from './DataRequestsPage.jsx';

vi.mock('../../api/privacyClient.js', () => ({
  privacyClient: { listDataRequests: vi.fn(), answerDataRequest: vi.fn() },
}));

const base = {
  requestType: 'RECLAMO',
  status: 'RECIBIDA',
  receivedAt: '2026-09-28T15:00:00Z',
  answer: null,
  requester: { firstName: 'Ana', lastName: 'Ruiz', email: 'ana@example.com' },
};
const OVERDUE = {
  ...base,
  id: 'r1',
  radicado: 'CTCJ-2026-00001',
  kind: 'CORRECCION',
  description: 'Mi teléfono está mal.',
  dueOn: '2026-10-13',
  alert: 'OVERDUE',
  businessDaysLeft: -2,
};
const DELETION = {
  ...base,
  id: 'r2',
  radicado: 'CTCJ-2026-00002',
  kind: 'SUPRESION',
  description: 'Quiero eliminar mi cuenta.',
  dueOn: '2026-10-20',
  alert: 'ON_TIME',
  businessDaysLeft: 8,
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <DataRequestsPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  privacyClient.listDataRequests.mockResolvedValue({ requests: [OVERDUE, DELETION] });
});

describe('Datos personales (bandeja)', () => {
  it('says the deadline in words', () => {
    expect(deadlineBadge({ alert: 'OVERDUE', businessDaysLeft: -1 }).label).toBe(
      'Vencida hace 1 día hábil',
    );
    expect(deadlineBadge({ alert: 'DUE_SOON', businessDaysLeft: 0 }).label).toBe('Vence hoy');
    expect(deadlineBadge({ alert: 'DUE_SOON', businessDaysLeft: 2 })).toEqual({
      status: 'vencida',
      label: 'Vence en 2 días hábiles',
    });
    expect(deadlineBadge({ alert: 'ANSWERED' }).label).toBe('Respondida');
  });

  it('warns about the late ones and lists who asked', async () => {
    renderPage();
    expect(await screen.findByText(/1 solicitud está vencida o por vencer/)).toBeInTheDocument();
    expect(screen.getByText('Vencida hace 2 días hábiles')).toBeInTheDocument();
    expect(screen.getByText('Vence en 8 días hábiles')).toBeInTheDocument();
    expect(screen.getAllByText(/Ana Ruiz · ana@example.com/)).toHaveLength(2);
  });

  it('answering needs a text; a deletion can delete the account, confirmed as irreversible', async () => {
    const user = userEvent.setup();
    privacyClient.answerDataRequest.mockResolvedValue({
      ...DELETION,
      status: 'RESPONDIDA',
      alert: 'ANSWERED',
      answer: 'Eliminamos tu cuenta.',
    });
    renderPage();
    const row = (await screen.findByText(/CTCJ-2026-00002/)).closest('li');
    await user.click(within(row).getByRole('button', { name: 'Responder' }));

    await user.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe la respuesta');

    await user.type(screen.getByLabelText('Respuesta para la persona'), 'Eliminamos tu cuenta.');
    await user.click(screen.getByRole('checkbox', { name: /Eliminar la cuenta al enviar/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/no se puede deshacer/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, eliminar cuenta' }));
    expect(privacyClient.answerDataRequest).toHaveBeenCalledWith('r2', {
      status: 'RESPONDIDA',
      answer: 'Eliminamos tu cuenta.',
      eraseAccount: true,
    });
    expect(await screen.findByText('Respondida')).toBeInTheDocument();
  });
});
