import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { consentClient } from '../../api/consentClient.js';

import { AccountRequirementsGate } from './AccountRequirementsGate.jsx';

vi.mock('../../api/consentClient.js', () => ({
  consentClient: { getAccountRequirements: vi.fn(), completeAccount: vi.fn() },
}));

const renderGate = () =>
  render(
    <MemoryRouter>
      <AccountRequirementsGate>
        <p>Contenido de Mi CTCJ</p>
      </AccountRequirementsGate>
    </MemoryRouter>,
  );

const NOTHING_PENDING = { birthDateMissing: false, privacyPending: false, termsPending: false };

beforeEach(() => vi.clearAllMocks());

describe('AccountRequirementsGate', () => {
  it('lets a complete account through', async () => {
    consentClient.getAccountRequirements.mockResolvedValue(NOTHING_PENDING);
    renderGate();
    expect(await screen.findByText('Contenido de Mi CTCJ')).toBeInTheDocument();
  });

  it('an old account completes birth date and acceptances before continuing', async () => {
    consentClient.getAccountRequirements.mockResolvedValue({
      birthDateMissing: true,
      privacyPending: true,
      termsPending: true,
    });
    consentClient.completeAccount.mockResolvedValue(NOTHING_PENDING);
    const user = userEvent.setup();
    renderGate();

    expect(await screen.findByRole('heading', { name: 'Antes de continuar' })).toBeInTheDocument();
    expect(screen.queryByText('Contenido de Mi CTCJ')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(consentClient.completeAccount).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText('Fecha de nacimiento')).toHaveFocus());

    await user.type(screen.getByLabelText('Fecha de nacimiento'), '1985-01-10');
    await user.click(screen.getByLabelText(/Autorizo el tratamiento/));
    await user.click(screen.getByLabelText(/Acepto los/));
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

    expect(consentClient.completeAccount).toHaveBeenCalledWith({
      birthDate: '1985-01-10',
      acceptPrivacy: true,
      acceptTerms: true,
    });
    expect(await screen.findByText('Contenido de Mi CTCJ')).toBeInTheDocument();
  });

  it('only asks for what is missing (a new version of the terms, for example)', async () => {
    consentClient.getAccountRequirements.mockResolvedValue({
      ...NOTHING_PENDING,
      termsPending: true,
    });
    renderGate();
    await screen.findByRole('heading', { name: 'Antes de continuar' });
    expect(screen.queryByLabelText('Fecha de nacimiento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Autorizo el tratamiento/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Acepto los/)).not.toBeChecked();
  });
});
