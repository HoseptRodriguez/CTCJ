import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '../api/authClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import { Login } from './Login.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/authClient.js', () => ({ authClient: { login: vi.fn() } }));

function Where() {
  const location = useLocation();
  return <p>Estás en {`${location.pathname}${location.search}`}</p>;
}

function renderLogin(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('Correo'), 'ana@example.com');
  await user.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Login', () => {
  const login = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ login });
  });

  it('returns to the booking page with the chosen hour after signing in', async () => {
    authClient.login.mockResolvedValue({ accessToken: 't', roles: ['JUGADOR'] });
    const user = userEvent.setup();
    renderLogin({ from: { pathname: '/canchas', search: '?fecha=2026-09-27&cancha=c1&hora=8' } });

    expect(screen.getByText(/Entra para reservar la hora que elegiste/)).toBeInTheDocument();
    await fillAndSubmit(user);

    expect(
      await screen.findByText('Estás en /canchas?fecha=2026-09-27&cancha=c1&hora=8'),
    ).toBeInTheDocument();
    expect(login).toHaveBeenCalled();
  });

  it('without a return address, goes to the area for the role', async () => {
    authClient.login.mockResolvedValue({ accessToken: 't', roles: ['RECEPCION'] });
    const user = userEvent.setup();
    renderLogin();
    await fillAndSubmit(user);
    expect(await screen.findByText('Estás en /staff/panel')).toBeInTheDocument();
  });

  it('explains wrong credentials in plain words', async () => {
    authClient.login.mockRejectedValue(
      Object.assign(new Error('Invalid'), { status: 401, code: 'invalid_credentials' }),
    );
    const user = userEvent.setup();
    renderLogin();
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no coinciden.',
    );
  });

  it('"Mostrar" reveals the password and "Ocultar" hides it again', async () => {
    const user = userEvent.setup();
    renderLogin();
    const field = screen.getByLabelText('Contraseña');
    expect(field).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(field).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(field).toHaveAttribute('type', 'password');
  });
});
