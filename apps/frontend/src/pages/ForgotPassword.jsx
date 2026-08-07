import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordResetSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export function ForgotPassword() {
  useDocumentTitle('Restablecer clave');
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
      setFieldError(result.error.issues[0]?.message ?? 'Correo inválido.');
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      await authClient.requestPasswordReset(result.data.email);
      setSubmitted(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold text-brand">Revisa tu correo</h1>
        <p className="mt-3 text-slate-600">
          Si <strong>{email}</strong> tiene una cuenta con nosotros, te enviamos un enlace para
          restablecer tu clave. El enlace expira en 1 hora.
        </p>
        <Link to="/login" className="mt-6 inline-block font-medium text-brand-accent">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold text-brand">Restablecer clave</h1>
      <p className="mt-2 text-sm text-slate-600">
        Ingresa tu correo y te enviaremos un enlace para crear una nueva clave.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
          />
          {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
        </div>

        {apiError && <p className="text-sm text-red-600">{apiError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        <Link to="/login" className="font-medium text-brand-accent">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
