import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingClient } from '../../api/billingClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { PlansPage } from './PlansPage.jsx';

vi.mock('../../api/billingClient.js', () => ({
  billingClient: {
    listPlans: vi.fn(),
    createPlan: vi.fn(),
    listPlanPrices: vi.fn(),
    setPlanPrice: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <ToastProvider>
      <PlansPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  billingClient.listPlans.mockResolvedValue({
    plans: [
      { id: 'plan-1', code: 'INICIACION', name: 'Iniciación', currentPriceCop: 50000 },
      { id: 'plan-2', code: 'AVANZADO', name: 'Avanzado', currentPriceCop: null },
    ],
  });
  billingClient.listPlanPrices.mockResolvedValue({
    prices: [{ id: 'pr-1', basePriceCop: 50000, validFrom: '2026-01-01', validTo: null }],
  });
});

describe('PlansPage (Planes de membresía)', () => {
  it('lists plans with their price, or that they have none', async () => {
    renderPage();
    expect(await screen.findByText('Precio: $ 50.000')).toBeInTheDocument();
    expect(screen.getByText('Sin precio')).toBeInTheDocument();
    expect(screen.getByText(/Código INICIACION/)).toBeInTheDocument();
  });

  it('creates a plan from the side panel', async () => {
    billingClient.createPlan.mockResolvedValue({ id: 'plan-3' });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Nuevo plan' }));
    const panel = await screen.findByRole('dialog', { name: 'Nuevo plan' });
    await user.type(within(panel).getByLabelText(/Nombre del plan/), 'Competencia');
    await user.type(within(panel).getByLabelText(/Código/), 'comp');
    await user.click(within(panel).getByRole('button', { name: 'Crear plan' }));
    await waitFor(() =>
      expect(billingClient.createPlan).toHaveBeenCalledWith({
        code: 'COMP',
        name: 'Competencia',
        description: undefined,
      }),
    );
  });

  it('changes a price after confirming, and shows the price history', async () => {
    billingClient.setPlanPrice.mockResolvedValue({ id: 'pr-2', basePriceCop: 60000 });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cambiar precio' }));
    const panel = await screen.findByRole('dialog', { name: 'Precio de Iniciación' });
    expect(await within(panel).findByText(/vigente/)).toBeInTheDocument();
    expect(billingClient.listPlanPrices).toHaveBeenCalledWith('plan-1');

    await user.type(within(panel).getByLabelText(/Nuevo precio/), '60000');
    fireEvent.change(within(panel).getByLabelText('Aplica desde'), {
      target: { value: '2026-10-01' },
    });
    await user.click(within(panel).getByRole('button', { name: 'Guardar precio' }));
    expect(billingClient.setPlanPrice).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog', {
      name: '¿Cambiar el precio de Iniciación?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cambiar precio' }));
    await waitFor(() =>
      expect(billingClient.setPlanPrice).toHaveBeenCalledWith('plan-1', {
        basePriceCop: 60000,
        validFrom: '2026-10-01',
      }),
    );
  });
});
