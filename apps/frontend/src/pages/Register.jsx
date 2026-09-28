import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PASSWORD_MIN_LENGTH, registerSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { CheckIcon } from '../components/icons/CheckIcon.jsx';
import { AnimatedCheck } from '../components/motion/AnimatedCheck.jsx';
import { Button } from '../components/ui/Button.jsx';
import { cn } from '../components/ui/cn.js';
import { CheckboxField, PasswordField, TextField } from '../components/ui/Field.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { isMinorBirthDate } from '../lib/age.js';
import { describeIdentityError } from '../lib/identityErrorMessages.js';

import { AuthSplit, FormError } from './auth/AuthSplit.jsx';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  birthDate: '',
  // Authorizations: never pre-ticked.
  acceptPrivacy: false,
  acceptTerms: false,
  wantsMarketing: false,
  marketingEmail: false,
  marketingWhatsapp: false,
};

const LEGAL_LINK = 'focus-ring rounded font-semibold text-navy-500 underline underline-offset-4';

const FIELD_MESSAGES = {
  firstName: 'Escribe tu nombre.',
  lastName: 'Escribe tu apellido.',
  email: 'Escribe tu correo completo, por ejemplo nombre@correo.com.',
  acceptPrivacy: 'Para crear la cuenta debes autorizar el tratamiento de tus datos.',
  acceptTerms: 'Para crear la cuenta debes aceptar los Términos y condiciones.',
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
  const formRef = useRef(null);
  const minor = isMinorBirthDate(form.birthDate);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }
  const setField = (name) => (value) => setForm((prev) => ({ ...prev, [name]: value }));

  // After a failed submit, take the person to the first field to fix.
  useEffect(() => {
    if (Object.keys(fieldErrors).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
    }
  }, [fieldErrors]);

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError(null);

    const payload = {
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: form.birthDate,
      acceptPrivacy: form.acceptPrivacy,
      acceptTerms: form.acceptTerms,
      // Minors never get promotions; otherwise only the channels chosen.
      marketing: {
        email: !minor && form.wantsMarketing && form.marketingEmail,
        whatsapp: !minor && form.wantsMarketing && form.marketingWhatsapp,
      },
    };
    const result = registerSchema.safeParse(payload);
    const errors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        errors[field] ??= FIELD_MESSAGES[field] ?? issue.message;
      }
    }
    if (!minor && form.wantsMarketing && !form.marketingEmail && !form.marketingWhatsapp) {
      errors.marketing = 'Elige por dónde quieres recibirlas: correo, WhatsApp o ambos.';
    }
    if (Object.keys(errors).length) {
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
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
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
        <TextField
          label="Fecha de nacimiento"
          name="birthDate"
          type="date"
          autoComplete="bday"
          value={form.birthDate}
          onChange={handleChange}
          error={fieldErrors.birthDate}
          hint="La usamos para saber si eres menor de edad, como explica la Política de datos."
        />
        {minor && (
          <p
            role="status"
            className="rounded-lg border-2 border-amber bg-amber-soft p-4 text-body text-ink"
          >
            Eres menor de edad: podrás entrar, pero para reservar y publicar en la Comunidad tu
            acudiente debe vincular tu cuenta desde su perfil y dar la autorización para tus datos e
            imagen. Tú no puedes darla por tu cuenta.
          </p>
        )}
        <fieldset className="space-y-3">
          <legend className="mb-1 text-body font-semibold text-ink">Autorizaciones</legend>
          <CheckboxField
            name="acceptPrivacy"
            checked={form.acceptPrivacy}
            onChange={setField('acceptPrivacy')}
            error={fieldErrors.acceptPrivacy}
          >
            (Obligatoria) Autorizo el tratamiento de mis datos personales según la{' '}
            <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK}>
              Política de Tratamiento de Datos
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </Link>
            .
          </CheckboxField>
          <CheckboxField
            name="acceptTerms"
            checked={form.acceptTerms}
            onChange={setField('acceptTerms')}
            error={fieldErrors.acceptTerms}
          >
            (Obligatoria) Acepto los{' '}
            <Link to="/terminos" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK}>
              Términos y condiciones
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </Link>
            .
          </CheckboxField>
          {!minor && (
            <CheckboxField
              name="wantsMarketing"
              checked={form.wantsMarketing}
              onChange={setField('wantsMarketing')}
              error={fieldErrors.marketing}
              hint="Solo en horario permitido: lunes a viernes de 7:00 a. m. a 7:00 p. m. y sábados de 8:00 a. m. a 3:00 p. m. Nunca domingos ni festivos."
            >
              (Opcional) Quiero recibir novedades y promociones del club.
            </CheckboxField>
          )}
          {!minor && form.wantsMarketing && (
            <fieldset className="ml-4 space-y-2 border-l-4 border-line pl-4">
              <legend className="mb-1 text-body font-semibold text-ink">¿Por dónde?</legend>
              <CheckboxField checked={form.marketingEmail} onChange={setField('marketingEmail')}>
                Correo
              </CheckboxField>
              <CheckboxField
                checked={form.marketingWhatsapp}
                onChange={setField('marketingWhatsapp')}
              >
                WhatsApp
              </CheckboxField>
            </fieldset>
          )}
        </fieldset>
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
