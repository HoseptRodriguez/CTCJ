import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, announcementSchema } from '@ctcj/shared';
import { useRef, useState } from 'react';

import { announcementsClient } from '../../api/notificationsClient.js';
import { tournamentClient } from '../../api/tournamentClient.js';
import { BasicFormat } from '../../components/forms/BasicFormat.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { RadioCards, SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAsync } from '../../lib/useAsync.js';
import { DATE_TIME_MEDIUM, SectionCard } from '../mictcj/shared.jsx';

const AUDIENCES = [
  { value: 'ALL', label: 'Todas las personas con cuenta' },
  { value: 'PLAYERS', label: 'Solo jugadores' },
  { value: 'CATEGORY', label: 'Jugadores de una categoría' },
  { value: 'TOURNAMENT', label: 'Inscritos en un torneo' },
  { value: 'GUARDIANS', label: 'Acudientes' },
];
const CATEGORIES = [
  { value: 'SEGUNDA', label: 'Segunda' },
  { value: 'TERCERA', label: 'Tercera' },
  { value: 'CUARTA', label: 'Cuarta' },
  { value: 'QUINTA', label: 'Quinta' },
];
const STATUS = {
  SCHEDULED: { label: 'Programado', badge: 'pendiente' },
  SENT: { label: 'Enviado', badge: 'al-dia' },
  CANCELLED: { label: 'Cancelado', badge: 'suspendida' },
};
const EMPTY = {
  title: '',
  body: '',
  imageUrl: null,
  imageAlt: '',
  kind: '',
  audienceType: 'ALL',
  audienceCategory: '',
  audienceTournamentId: '',
  when: 'NOW',
  scheduledLocal: '',
};

