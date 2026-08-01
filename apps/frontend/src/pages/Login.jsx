import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const INITIAL_FORM = { email: '', password: '' };

export function Login() {
  useDocumentTitle('Iniciar sesión');
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError(null);

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0]] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const session = await authClient.login(result.data);
      login(session);
      const redirectTo = location.state?.from?.pathname ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold text-brand">Iniciar sesion</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Contrasena
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        {apiError && <p className="text-sm text-red-600">{apiError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-brand-accent">
          Registrate
        </Link>
      </p>
    </div>
  );
}
