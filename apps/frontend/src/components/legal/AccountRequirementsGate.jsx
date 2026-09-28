import { birthDateSchema } from '@ctcj/shared';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { consentClient } from '../../api/consentClient.js';
import { useAsync } from '../../lib/useAsync.js';
import { Button } from '../ui/Button.jsx';
import { CheckboxField, TextField } from '../ui/Field.jsx';

const LINK = 'focus-ring rounded font-semibold text-navy-500 underline underline-offset-4';

function CompleteAccountForm({ requirements, onDone }) {
  const [birthDate, setBirthDate] = useState('');
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (Object.keys(errors).length)
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [errors]);

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (requirements.birthDateMissing) {
      const parsed = birthDateSchema.safeParse(birthDate);
      if (!parsed.success) next.birthDate = parsed.error.issues[0].message;
    }
    if (requirements.privacyPending && !acceptPrivacy)
      next.acceptPrivacy = 'Para continuar debes autorizar el tratamiento de tus datos.';
    if (requirements.termsPending && !acceptTerms)
      next.acceptTerms = 'Para continuar debes aceptar los Términos y condiciones.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setApiError(null);
    try {
      onDone(
        await consentClient.completeAccount({
          ...(requirements.birthDateMissing ? { birthDate } : {}),
          ...(requirements.privacyPending ? { acceptPrivacy: true } : {}),
          ...(requirements.termsPending ? { acceptTerms: true } : {}),
        }),
      );
    } catch {
      setApiError('No pudimos guardar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="completar-titulo" className="mx-auto max-w-xl py-4">
      <h1 id="completar-titulo" className="font-display text-title font-bold text-ink">
        Antes de continuar
      </h1>
      <p className="mt-3 text-lead text-ink-soft">
        Necesitamos completar estos datos de tu cuenta. Solo te lo pedimos una vez.
      </p>
      {apiError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger-soft p-3 text-body font-semibold text-ink"
        >
          {apiError}
        </p>
      )}
      <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-5">
        {requirements.birthDateMissing && (
          <TextField
            label="Fecha de nacimiento"
            type="date"
            autoComplete="bday"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            error={errors.birthDate}
            hint="La usamos para saber si eres menor de edad y, si lo eres, pedir la autorización de tu acudiente."
          />
        )}
        {requirements.privacyPending && (
          <CheckboxField
            checked={acceptPrivacy}
            onChange={setAcceptPrivacy}
            error={errors.acceptPrivacy}
          >
            Autorizo el tratamiento de mis datos personales según la{' '}
            <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className={LINK}>
              Política de Tratamiento de Datos
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </Link>
            .
          </CheckboxField>
        )}
        {requirements.termsPending && (
          <CheckboxField checked={acceptTerms} onChange={setAcceptTerms} error={errors.acceptTerms}>
            Acepto los{' '}
            <Link to="/terminos" target="_blank" rel="noopener noreferrer" className={LINK}>
              Términos y condiciones
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </Link>
            .
          </CheckboxField>
        )}
        <Button type="submit" size="lg" fullWidth loading={saving} loadingText="Guardando…">
          Guardar y continuar
        </Button>
      </form>
    </section>
  );
}

/**
 * Accounts created before sign-up asked for them (or after a new version of
 * the privacy policy or terms) complete what's missing before going on.
 * If the requirements can't be loaded, the page is shown as usual: the
 * server keeps enforcing its own rules.
 */
export function AccountRequirementsGate({ children }) {
  const requirements = useAsync(() => consentClient.getAccountRequirements(), []);
  if (requirements.status === 'loading') return null;
  const r = requirements.data;
  if (
    requirements.status === 'ready' &&
    (r.birthDateMissing || r.privacyPending || r.termsPending)
  ) {
    return (
      <CompleteAccountForm requirements={r} onDone={(next) => requirements.setData(() => next)} />
    );
  }
  return children;
}
