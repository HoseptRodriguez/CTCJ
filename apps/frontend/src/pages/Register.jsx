import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerSchema } from '@ctcj/shared';

import { authClient } from '../api/authClient.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const INITIAL_FORM = { email: '', password: '', firstName: '', lastName: '' };

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
        errors[issue.path[0]] = issue.message;
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
          Te enviamos un enlace de verificacion a <strong>{form.email}</strong>. Ábrelo para activar
          tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold text-brand">Crear cuenta</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Field
          label="Nombre"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          error={fieldErrors.firstName}
        />
        <Field
          label="Apellido"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          error={fieldErrors.lastName}
        />
        <Field
          label="Correo"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <Field
          label="Contrasena"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          hint="Entre 10 y 100 caracteres."
        />

        {apiError && <p className="text-sm text-red-600">{apiError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-brand-accent">
          Inicia sesion
        </Link>
      </p>
    </div>
  );
}

function Field({ label, name, value, onChange, error, type = 'text', hint }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-accent focus:outline-none"
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
