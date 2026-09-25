import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordResetSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { Button } from '../components/ui/Button.jsx';
import { TextField } from '../components/ui/Field.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';

import { AuthSplit, FormError } from './auth/AuthSplit.jsx';

export function ForgotPassword() {
  useDocumentTitle('Olvidé mi contraseña');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError(null);

    const result = requestPasswordResetSchema.safeParse({ email });
    if (!result.success) {
      setFieldError('Escribe tu correo completo, por ejemplo nombre@correo.com.');
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      await authClient.requestPasswordReset(result.data.email);
      setSubmitted(true);
    } catch (err) {
      setApiError(describeIdentityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthSplit title="Revisa tu correo">
        <p className="text-lead text-ink">
          Si <strong>{email}</strong> tiene una cuenta con nosotros, te enviamos un enlace para
          crear una contraseña nueva. El enlace vence en 1 hora.
        </p>
        <Button to="/login" variant="secondary" size="lg" className="mt-8">
          Volver a Entrar
        </Button>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit
      title="Olvidé mi contraseña"
      description="Escribe tu correo y te enviamos un enlace para crear una contraseña nueva."
    >
      <FormError>{apiError}</FormError>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <TextField
          label="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Enviando…">
          Enviar enlace
        </Button>
      </form>
      <p className="mt-8 text-body">
        <Link
          to="/login"
          className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
        >
          Volver a Entrar
        </Link>
      </p>
    </AuthSplit>
  );
}
