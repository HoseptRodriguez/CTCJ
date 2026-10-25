import {
  DATA_REQUEST_KIND,
  DATA_REQUEST_KIND_LABELS,
  DATA_REQUEST_STATUS_LABELS,
  submitDataRequestSchema,
} from '@ctcj/shared';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { consentClient } from '../../api/consentClient.js';
import { privacyClient } from '../../api/privacyClient.js';
import { OptionalAuthorization } from '../../components/legal/OptionalAuthorization.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { SelectField, TextAreaField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { openCookieSettings } from '../../lib/cookieSettingsEvent.js';
import { describePrivacyError } from '../../lib/privacyErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';

import { DATE_MEDIUM, SectionCard } from './shared.jsx';

const LINK =
  'focus-ring inline-flex min-h-btn items-center rounded-lg font-semibold text-navy-500 underline underline-offset-4';

const STATUS_BADGE = { RECIBIDA: 'pendiente', EN_TRAMITE: 'pendiente', RESPONDIDA: 'al-dia' };

/** "YYYY-MM-DD" (a club date) → "13 oct 2026". */
const formatDay = (ymd) => DATE_MEDIUM.format(new Date(`${ymd}T12:00:00-05:00`));

function AuthorizationsCard() {
  const authorizations = useAsync(() => consentClient.getMyAuthorizations(), []);
  const replace = (saved) =>
    authorizations.setData((d) => ({
      ...d,
      items: d.items.map((i) => (i.type === saved.type ? saved : i)),
    }));

  return (
    <SectionCard
      title="Mis autorizaciones"
      description="Las opcionales las das o las retiras cuando quieras. Cada cambio queda registrado con su fecha."
      async={authorizations}
    >
      {(a) => (
        <div className="divide-y divide-line">
          {a.items.map((item) => (
            <div key={item.type} className="py-6 first:pt-0">
              <OptionalAuthorization item={item} isMinor={a.isMinor} onSaved={replace} />
            </div>
          ))}
          <div className="space-y-3 py-6">
            <h3 className="text-lead font-semibold text-ink">Cookies</h3>
            <p className="text-body text-ink">
              {a.cookies.decidedAt
                ? `Tu última decisión fue el ${DATE_MEDIUM.format(new Date(a.cookies.decidedAt))}: preferencias ${a.cookies.preferences ? 'activadas' : 'desactivadas'}.`
                : 'Tus preferencias de cookies se guardan en este navegador.'}
            </p>
            <Button variant="secondary" onClick={openCookieSettings}>
              Cambiar preferencias de cookies
            </Button>
          </div>
          <div className="space-y-2 pt-6">
            <h3 className="text-lead font-semibold text-ink">Política de datos y Términos</h3>
            <p className="text-body text-ink">
              Son necesarias para tener una cuenta en el club. Si ya no estás de acuerdo, puedes
              pedir que eliminemos tu cuenta (más abajo).
            </p>
            <div className="flex flex-wrap gap-x-6">
              <Link to="/privacidad" className={LINK}>
                Política de datos personales
              </Link>
              <Link to="/terminos" className={LINK}>
                Términos y condiciones
              </Link>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function DownloadCard() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const data = await privacyClient.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis-datos-ctcj-${data.generatedAt.slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Descargamos tus datos', tone: 'success' });
    } catch (err) {
      toast({
        title: 'No pudimos preparar tus datos',
        description: describePrivacyError(err),
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Descargar mis datos"
      description="Un archivo con lo que el club guarda sobre ti: perfil, autorizaciones, reservas, facturas y Comunidad. Tus datos de salud no van en el archivo por ser sensibles: los ves en Mi CTCJ o puedes pedir una copia con una consulta."
    >
      <Button onClick={download} loading={loading} loadingText="Preparando…">
        Descargar mis datos (JSON)
      </Button>
    </Card>
  );
}

function RequestForm({ kind, setKind, formRef, onCreated }) {
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (Object.keys(errors).length)
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [errors, formRef]);

  async function submit(e) {
    e.preventDefault();
    const parsed = submitDataRequestSchema.safeParse({ kind, description });
    if (!parsed.success) {
      const next = {};
      for (const issue of parsed.error.issues) next[issue.path[0]] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    setApiError(null);
    try {
      const result = await privacyClient.submitDataRequest(parsed.data);
      setCreated(result);
      setDescription('');
      onCreated(result);
    } catch (err) {
      setApiError(describePrivacyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      {created && (
        <div role="status" className="rounded-lg border-2 border-status-ok-fg bg-status-ok-bg p-4">
          <p className="text-body font-semibold text-ink">
            Recibimos tu solicitud. Tu número de radicado es {created.radicado}.
          </p>
          <p className="mt-1 text-body text-ink">
            Te responderemos a más tardar el {formatDay(created.dueOn)}. Puedes seguirla abajo, en
            «Mis solicitudes».
          </p>
        </div>
      )}
      <SelectField
        label="¿Qué necesitas?"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        error={errors.kind}
        options={Object.values(DATA_REQUEST_KIND)
          .filter((k) => k !== DATA_REQUEST_KIND.SUPRESION)
          .map((k) => ({ value: k, label: DATA_REQUEST_KIND_LABELS[k] }))}
      />
      <TextAreaField
        label="Cuéntanos"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        hint="Una consulta se responde en máximo 10 días hábiles; un reclamo, en máximo 15."
      />
      {apiError && (
        <p role="alert" className="text-body font-semibold text-danger">
          {apiError}
        </p>
      )}
      <Button type="submit" loading={saving} loadingText="Enviando…">
        Enviar solicitud
      </Button>
    </form>
  );
}

function MyRequestsList({ requests }) {
  return (
    <SectionCard
      title="Mis solicitudes"
      async={requests}
      isEmpty={(d) => d.requests.length === 0}
      empty={{
        title: 'Todavía no has enviado solicitudes',
        description: 'Cuando envíes una, aquí verás su radicado, su estado y la respuesta.',
      }}
    >
      {(d) => (
        <ul className="divide-y divide-line">
          {d.requests.map((r) => (
            <li key={r.id} className="space-y-2 py-4 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-body font-semibold text-ink">
                  {r.radicado} · {DATA_REQUEST_KIND_LABELS[r.kind]}
                </p>
                <StatusBadge
                  status={STATUS_BADGE[r.status]}
                  label={DATA_REQUEST_STATUS_LABELS[r.status]}
                />
              </div>
              <p className="text-body-sm text-ink-soft">
                Enviada el {DATE_MEDIUM.format(new Date(r.receivedAt))}
                {r.status !== 'RESPONDIDA' && ` · respuesta a más tardar el ${formatDay(r.dueOn)}`}
              </p>
              {r.answer && (
                <div className="rounded-lg bg-page p-3">
                  <p className="text-body-sm font-semibold text-ink">Respuesta del club</p>
                  <p className="text-body text-ink">{r.answer}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function DeleteAccountCard({ openDeletion, onCreated }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const created = await privacyClient.submitDataRequest({
        kind: DATA_REQUEST_KIND.SUPRESION,
        description: 'Solicito eliminar mi cuenta y mis datos personales.',
      });
      onCreated(created);
      toast({
        title: `Solicitud radicada: ${created.radicado}`,
        description: `Te responderemos a más tardar el ${formatDay(created.dueOn)}.`,
        tone: 'success',
      });
    } catch (err) {
      toast({
        title: 'No pudimos enviar la solicitud',
        description: describePrivacyError(err),
        tone: 'error',
      });
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <Card
      title="Eliminar mi cuenta"
      description="Borramos tu nombre, contacto, foto, fecha de nacimiento y lo que publicaste en la Comunidad, y cerramos tu sesión en todos los dispositivos."
    >
      <div className="space-y-4">
        <p className="text-body text-ink">
          Solo conservamos lo que la ley nos obliga a guardar, sin tu nombre: facturas y pagos,
          registros de salud y la prueba de tus autorizaciones, durante el tiempo que exige la ley.
        </p>
        {openDeletion ? (
          <p className="rounded-lg border-2 border-amber bg-amber-soft p-4 text-body text-ink">
            Ya tienes una solicitud de eliminación en trámite ({openDeletion.radicado}).
          </p>
        ) : (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Solicitar la eliminación de mi cuenta
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title="¿Solicitar la eliminación de tu cuenta?"
        description="El club revisará tu solicitud y te responderá en máximo 15 días hábiles. Cuando la cuenta se elimine, no podrás recuperarla."
        confirmLabel="Sí, solicitar eliminación"
        loading={saving}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}

/** Mi CTCJ → Mis datos y privacidad (Ley 1581 de 2012). */
export function PrivacyTab() {
  useDocumentTitle('Mis datos y privacidad');
  const requests = useAsync(() => privacyClient.listMyDataRequests(), []);
  const [kind, setKind] = useState(DATA_REQUEST_KIND.CONSULTA);
  const formRef = useRef(null);
  const addRequest = (created) =>
    requests.setData((d) => ({ requests: [created, ...(d?.requests ?? [])] }));
  const openDeletion = requests.data?.requests.find(
    (r) => r.kind === DATA_REQUEST_KIND.SUPRESION && r.status !== 'RESPONDIDA',
  );

  function askCorrection() {
    setKind(DATA_REQUEST_KIND.CORRECCION);
    formRef.current?.scrollIntoView({ block: 'start' });
    formRef.current?.querySelector('textarea')?.focus();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis datos y privacidad"
        description="Qué autorizaste, qué datos tenemos de ti y cómo pedirnos algo sobre ellos."
        backTo="/mi-ctcj/perfil"
        backLabel="Volver a Mi perfil"
        className="mb-0 md:mb-0"
      />
      <AuthorizationsCard />
      <DownloadCard />
      <Card
        title="Corregir mis datos"
        description="Tu teléfono, tu presentación y tu estilo de juego los cambias tú mismo en Mi perfil."
      >
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/mi-ctcj/perfil" className={LINK}>
            Ir a Mi perfil
          </Link>
          <Button variant="secondary" onClick={askCorrection}>
            Pedir que corrijan otro dato
          </Button>
        </div>
      </Card>
      <Card
        title="Consultas y reclamos"
        description="Pregúntanos qué datos tenemos, pide corregirlos o revocar una autorización, o reclama por su uso. Te damos un número de radicado."
      >
        <RequestForm kind={kind} setKind={setKind} formRef={formRef} onCreated={addRequest} />
      </Card>
      <MyRequestsList requests={requests} />
      <DeleteAccountCard openDeletion={openDeletion} onCreated={addRequest} />
    </div>
  );
}
