import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { authClient } from '../api/authClient.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export function VerifyEmail() {
  useDocumentTitle('Verificar correo');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  // Verification tokens are single-use by design. Without this guard, React
  // StrictMode's dev-mode double-invoke (and real-world double navigation,
  // e.g. an email client's link-preview crawler) would fire a second
  // request that legitimately fails with "already consumed" and clobbers
  // the first request's success state.
  const requestedTokenRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Falta el token de verificacion en el enlace.');
      return;
    }
    if (requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;

    authClient
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.message);
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {status === 'pending' && <p className="text-slate-600">Verificando tu correo...</p>}

      {status === 'success' && (
        <>
          <h1 className="text-2xl font-semibold text-brand">Correo verificado</h1>
          <p className="mt-3 text-slate-600">Ya puedes iniciar sesion.</p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded bg-brand px-4 py-2 font-medium text-white"
          >
            Ir a iniciar sesion
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 className="text-2xl font-semibold text-red-600">No se pudo verificar</h1>
          <p className="mt-3 text-slate-600">{errorMessage}</p>
        </>
      )}
    </div>
  );
}
