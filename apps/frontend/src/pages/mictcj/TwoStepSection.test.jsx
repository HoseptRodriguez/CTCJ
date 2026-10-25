import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mfaClient } from '../../api/mfaClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';

import { TwoStepSection } from './TwoStepSection.jsx';

vi.mock('../../api/mfaClient.js', () => ({
  mfaClient: {
    getStatus: vi.fn(),
    startSetup: vi.fn(),
    confirmSetup: vi.fn(),
    disable: vi.fn(),
    regenerateRecoveryCodes: vi.fn(),
  },
}));

const renderSection = () =>
  render(
    <ToastProvider>
      <TwoStepSection />
    </ToastProvider>,
  );

beforeEach(() => vi.clearAllMocks());

describe('Mi perfil — Verificación en dos pasos', () => {
  it('off and optional: "Activar" starts the steps', async () => {
    mfaClient.getStatus.mockResolvedValue({
      enabled: false,
      required: false,
      recoveryCodesLeft: 0,
    });
    const user = userEvent.setup();
    renderSection();
    expect(await screen.findByText('Desactivada')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activar' }));
    expect(
      screen.getByRole('heading', { name: /Paso 1 de 4: Instala una aplicación/ }),
    ).toBeInTheDocument();
  });

  it('a required role sees it can not be turned off; low recovery codes are flagged', async () => {
    mfaClient.getStatus.mockResolvedValue({
      enabled: true,
      required: true,
      recoveryCodesLeft: 2,
      enabledAt: '2026-09-29T15:00:00Z',
    });
    renderSection();
    expect(await screen.findByText('Activada')).toBeInTheDocument();
    expect(screen.getByText(/es obligatoria: no se puede desactivar/)).toBeInTheDocument();
    expect(screen.getByText(/Pide unos nuevos antes de que se acaben/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
  });

  it('an optional role turns it off with a current code', async () => {
    mfaClient.getStatus.mockResolvedValue({
      enabled: true,
      required: false,
      recoveryCodesLeft: 10,
    });
    mfaClient.disable.mockResolvedValue({ enabled: false });
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    await user.type(screen.getByLabelText('Código de 6 números'), '123456');
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(mfaClient.disable).toHaveBeenCalledWith('123456');
  });
});
