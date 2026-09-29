import {
  INFO_REQUEST_FOR,
  INFO_REQUEST_MESSAGE_MAX,
  INFO_REQUEST_PROGRAM_LABELS,
  INFO_REQUEST_TIMES,
  infoRequestSchema,
} from '@ctcj/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { infoRequestClient } from '../../api/infoRequestClient.js';
import { WHATSAPP_LINK } from '../../lib/clubInfo.js';
import { WhatsAppIcon } from '../icons/WhatsAppIcon.jsx';
import { AnimatedCheck } from '../motion/AnimatedCheck.jsx';
import { Button } from '../ui/Button.jsx';
import { CheckboxField, RadioCards, TextAreaField, TextField } from '../ui/Field.jsx';

import { ExternalLinkMark } from './ExternalLinkMark.jsx';

const EMPTY = {
  fullName: '',
  phone: '',
  email: '',
  program: '',
  forWhom: '',
  childAge: '',
  preferredTimes: [],
  message: '',
  acceptPrivacy: false,
  marketing: false,
  website: '',
};

const LINK = 'focus-ring rounded font-semibold text-navy-500 underline underline-offset-4';

/**
 * "Solicitar información" (home and program pages). Visible labels, big
 * fields, errors next to each field and focus on the first one. For a
 * child, only their AGE is asked, never their name. Anti-spam without
 * third parties: a hidden trap field and a server token (minimum time).
 *
 * @param {{ program?: string, headingLevel?: 'h2'|'h3', title?: string }} props
 */
