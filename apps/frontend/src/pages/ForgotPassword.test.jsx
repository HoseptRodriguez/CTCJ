import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '../api/authClient.js';

import { ForgotPassword } from './ForgotPassword.jsx';

vi.mock('../api/authClient.js', () => ({
  authClient: { requestPasswordReset: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the email and shows a generic confirmation message', async () => {
    authClient.requestPasswordReset.mockResolvedValue({ requested: true });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'jugador@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    await waitFor(() =>
      expect(authClient.requestPasswordReset).toHaveBeenCalledWith('jugador@example.com'),
    );
    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument();
    expect(screen.getByText(/jugador@example.com/)).toBeInTheDocument();
  });

  it('shows a field error for an invalid email without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(authClient.requestPasswordReset).not.toHaveBeenCalled();
  });
});