/** "2026-10-07T07:00" (club time, from <input type="datetime-local">) -> ISO with offset. */
const toIso = (local) => (local ? `${local}:00-05:00` : null);
/** ISO -> "2026-10-07T07:00" in club time. */
function toLocalInput(iso) {
  const d = new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

/** The payload the API expects, from the form. */
function draftOf(form) {
  return {
    title: form.title,
    body: form.body,
    imageUrl: form.imageUrl || null,
    imageAlt: form.imageUrl ? form.imageAlt : null,
    kind: form.kind || undefined,
    audienceType: form.audienceType,
    audienceCategory: form.audienceType === 'CATEGORY' ? form.audienceCategory || null : null,
    audienceTournamentId:
      form.audienceType === 'TOURNAMENT' ? form.audienceTournamentId || null : null,
    scheduledFor: form.when === 'LATER' ? toIso(form.scheduledLocal) : null,
  };
}

/** Wraps the selection of a textarea with format marks (or inserts them). */
function wrapSelection(textarea, value, before, after = '', placeholder = '') {
  const start = textarea?.selectionStart ?? value.length;
  const end = textarea?.selectionEnd ?? value.length;
  const selected = value.slice(start, end) || placeholder;
  return value.slice(0, start) + before + selected + after + value.slice(end);
}

function Editor({ onSent }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [apiError, setApiError] = useState(null);
  const bodyRef = useRef(null);
  const tournaments = useAsync(
    () => tournamentClient.listTournaments().then((d) => d.tournaments),
    [],
  );

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setPreview(null); // a change makes the preview old
  };
  const onText = (key) => (e) => set(key)(e.target.value);

  function validate() {
    const parsed = announcementSchema.safeParse(draftOf(form));
    const next = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[issue.path[0]] ??= issue.message;
    }
    if (form.when === 'LATER' && !form.scheduledLocal)
      next.scheduledFor = 'Elige la fecha y la hora.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function showPreview() {
    setApiError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      setPreview(await announcementsClient.preview(draftOf(form)));
    } catch (err) {
      setApiError(err?.message ?? 'No pudimos preparar la vista previa.');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setApiError(null);
    try {
      await announcementsClient.create(draftOf(form));
      toast({
        title: form.when === 'LATER' ? 'Comunicado programado' : 'Comunicado enviado',
        tone: 'success',
      });
      setForm(EMPTY);
      setPreview(null);
      onSent();
    } catch (err) {
      if (err?.code === 'outside_promotional_hours') {
        setApiError(
          `A esa hora no se pueden enviar promociones. La siguiente hora permitida es ${DATE_TIME_MEDIUM.format(
            new Date(err.details.suggestedTime),
          )}.`,
        );
      } else {
        setApiError(err?.message ?? 'No pudimos enviar el comunicado.');
      }
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function uploadImage(file) {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await announcementsClient.uploadImage(file);
      set('imageUrl')(url);
    } catch (err) {
      setErrors((e) => ({ ...e, imageUrl: err?.message ?? 'No pudimos subir la imagen.' }));
    } finally {
      setBusy(false);
    }
  }

  const format = (before, after, placeholder) =>
    set('body')(wrapSelection(bodyRef.current, form.body, before, after, placeholder));

  return (
    <SectionCard
      title="Nuevo comunicado"
      description="Redáctalo, mira cómo se verá y a cuántas personas llegará, y envíalo o prográmalo."
      async={{ status: 'ready', data: true }}
    >
      {() => (
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              showPreview();
            }}
            noValidate
            className="space-y-6"
          >
            <TextField
              label="Título"
              required
              maxLength={ANNOUNCEMENT_TITLE_MAX}
              value={form.title}
              onChange={onText('title')}
              error={errors.title}
            />
            <div>
              <div
                className="mb-2 flex flex-wrap gap-2"
                role="toolbar"
                aria-label="Formato del texto"
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => format('**', '**', 'texto')}
                >
                  Negrita
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => format('\n- ', '', 'elemento')}
                >
                  Lista
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => format('[', '](https://)', 'texto del enlace')}
                >
                  Enlace
                </Button>
              </div>
              <TextAreaField
                ref={bodyRef}
                label="Texto"
                required
                rows={8}
                maxLength={ANNOUNCEMENT_BODY_MAX}
                hint="**negrita**, una línea que empieza con «- » es una lista, [texto](https://…) es un enlace."
                value={form.body}
                onChange={onText('body')}
                error={errors.body}
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-body font-semibold text-ink">Imagen (opcional)</legend>
              {form.imageUrl ? (
                <div className="space-y-3">
                  <img src={form.imageUrl} alt="" className="max-h-48 rounded-lg" />
                  <TextField
                    label="Describe la imagen para quien no puede verla"
                    required
                    maxLength={200}
                    value={form.imageAlt}
                    onChange={onText('imageAlt')}
                    error={errors.imageAlt}
                  />
                  <Button type="button" variant="secondary" onClick={() => set('imageUrl')(null)}>
                    Quitar imagen
                  </Button>
                </div>
              ) : (
                <label className="block text-body text-ink">
                  JPG, PNG o WebP, máximo 5 MB. Le quitamos los datos ocultos (como la ubicación).
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="focus-ring mt-2 block w-full rounded-lg text-body"
                    onChange={(e) => uploadImage(e.target.files?.[0])}
                  />
                </label>
              )}
              {errors.imageUrl && (
                <p role="alert" className="text-body font-semibold text-danger">
                  {errors.imageUrl}
                </p>
              )}
            </fieldset>

            <RadioCards
              legend="Tipo (obligatorio)"
              name="announcement-kind"
              value={form.kind}
              onChange={set('kind')}
              error={errors.kind}
              options={[
                { value: 'SERVICE', label: 'Servicio' },
                { value: 'PROMOTIONAL', label: 'Promocional' },
              ]}
            />

            <SelectField
              label="Destinatarios"
              value={form.audienceType}
              onChange={onText('audienceType')}
              options={AUDIENCES}
            />
            {form.audienceType === 'CATEGORY' && (
              <SelectField
                label="Categoría"
                value={form.audienceCategory}
                onChange={onText('audienceCategory')}
                error={errors.audienceCategory}
                options={[{ value: '', label: 'Elige una categoría' }, ...CATEGORIES]}
              />
            )}
            {form.audienceType === 'TOURNAMENT' && (
              <SelectField
                label="Torneo"
                value={form.audienceTournamentId}
                onChange={onText('audienceTournamentId')}
                error={errors.audienceTournamentId}
                options={[
                  { value: '', label: 'Elige un torneo' },
                  ...(tournaments.data ?? [])
                    .filter((t) => t.status !== 'CANCELLED')
                    .map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            )}

            <RadioCards
              legend="¿Cuándo?"
              name="announcement-when"
              value={form.when}
              onChange={set('when')}
              options={[
                { value: 'NOW', label: 'Enviar ahora' },
                { value: 'LATER', label: 'Programar' },
              ]}
            />
            {form.when === 'LATER' && (
              <TextField
                label="Fecha y hora (hora de Colombia)"
                type="datetime-local"
                required
                value={form.scheduledLocal}
                onChange={onText('scheduledLocal')}
                error={errors.scheduledFor}
              />
            )}

            {apiError && (
              <p
                role="alert"
                className="rounded-lg bg-danger-soft p-3 text-body font-semibold text-ink"
              >
                {apiError}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="secondary" size="lg" loading={busy && !confirming}>
                Ver vista previa
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={!preview || busy}
                onClick={() => setConfirming(true)}
              >
                {form.when === 'LATER' ? 'Programar…' : 'Enviar…'}
              </Button>
            </div>
            {!preview && (
              <p className="text-body-sm text-ink-soft">
                Antes de enviar, mira la vista previa: así sabes a cuántas personas llegará.
              </p>
            )}
          </form>

          <aside className="space-y-4" aria-label="Ayuda">
            <div className="rounded-xl bg-page p-4">
              <h3 className="font-display text-h3 font-bold text-ink">Servicio o promocional</h3>
              <p className="mt-2 text-body text-ink">
                <strong>Servicio:</strong> avisos del día a día sobre lo que la gente ya tiene con
                el club (cierre de canchas por lluvia, mantenimiento). Llegan a todos, cualquier día
                de 7:00 a. m. a 9:00 p. m.
              </p>
              <p className="mt-2 text-body text-ink">
                <strong>Promocional:</strong> eventos, ofertas y novedades. Solo llegan a quien lo
                autorizó, de lunes a viernes de 7:00 a. m. a 7:00 p. m. y sábados de 8:00 a. m. a
                3:00 p. m.; nunca domingos ni festivos (Ley 2300 de 2023).
              </p>
            </div>
            {preview && (
              <Preview
                preview={preview}
                onUseSuggested={(iso) => {
                  set('when')('LATER');
                  setForm((f) => ({ ...f, when: 'LATER', scheduledLocal: toLocalInput(iso) }));
                }}
              />
            )}
          </aside>

          <ConfirmDialog
            open={confirming}
            tone="primary"
            title={
              form.when === 'LATER'
                ? '¿Programar este comunicado?'
                : '¿Enviar este comunicado ahora?'
            }
            description={
              preview
                ? `Lo recibirán ${preview.recipients} ${preview.recipients === 1 ? 'persona' : 'personas'}${
                    preview.excluded ? ` (${preview.excluded} no, por sus preferencias)` : ''
                  }. Una vez enviado no se puede retirar.`
                : ''
            }
            confirmLabel={form.when === 'LATER' ? 'Sí, programar' : 'Sí, enviar'}
            loading={busy}
            onConfirm={send}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}
    </SectionCard>
  );
}

function Preview({ preview, onUseSuggested }) {
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-xl border-2 border-navy-500 p-4">
        <h3 className="font-display text-h3 font-bold text-ink">Quiénes lo recibirán</h3>
        <p className="mt-2 text-lead text-ink">
          <strong>{preview.recipients}</strong> {preview.recipients === 1 ? 'persona' : 'personas'}
        </p>
        <p className="text-body text-ink-soft">
          {preview.byApp} en la app · {preview.byEmail} por correo
          {preview.excluded > 0 && ` · ${preview.excluded} no lo recibirán por sus preferencias`}
        </p>
      </div>
      {preview.suggestedTime && (
        <div
          role="alert"
          className="rounded-xl border-2 border-amber bg-amber-soft p-4 text-body text-ink"
        >
          <p className="font-semibold">A esa hora no se pueden enviar promociones.</p>
          <p className="mt-1">
            La siguiente hora permitida es{' '}
            {DATE_TIME_MEDIUM.format(new Date(preview.suggestedTime))}.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => onUseSuggested(preview.suggestedTime)}
          >
            Programar a esa hora
          </Button>
        </div>
      )}
      <div className="rounded-xl border border-line p-4">
        <h3 className="font-display text-h3 font-bold text-ink">En la app</h3>
        <p className="mt-2 text-body font-semibold text-ink">{preview.app.title}</p>
        <p className="text-body text-ink-soft">{preview.app.body}</p>
      </div>
      <div className="rounded-xl border border-line p-4">
        <h3 className="font-display text-h3 font-bold text-ink">Por correo</h3>
        <p className="mt-1 text-body-sm text-ink-soft">Asunto: {preview.email.subject}</p>
        <iframe
          title="Vista previa del correo"
          srcDoc={preview.email.html}
          sandbox=""
          className="mt-2 h-96 w-full rounded-lg border border-line bg-surface"
        />
      </div>
    </div>
  );
}

