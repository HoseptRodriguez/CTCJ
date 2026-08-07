import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '../api/authClient.js';

import { ResetPassword } from './ResetPassword.jsx';

vi.mock('../api/authClient.js', () => ({
  authClient: { confirmPasswordReset: vi.fn() },
}));

function renderPage(initialEntry = '/reset-password?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ResetPassword />
    </MemoryRouter>,
  );
}

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an invalid-link message when there is no token in the URL', () => {
    renderPage('/reset-password');
    expect(screen.getByText('Enlace inválido')).toBeInTheDocument();
  });

  it('submits the new password with the token and shows a success message', async () => {
    authClient.confirmPasswordReset.mockResolvedValue({ reset: true });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Nueva clave'), 'ClaveNueva123');
    await user.type(screen.getByLabelText('Confirma la nueva clave'), 'ClaveNueva123');
    await user.click(screen.getByRole('button', { name: 'Restablecer clave' }));

    await waitFor(() =>
      expect(authClient.confirmPasswordReset).toHaveBeenCalledWith({
        token: 'abc123',
        newPassword: 'ClaveNueva123',
      }),
    );
    expect(await screen.findByText('Clave restablecida')).toBeInTheDocument();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Nueva clave'), 'ClaveNueva123');
    await user.type(screen.getByLabelText('Confirma la nueva clave'), 'OtraClave456');
    await user.click(screen.getByRole('button', { name: 'Restablecer clave' }));

    expect(await screen.findByText('Las claves no coinciden.')).toBeInTheDocument();
    expect(authClient.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('rejects a password that fails the letter+digit policy without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Nueva clave'), 'sololetras');
    await user.type(screen.getByLabelText('Confirma la nueva clave'), 'sololetras');
    await user.click(screen.getByRole('button', { name: 'Restablecer clave' }));

    expect(authClient.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('shows the API error message on failure (e.g. expired token)', async () => {
    authClient.confirmPasswordReset.mockRejectedValue(
      new Error('El enlace para restablecer la clave no es válido o ya expiró.'),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Nueva clave'), 'ClaveNueva123');
    await user.type(screen.getByLabelText('Confirma la nueva clave'), 'ClaveNueva123');
    await user.click(screen.getByRole('button', { name: 'Restablecer clave' }));

    expect(
      await screen.findByText('El enlace para restablecer la clave no es válido o ya expiró.'),
    ).toBeInTheDocument();
  });
});
