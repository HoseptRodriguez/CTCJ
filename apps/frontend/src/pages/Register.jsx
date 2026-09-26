import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PASSWORD_MIN_LENGTH, registerSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { CheckIcon } from '../components/icons/CheckIcon.jsx';
import { AnimatedCheck } from '../components/motion/AnimatedCheck.jsx';
import { Button } from '../components/ui/Button.jsx';
import { cn } from '../components/ui/cn.js';
import { PasswordField, TextField } from '../components/ui/Field.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';

import { AuthSplit, FormError } from './auth/AuthSplit.jsx';

const INITIAL_FORM = { firstName: '', lastName: '', email: '', password: '' };

const FIELD_MESSAGES = {
  firstName: 'Escribe tu nombre.',
  lastName: 'Escribe tu apellido.',
  email: 'Escribe tu correo completo, por ejemplo nombre@correo.com.',
};

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'letter', label: 'Al menos una letra', test: (v) => /[A-Za-z]/.test(v) },
  { id: 'digit', label: 'Al menos un número', test: (v) => /[0-9]/.test(v) },
];

/** The password rule, always visible, ticking as each part is met. */
export function PasswordRules({ value, id }) {
  return (
    <ul id={id} className="mt-3 space-y-1" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-body-sm',
              ok ? 'text-status-ok-fg' : 'text-ink-soft',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border-2',
                ok ? 'border-status-ok-fg bg-status-ok-bg' : 'border-line-strong',
              )}
            >
              {ok && <CheckIcon className="h-3.5 w-3.5" />}
            </span>
            {rule.label}
            <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Register() {
  useDocumentTitle('Crear cuenta');
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError(null);

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        errors[field] ??= FIELD_MESSAGES[field] ?? issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await authClient.register(result.data);
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
        <div className="flex items-start gap-4">
          <AnimatedCheck label="Cuenta creada" />
          <p className="text-lead text-ink">
            Te enviamos un enlace a <strong>{form.email}</strong>. Ábrelo para activar tu cuenta y
            luego entra.
          </p>
        </div>
        <p className="mt-6 text-body text-ink-soft">
          ¿No te llegó? Revisa la carpeta de correo no deseado. Si registras de nuevo el mismo
          correo, te enviamos otro enlace.
        </p>
        <Button to="/login" variant="secondary" size="lg" className="mt-8">
          Ir a Entrar
        </Button>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit
      title="Crear cuenta"
      tagline="Tu cancha te espera."
      description="Con tu cuenta puedes reservar canchas y seguir tu progreso."
    >
      <FormError>{apiError}</FormError>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Nombre"
            name="firstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={handleChange}
            error={fieldErrors.firstName}
          />
          <TextField
            label="Apellido"
            name="lastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={handleChange}
            error={fieldErrors.lastName}
          />
        </div>
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
        <div>
          <PasswordField
            label="Contraseña"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
          />
          <PasswordRules value={form.password} />
        </div>
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          loadingText="Creando cuenta…"
        >
          Crear cuenta
        </Button>
      </form>
      <p className="mt-8 text-body text-ink-soft">
        ¿Ya tienes cuenta?{' '}
        <Link
          to="/login"
          className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
        >
          Entra aquí
        </Link>
      </p>
    </AuthSplit>
  );
}
