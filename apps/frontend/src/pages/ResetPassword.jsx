import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordResetSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export function ResetPassword() {
  useDocumentTitle('Nueva clave');
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
      setFieldError('Las claves no coinciden.');
      return;
    }

    const result = confirmPasswordResetSchema.safeParse({ token, newPassword });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? 'Clave inválida.');
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      await authClient.confirmPasswordReset(result.data);
      setSubmitted(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold text-red-600">Enlace inválido</h1>
        <p className="mt-3 text-slate-600">Falta el token en el enlace.</p>
        <Link to="/forgot-password" className="mt-6 inline-block font-medium text-brand-accent">
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold text-brand">Clave restablecida</h1>
        <p className="mt-3 text-slate-600">
          Ya puedes iniciar sesión con tu nueva clave. Cerramos todas tus sesiones activas por
          seguridad.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded bg-brand px-4 py-2 font-medium text-white"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold text-brand">Crea tu nueva clave</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
            Nueva clave
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Entre 10 y 100 caracteres, con al menos una letra y un número.
          </p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Confirma la nueva clave
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
          />
        </div>

        {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}
        {apiError && <p className="text-sm text-red-600">{apiError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Guardando...' : 'Restablecer clave'}
        </button>
      </form>
    </div>
  );
}
