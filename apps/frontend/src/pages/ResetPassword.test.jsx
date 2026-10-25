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

    await user.type(screen.getByLabelText('Contraseña nueva'), 'ClaveNueva123');
    await user.type(screen.getByLabelText('Repite la contraseña nueva'), 'ClaveNueva123');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    await waitFor(() =>
      expect(authClient.confirmPasswordReset).toHaveBeenCalledWith({
        token: 'abc123',
        newPassword: 'ClaveNueva123',
      }),
    );
    expect(await screen.findByText('Contraseña cambiada')).toBeInTheDocument();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Contraseña nueva'), 'ClaveNueva123');
    await user.type(screen.getByLabelText('Repite la contraseña nueva'), 'OtraClave456');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(
      await screen.findByText('Las contraseñas no coinciden. Escribe la misma en los dos campos.'),
    ).toBeInTheDocument();
    expect(authClient.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('rejects a password that fails the letter+digit policy without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Contraseña nueva'), 'sololetras');
    await user.type(screen.getByLabelText('Repite la contraseña nueva'), 'sololetras');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(
      await screen.findByText('La clave debe incluir al menos un número.'),
    ).toBeInTheDocument();
    expect(authClient.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('keeps the password rule visible under the field, ticking each part as it is met', async () => {
    const user = userEvent.setup();
    renderPage();
    const rules = screen.getByRole('list', { name: 'Requisitos de la contraseña' });
    expect(rules).toHaveTextContent('Al menos 10 caracteres');

    await user.type(screen.getByLabelText('Contraseña nueva'), 'abc1');
    expect(screen.getByText('Al menos una letra')).toHaveTextContent('(cumplido)');
    expect(screen.getByText('Al menos un número')).toHaveTextContent('(cumplido)');
    expect(screen.getByText('Al menos 10 caracteres')).toHaveTextContent('(pendiente)');
  });

  it('shows the API error message on failure (e.g. expired token)', async () => {
    authClient.confirmPasswordReset.mockRejectedValue(
      Object.assign(new Error('Invalid token'), {
        status: 400,
        code: 'invalid_password_reset_token',
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Contraseña nueva'), 'ClaveNueva123');
    await user.type(screen.getByLabelText('Repite la contraseña nueva'), 'ClaveNueva123');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(
      await screen.findByText(
        'Este enlace para cambiar la contraseña no sirve o ya venció. Pide uno nuevo.',
      ),
    ).toBeInTheDocument();
  });
});
