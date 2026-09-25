import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { Button } from '../components/ui/Button.jsx';
import { PasswordField, TextField } from '../components/ui/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';
import { resolvePostLoginRoute } from '../lib/postLoginRoute.js';

import { AuthSplit, FormError } from './auth/AuthSplit.jsx';

const INITIAL_FORM = { email: '', password: '' };

const FIELD_MESSAGES = {
  email: 'Escribe tu correo completo, por ejemplo nombre@correo.com.',
  password: 'Escribe tu contraseña.',
};

export function Login() {
  useDocumentTitle('Entrar');
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const comingFromBooking = from?.pathname === '/canchas';

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
        errors[issue.path[0]] = FIELD_MESSAGES[issue.path[0]] ?? issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const session = await authClient.login(result.data);
      login(session);
      // Back to where the person was sent from (including the chosen hour
      // on /canchas?fecha=…&hora=…); otherwise their own area by role.
      const redirectTo = from
        ? `${from.pathname}${from.search ?? ''}`
        : resolvePostLoginRoute(session.roles);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setApiError(describeIdentityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplit
      title="Entrar"
      description={
        comingFromBooking
          ? 'Entra para reservar la hora que elegiste. Te llevamos de vuelta enseguida.'
          : 'Usa el correo y la contraseña con los que te registraste.'
      }
    >
      <FormError>{apiError}</FormError>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <TextField
          label="Correo"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Entrando…">
          Entrar
        </Button>
      </form>
      <div className="mt-8 space-y-3 text-body">
        <p>
          <Link
            to="/forgot-password"
            className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
          >
            Olvidé mi contraseña
          </Link>
        </p>
        <p className="text-ink-soft">
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            state={from ? { from } : undefined}
            className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
          >
            Crea una cuenta
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
