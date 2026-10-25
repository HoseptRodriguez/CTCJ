import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../../../test/axe.js';
import { authClient } from '../../api/authClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Login } from '../Login.jsx';

import { MfaSetupPage } from './MfaSetupPage.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/authClient.js', () => ({
  authClient: {
    login: vi.fn(),
    mfaVerify: vi.fn(),
    mfaSetupStart: vi.fn(),
    mfaSetupConfirm: vi.fn(),
  },
}));

const SESSION = { accessToken: 'a.b.c', roles: ['USUARIO', 'ADMINISTRADOR'] };
const CODES = Array.from({ length: 10 }, (_, i) => `AAA${i}-BBB${i}`);

function Where() {
  const location = useLocation();
  return <p>Estás en {location.pathname}</p>;
}

function renderAt(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/activar-verificacion" element={<MfaSetupPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function signIn(user) {
  await user.type(screen.getByLabelText('Correo'), 'marta@club.co');
  await user.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

const login = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ login });
});

describe('Verificación en dos pasos al entrar', () => {
  it('the password alone does not sign in: it asks for the 6-digit code', async () => {
    authClient.login.mockResolvedValue({ mfaRequired: true, mfaToken: 'step' });
    authClient.mfaVerify.mockResolvedValue(SESSION);
    const user = userEvent.setup();
    renderAt();
    await signIn(user);

    expect(
      await screen.findByRole('heading', { name: 'Verificación en dos pasos' }),
    ).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    const field = screen.getByLabelText('Código de 6 números');
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    expect(field).toHaveAttribute('inputmode', 'numeric');

    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authClient.mfaVerify).not.toHaveBeenCalled();
    expect(screen.getByText(/Escribe los 6 números/)).toBeInTheDocument();

    await user.type(field, '12a3456');
    expect(field).toHaveValue('123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authClient.mfaVerify).toHaveBeenCalledWith({ mfaToken: 'step', code: '123456' });
    expect(login).toHaveBeenCalledWith(SESSION);
    expect(await screen.findByText('Estás en /staff/panel')).toBeInTheDocument();
  });

  it('"Usar un código de recuperación" and a clear error for a wrong code', async () => {
    authClient.login.mockResolvedValue({ mfaRequired: true, mfaToken: 'step' });
    authClient.mfaVerify
      .mockRejectedValueOnce(
        Object.assign(new Error('x'), { status: 401, code: 'mfa_code_invalid' }),
      )
      .mockResolvedValue(SESSION);
    const user = userEvent.setup();
    renderAt();
    await signIn(user);
    await user.click(await screen.findByRole('button', { name: 'Usar un código de recuperación' }));
    const field = screen.getByLabelText('Código de recuperación');
    await user.type(field, 'k7qh-3mzp');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authClient.mfaVerify).toHaveBeenCalledWith({
      mfaToken: 'step',
      recoveryCode: 'K7QH-3MZP',
    });
    expect(await screen.findByText(/El código no es correcto/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith(SESSION));
  });

  it('a lock after too many attempts says to wait 15 minutes', async () => {
    authClient.login.mockResolvedValue({ mfaRequired: true, mfaToken: 'step' });
    authClient.mfaVerify.mockRejectedValue(
      Object.assign(new Error('x'), { status: 429, code: 'mfa_locked' }),
    );
    const user = userEvent.setup();
    renderAt();
    await signIn(user);
    await user.type(await screen.findByLabelText('Código de 6 números'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Espera 15 minutos/)).toBeInTheDocument();
  });

  it('a mandatory role without it goes through the 4 steps and only then enters', async () => {
    authClient.login.mockResolvedValue({ mfaSetupRequired: true, mfaToken: 'setup' });
    authClient.mfaSetupStart.mockResolvedValue({
      qrSvg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      manualKey: 'ABCD EFGH IJKL',
      accountName: 'marta@club.co',
    });
    authClient.mfaSetupConfirm.mockResolvedValue({ ...SESSION, recoveryCodes: CODES });
    const user = userEvent.setup();
    renderAt();
    await signIn(user);

    expect(
      await screen.findByRole('heading', {
        name: 'Paso 1 de 4: Instala una aplicación de autenticación',
      }),
    ).toHaveFocus();
    expect(login).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ya tengo la aplicación' }));
    expect(authClient.mfaSetupStart).toHaveBeenCalledWith('setup');
    expect(
      await screen.findByRole('img', { name: /Código QR para agregar la cuenta marta@club.co/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABCD EFGH IJKL')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ya lo escaneé' }));

    await user.type(screen.getByLabelText('Código de 6 números'), '654321');
    await user.click(screen.getByRole('button', { name: 'Activar' }));
    expect(authClient.mfaSetupConfirm).toHaveBeenCalledWith('setup', '654321');

    expect(await screen.findByText('AAA0-BBB0')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: 'Entrar a la consola' }));
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText(/Marca la casilla/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Ya guardé mis códigos/ }));
    await user.click(screen.getByRole('button', { name: 'Entrar a la consola' }));
    expect(login).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'a.b.c' }));
    expect(await screen.findByText('Estás en /staff/panel')).toBeInTheDocument();
  });

  it('the setup page without the step token goes back to the sign-in', async () => {
    renderAt('/activar-verificacion');
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument();
  });

  it('no serious accessibility violations on the code step', async () => {
    authClient.login.mockResolvedValue({ mfaRequired: true, mfaToken: 'step' });
    const user = userEvent.setup();
    document.title = 'Entrar';
    renderAt();
    await signIn(user);
    await screen.findByLabelText('Código de 6 números');
    expect(await a11yViolations()).toEqual([]);
  });
});