export function InfoRequestForm({ program, headingLevel = 'h2', title = 'Solicitar información' }) {
  const [form, setForm] = useState({ ...EMPTY, program: program ?? '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [formToken, setFormToken] = useState(null);
  const formRef = useRef(null);
  const doneRef = useRef(null);
  const Heading = headingLevel;
  const headingId = useId();

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => infoRequestClient.getFormToken())
      .then((r) => !cancelled && setFormToken(r.formToken))
      .catch(() => {}); // the server will say so on send
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Object.keys(errors).length)
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [errors]);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const onText = (key) => (e) => set(key)(e.target.value);

  async function submit(event) {
    event.preventDefault();
    setApiError(null);
    const payload = {
      ...form,
      childAge:
        form.forWhom === INFO_REQUEST_FOR.CHILD && form.childAge !== '' ? form.childAge : undefined,
      // The real token is checked by the server; here only the fields.
      formToken: 'revision-local',
    };
    const parsed = infoRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const next = {};
      for (const issue of parsed.error.issues) next[issue.path[0]] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await infoRequestClient.submit({ ...parsed.data, formToken: formToken ?? '' });
      setDone(true);
    } catch (err) {
      setApiError(
        err?.code === 'form_token_invalid'
          ? 'No pudimos recibirla. Espera unos segundos y envíala de nuevo.'
          : err?.status === 429
            ? 'Recibimos varias solicitudes desde esta conexión. Intenta más tarde o escríbenos por WhatsApp.'
            : 'No pudimos enviar la solicitud. Revisa tu conexión e intenta de nuevo, o escríbenos por WhatsApp.',
      );
      // A new token for the next try.
      infoRequestClient
        .getFormToken()
        .then((r) => setFormToken(r.formToken))
        .catch(() => {});
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <section
        aria-labelledby={headingId}
        className="rounded-xl bg-surface p-6 text-center shadow-sm md:p-8"
      >
        <AnimatedCheck label="Solicitud enviada" size={72} className="mx-auto" />
        <Heading
          id={headingId}
          ref={doneRef}
          tabIndex={-1}
          className="mt-4 font-display text-h3 font-bold text-ink outline-none"
        >
          ¡Listo!
        </Heading>
        <p className="mx-auto mt-2 max-w-prose text-lead text-ink" role="status">
          Recibimos tu solicitud. Te contactaremos por WhatsApp en horario de atención.
        </p>
        <Button
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size="lg"
          icon={<WhatsAppIcon />}
          className="mt-6"
        >
          Escribir por WhatsApp ahora
          <ExternalLinkMark />
        </Button>
      </section>
    );
  }

  const forChild = form.forWhom === INFO_REQUEST_FOR.CHILD;
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl bg-surface p-5 text-ink shadow-sm md:p-8"
    >
      <Heading id={headingId} className="font-display text-h3 font-bold text-ink">
        {title}
      </Heading>
      <p className="mt-1 text-body text-ink-soft">
        Déjanos tus datos y te escribimos por WhatsApp. Los campos marcados son obligatorios.
      </p>
      {apiError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger-soft p-3 text-body font-semibold text-ink"
        >
          {apiError}
        </p>
      )}
      <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-6">
        <TextField
          label="Nombre completo"
          required
          autoComplete="name"
          value={form.fullName}
          onChange={onText('fullName')}
          error={errors.fullName}
        />
        <TextField
          label="Celular / WhatsApp"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          hint="Por ejemplo 310 123 4567."
          value={form.phone}
          onChange={onText('phone')}
          error={errors.phone}
        />
        <TextField
          label="Correo (opcional)"
          type="email"
          inputMode="email"
          autoComplete="email"
          hint="Si lo dejas, te enviamos una confirmación."
          value={form.email}
          onChange={onText('email')}
          error={errors.email}
        />
        <RadioCards
          legend="Programa de interés (obligatorio)"
          name={`${headingId}-programa`}
          value={form.program}
          onChange={set('program')}
          error={errors.program}
          options={Object.entries(INFO_REQUEST_PROGRAM_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <RadioCards
          legend="¿Para quién es? (obligatorio)"
          name={`${headingId}-para`}
          value={form.forWhom}
          onChange={set('forWhom')}
          error={errors.forWhom}
          options={[
            { value: INFO_REQUEST_FOR.SELF, label: 'Para mí' },
            { value: INFO_REQUEST_FOR.CHILD, label: 'Para mi hijo o hija' },
          ]}
        />
        {forChild && (
          <TextField
            label="Edad del niño o niña"
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={17}
            autoComplete="off"
            hint="Solo la edad: no necesitamos más datos del menor."
            value={form.childAge}
            onChange={onText('childAge')}
            error={errors.childAge}
            className="max-w-[10rem]"
          />
        )}
        <fieldset>
          <legend className="mb-2 text-body font-semibold text-ink">
            Horario preferido (opcional)
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(INFO_REQUEST_TIMES).map(([key, label]) => (
              <CheckboxField
                key={key}
                checked={form.preferredTimes.includes(key)}
                onChange={(v) =>
                  set('preferredTimes')(
                    v
                      ? [...form.preferredTimes, key]
                      : form.preferredTimes.filter((t) => t !== key),
                  )
                }
              >
                {label}
              </CheckboxField>
            ))}
          </div>
        </fieldset>
        <TextAreaField
          label="Mensaje (opcional)"
          rows={4}
          maxLength={INFO_REQUEST_MESSAGE_MAX}
          hint={`${form.message.length} de ${INFO_REQUEST_MESSAGE_MAX} caracteres.`}
          value={form.message}
          onChange={onText('message')}
          error={errors.message}
        />
        {/* Trap for bots: hidden from people and from screen readers. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            No llenar este campo
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={onText('website')}
            />
          </label>
        </div>
        <CheckboxField
          checked={form.acceptPrivacy}
          onChange={set('acceptPrivacy')}
          error={errors.acceptPrivacy}
        >
          (Obligatoria) Autorizo al club a usar estos datos para responder mi solicitud, según la{' '}
          <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className={LINK}>
            Política de Tratamiento de Datos
            <ExternalLinkMark text="se abre en otra pestaña" />
          </Link>
          .
        </CheckboxField>
        <CheckboxField checked={form.marketing} onChange={set('marketing')}>
          (Opcional) Quiero recibir novedades y promociones del club.
        </CheckboxField>
        <Button type="submit" size="lg" fullWidth loading={sending} loadingText="Enviando…">
          Enviar solicitud
        </Button>
      </form>
    </section>
  );
}
