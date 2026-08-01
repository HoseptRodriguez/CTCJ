import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '../api/authClient.js';

import { AuthProvider, useAuth } from './AuthContext.jsx';

vi.mock('../api/authClient.js', () => ({
  authClient: {
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}));

// A minimal, real 2-segment-payload JWT (unsigned -- fine, decodeJwtPayload
// never verifies signatures, only reads the payload for display).
function fakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.`;
}

function Probe() {
  const { status, user } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="roles">{user?.roles?.join(',') ?? ''}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves to authenticated and decodes roles from the refreshed JWT', async () => {
    const token = fakeJwt({ sub: 'user-1', roles: ['USUARIO', 'JUGADOR'] });
    authClient.refresh.mockResolvedValue({ accessToken: token, expiresIn: 900, roles: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('roles').textContent).toBe('USUARIO,JUGADOR');
  });

  it('resolves to anonymous on an expected 401 (no refresh cookie) without logging an error', async () => {
    const err = new Error('No refresh token provided.');
    err.status = 401;
    authClient.refresh.mockRejectedValue(err);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    // eslint-disable-next-line no-console
    expect(console.error).not.toHaveBeenCalled();
  });

  it('fails open to anonymous on an unexpected error, but does warn', async () => {
    const err = new Error('Network error');
    err.status = 500;
    authClient.refresh.mockRejectedValue(err);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalled();
  });

  it('login() sets status to authenticated immediately using the roles it was given', async () => {
    const err = new Error('not logged in');
    err.status = 401;
    authClient.refresh.mockRejectedValue(err);

    function LoginProbe() {
      const { status, user, login } = useAuth();
      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="roles">{user?.roles?.join(',') ?? ''}</span>
          <button
            onClick={() =>
              login({ accessToken: fakeJwt({ sub: 'user-2' }), roles: ['ADMINISTRADOR'] })
            }
          >
            login
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    await act(async () => screen.getByText('login').click());
    expect(screen.getByTestId('status').textContent).toBe('authenticated');
    expect(screen.getByTestId('roles').textContent).toBe('ADMINISTRADOR');
  });
});
