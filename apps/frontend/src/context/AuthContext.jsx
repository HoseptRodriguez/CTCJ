import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { authClient } from '../api/authClient.js';
import {
  setAccessToken as setHttpClientAccessToken,
  setUnauthorizedHandler,
} from '../api/httpClient.js';
import { decodeJwtPayload } from '../lib/decodeJwtPayload.js';

const AuthContext = createContext(null);

function userFromAccessToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return { id: payload.sub, roles: payload.roles ?? [] };
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'anonymous'
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const session = await authClient.refresh();
      setHttpClientAccessToken(session.accessToken);
      // refresh() doesn't return roles (only login() does) -- decode them
      // from the token itself, for display purposes only (see decodeJwtPayload.js).
      setUser(userFromAccessToken(session.accessToken));
      setStatus('authenticated');
      return true;
    } catch (err) {
      setHttpClientAccessToken(null);
      setUser(null);
      setStatus('anonymous');
      if (err.status !== 401) {
        // 401/no-cookie is the normal "not logged in yet" case -- anything
        // else (network error, 5xx) is genuinely unexpected, worth a warning,
        // but we still fail open to logged-out rather than blocking the UI.
        // eslint-disable-next-line no-console
        console.warn('Unexpected error refreshing session:', err);
      }
      return false;
    }
  }, []);

  // React StrictMode double-invokes effects in dev mode (mount -> cleanup ->
  // mount again). refresh() is idempotent so this causes no functional bug,
  // but it does fire a second, redundant network request the browser logs
  // as a "Failed to load resource" console entry on every anonymous page
  // load -- guard against it the same way VerifyEmail.jsx guards its
  // single-use token request.
  const hasStartedRefresh = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setHttpClientAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    });
    if (!hasStartedRefresh.current) {
      hasStartedRefresh.current = true;
      refresh();
    }
    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(session) {
    // login() DOES return roles directly, no decode needed.
    setHttpClientAccessToken(session.accessToken);
    setUser({ id: decodeJwtPayload(session.accessToken)?.sub, roles: session.roles ?? [] });
    setStatus('authenticated');
  }

  async function logout() {
    try {
      await authClient.logout();
    } finally {
      // Clear local state unconditionally so the UI never appears stuck
      // logged-in even if the network call itself failed.
      setHttpClientAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }

  return (
    <AuthContext.Provider value={{ status, user, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
