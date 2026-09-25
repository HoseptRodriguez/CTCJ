import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { confirmPasswordResetSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { AnimatedCheck } from '../components/motion/AnimatedCheck.jsx';
import { Button } from '../components/ui/Button.jsx';
import { PasswordField } from '../components/ui/Field.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';

import { AuthSplit, FormError } from './auth/AuthSplit.jsx';
import { PasswordRules } from './Register.jsx';

export function ResetPassword() {
  useDocumentTitle('Contraseña nueva');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError(null);

    if (newPassword !== confirmPassword) {
      setFieldError('Las contraseñas no coinciden. Escribe la misma en los dos campos.');
      return;
    }

    const result = confirmPasswordResetSchema.safeParse({ token, newPassword });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? 'Revisa la contraseña.');
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      await authClient.confirmPasswordReset(result.data);
      setSubmitted(true);
    } catch (err) {
      setApiError(describeIdentityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthSplit title="Enlace inválido">
        <FormError>
          Al enlace le falta una parte. Pide uno nuevo para cambiar tu contraseña.
        </FormError>
        <Button to="/forgot-password" variant="secondary" size="lg">
          Pedir un enlace nuevo
        </Button>
      </AuthSplit>
    );
  }

  if (submitted) {
    return (
      <AuthSplit title="Contraseña cambiada">
        <div className="flex items-center gap-4">
          <AnimatedCheck label="Contraseña cambiada" />
          <p className="text-lead text-ink">Ya puedes entrar con tu contraseña nueva.</p>
        </div>
        <Button to="/login" size="lg" className="mt-8">
          Entrar
        </Button>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit title="Contraseña nueva" description="Escríbela dos veces para evitar errores.">
      <FormError>{apiError}</FormError>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <PasswordField
            label="Contraseña nueva"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordRules value={newPassword} />
        </div>
        <PasswordField
          label="Repite la contraseña nueva"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldError}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Guardando…">
          Guardar contraseña
        </Button>
      </form>
    </AuthSplit>
  );
}
