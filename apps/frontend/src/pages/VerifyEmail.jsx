import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { authClient } from '../api/authClient.js';
import { AnimatedCheck } from '../components/motion/AnimatedCheck.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';

import { AuthSplit, FormError } from './auth/AuthSplit.jsx';

export function VerifyEmail() {
  useDocumentTitle('Confirmar correo');
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
      setErrorMessage(
        'Al enlace le falta una parte. Ábrelo de nuevo desde el correo que te enviamos.',
      );
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
        setErrorMessage(describeIdentityError(err));
      });
  }, [token]);

  if (status === 'success') {
    return (
      <AuthSplit title="Correo confirmado">
        <div className="flex items-center gap-4">
          <AnimatedCheck label="Correo confirmado" />
          <p className="text-lead text-ink">Tu cuenta está activa. Ya puedes entrar.</p>
        </div>
        <Button to="/login" size="lg" className="mt-8">
          Entrar
        </Button>
      </AuthSplit>
    );
  }

  if (status === 'error') {
    return (
      <AuthSplit title="No pudimos confirmar tu correo">
        <FormError>{errorMessage}</FormError>
        <Button to="/register" variant="secondary" size="lg">
          Registrarme de nuevo
        </Button>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit title="Confirmando tu correo…">
      <SkeletonGroup label="Confirmando tu correo…">
        <Skeleton className="h-6 w-2/3" />
      </SkeletonGroup>
    </AuthSplit>
  );
}
