import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { billingClient } from '../../api/billingClient.js';

import { PlansPage } from './PlansPage.jsx';

vi.mock('../../api/billingClient.js', () => ({
  billingClient: {
    listPlans: vi.fn(),
    createPlan: vi.fn(),
    listPlanPrices: vi.fn(),
    setPlanPrice: vi.fn(),
  },
}));

describe('PlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plans with their current price, or "sin precio" when unset', async () => {
    billingClient.listPlans.mockResolvedValue({
      plans: [
        { id: 'plan-1', code: 'INICIACION', name: 'Iniciación', currentPriceCop: 50000 },
        { id: 'plan-2', code: 'AVANZADO', name: 'Avanzado', currentPriceCop: null },
      ],
    });

    render(<PlansPage />);

    await waitFor(() => expect(screen.getByText('Iniciación')).toBeInTheDocument());
    expect(screen.getByText(/Precio actual:.*50\.000/)).toBeInTheDocument();
    expect(screen.getByText('Avanzado')).toBeInTheDocument();
    expect(screen.getByText('Sin precio configurado')).toBeInTheDocument();
  });

  it('creates a new plan', async () => {
    billingClient.listPlans.mockResolvedValue({ plans: [] });
    billingClient.createPlan.mockResolvedValue({
      id: 'plan-1',
      code: 'INICIACION',
      name: 'Iniciación',
    });

    const user = userEvent.setup();
    render(<PlansPage />);

    await waitFor(() => expect(screen.getByText('Todavía no hay planes.')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Código'), 'INICIACION');
    await user.type(screen.getByLabelText('Nombre'), 'Iniciación');
    await user.click(screen.getByRole('button', { name: 'Crear plan' }));

    await waitFor(() =>
      expect(billingClient.createPlan).toHaveBeenCalledWith({
        code: 'INICIACION',
        name: 'Iniciación',
        description: undefined,
      }),
    );
  });

  it('sets a new price and shows a confirmation', async () => {
    billingClient.listPlans.mockResolvedValue({
      plans: [{ id: 'plan-1', code: 'INICIACION', name: 'Iniciación', currentPriceCop: null }],
    });
    billingClient.setPlanPrice.mockResolvedValue({ id: 'price-1', basePriceCop: 60000 });

    const user = userEvent.setup();
    render(<PlansPage />);

    await waitFor(() => expect(screen.getByText('Iniciación')).toBeInTheDocument());
    const priceInput = screen.getByLabelText('Nuevo precio');
    await user.type(priceInput, '60000');
    const dateInput = screen.getByLabelText('Vigente desde');
    await user.type(dateInput, '2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Actualizar precio' }));

    await waitFor(() =>
      expect(billingClient.setPlanPrice).toHaveBeenCalledWith('plan-1', {
        basePriceCop: 60000,
        validFrom: '2026-01-01',
      }),
    );
    expect(await screen.findByText('Precio actualizado.')).toBeInTheDocument();
  });

  it('shows price history when requested', async () => {
    billingClient.listPlans.mockResolvedValue({
      plans: [{ id: 'plan-1', code: 'INICIACION', name: 'Iniciación', currentPriceCop: 60000 }],
    });
    billingClient.listPlanPrices.mockResolvedValue({
      prices: [
        { id: 'p1', basePriceCop: 50000, validFrom: '2026-01-01', validTo: '2026-03-01' },
        { id: 'p2', basePriceCop: 60000, validFrom: '2026-03-01', validTo: null },
      ],
    });

    const user = userEvent.setup();
    render(<PlansPage />);

    await waitFor(() => expect(screen.getByText('Iniciación')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Ver historial de precios' }));

    expect(await screen.findByText(/vigente/)).toBeInTheDocument();
    expect(billingClient.listPlanPrices).toHaveBeenCalledWith('plan-1');
  });
});