function History({ data, onCancel }) {
  return (
    <SectionCard
      title="Historial"
      async={data}
      isEmpty={(d) => d.announcements.length === 0}
      empty={{ title: 'Todavía no hay comunicados' }}
    >
      {(d) => (
        <div className="space-y-4">
          <ul className="space-y-3" aria-label="Comunicados">
            {d.announcements.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lead font-semibold text-ink">{a.title}</p>
                  <StatusBadge status={STATUS[a.status].badge} label={STATUS[a.status].label} />
                  <StatusBadge
                    status="suspendida"
                    label={a.kind === 'PROMOTIONAL' ? 'Promocional' : 'Servicio'}
                  />
                </div>
                <p className="mt-1 text-body text-ink-soft">
                  {a.status === 'SCHEDULED'
                    ? 'Sale el '
                    : a.status === 'SENT'
                      ? 'Enviado el '
                      : 'Iba a salir el '}
                  {DATE_TIME_MEDIUM.format(new Date(a.dispatchedAt ?? a.scheduledFor))}
                  {a.recipientsCount != null && ` · ${a.recipientsCount} personas`}
                </p>
                {a.status === 'SENT' && (
                  <p className="text-body text-ink">
                    Correos: {a.emails.sent} enviados · {a.emails.queued} en cola ·{' '}
                    {a.emails.failed} fallidos · {a.emails.opened} abiertos
                  </p>
                )}
                <details className="mt-2">
                  <summary className="focus-ring min-h-btn cursor-pointer rounded font-semibold text-navy-500">
                    Ver el texto
                  </summary>
                  <BasicFormat text={a.body} className="mt-2" />
                </details>
                {a.status === 'SCHEDULED' && (
                  <Button variant="secondary" className="mt-3" onClick={() => onCancel(a)}>
                    Cancelar envío
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

/** Staff -> Comunicados (Administración). */
export function AnnouncementsPage() {
  useDocumentTitle('Comunicados');
  const toast = useToast();
  const history = useAsync(() => announcementsClient.list(), []);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      await announcementsClient.cancel(cancelling.id);
      toast({ title: 'Envío cancelado', tone: 'success' });
      history.reload();
    } catch {
      toast({ title: 'No se pudo cancelar', tone: 'error' });
    } finally {
      setBusy(false);
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados"
        description="Avisos del club a jugadores y acudientes: en la campana, en Novedades y por correo."
      />
      {history.data?.waitingForQuota > 0 && (
        <p
          role="status"
          className="rounded-xl border-2 border-amber bg-amber-soft p-4 text-body text-ink"
        >
          <strong>{history.data.waitingForQuota} correos esperan al día siguiente</strong> porque se
          llegó al límite de envíos del plan de correo. Salen solos; si pasa seguido, conviene subir
          de plan.
        </p>
      )}
      <Editor onSent={history.reload} />
      <History data={history} onCancel={setCancelling} />
      <ConfirmDialog
        open={cancelling != null}
        tone="danger"
        title="¿Cancelar este envío programado?"
        description={cancelling ? `"${cancelling.title}" no se enviará.` : ''}
        confirmLabel="Sí, cancelar"
        loading={busy}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
