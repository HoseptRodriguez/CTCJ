import {
  INFO_REQUEST_PROGRAM_LABELS,
  INFO_REQUEST_STATUS,
  INFO_REQUEST_STATUS_LABELS,
  INFO_REQUEST_TIMES,
} from '@ctcj/shared';
import { useState } from 'react';

import { infoRequestClient } from '../../api/infoRequestClient.js';
import { ExternalLinkMark } from '../../components/forms/ExternalLinkMark.jsx';
import { WhatsAppIcon } from '../../components/icons/WhatsAppIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { SelectField, TextAreaField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAsync } from '../../lib/useAsync.js';
import { DATE_TIME_MEDIUM, SectionCard, personName } from '../mictcj/shared.jsx';

const BADGE = {
  NUEVA: 'pendiente',
  CONTACTADA: 'al-dia',
  INSCRITA: 'al-dia',
  DESCARTADA: 'suspendida',
};

/** A WhatsApp chat with a first message ready (the staff edits it before sending). */
export function whatsappLink(r) {
  const text =
    `Hola, ${r.fullName.split(' ')[0]}. Te escribimos del Club de Tenis Ciudad Jardín ` +
    `por tu solicitud de información sobre ${INFO_REQUEST_PROGRAM_LABELS[r.program].toLowerCase()}.`;
  return `https://wa.me/${r.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

function RequestCard({ r, onChanged }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action, done) {
    setBusy(true);
    try {
      onChanged(await action());
      toast({ title: done, tone: 'success' });
    } catch {
      toast({ title: 'No se pudo guardar', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const who =
    r.forWhom === 'CHILD' ? `Para su hijo o hija de ${r.childAge} años` : 'Para la persona misma';
  const times = r.preferredTimes.map((t) => INFO_REQUEST_TIMES[t]).join(', ');
  return (
    <li className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lead font-bold text-ink">{r.fullName}</p>
        <StatusBadge status={BADGE[r.status]} label={INFO_REQUEST_STATUS_LABELS[r.status]} />
        <StatusBadge status="suspendida" label={INFO_REQUEST_PROGRAM_LABELS[r.program]} />
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-body text-ink sm:grid-cols-2">
        <div>
          <dt className="sr-only">Celular</dt>
          <dd>{r.phone}</dd>
        </div>
        {r.email && (
          <div>
            <dt className="sr-only">Correo</dt>
            <dd className="break-all">{r.email}</dd>
          </div>
        )}
        <div>
          <dt className="sr-only">Para quién</dt>
          <dd>{who}</dd>
        </div>
        <div>
          <dt className="sr-only">Horario preferido</dt>
          <dd>{times ? `Prefiere: ${times}` : 'Sin horario preferido'}</dd>
        </div>
      </dl>
      {r.message && <p className="rounded-lg bg-page p-3 text-body text-ink">“{r.message}”</p>}
      <p className="text-body-sm text-ink-soft">
        Recibida el {DATE_TIME_MEDIUM.format(new Date(r.createdAt))}
        {r.marketingOptIn ? ' · Quiere recibir novedades' : ''}
        {r.handledBy ? ` · Atendida por ${personName(r.handledBy)}` : ''}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Button
          href={whatsappLink(r)}
          target="_blank"
          rel="noopener noreferrer"
          icon={<WhatsAppIcon />}
        >
          Escribir por WhatsApp
          <ExternalLinkMark />
        </Button>
        <SelectField
          label="Estado"
          value={r.status}
          disabled={busy}
          onChange={(e) =>
            run(() => infoRequestClient.setStatus(r.id, e.target.value), 'Estado actualizado')
          }
          options={Object.values(INFO_REQUEST_STATUS).map((value) => ({
            value,
            label: INFO_REQUEST_STATUS_LABELS[value],
          }))}
        />
      </div>
      {r.notes.length > 0 && (
        <ul className="space-y-2" aria-label="Notas internas">
          {r.notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-page p-3 text-body text-ink">
              {n.text}
              <span className="block text-body-sm text-ink-soft">
                {personName(n.author) ?? 'Alguien del club'} ·{' '}
                {DATE_TIME_MEDIUM.format(new Date(n.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          run(() => infoRequestClient.addNote(r.id, note.trim()), 'Nota guardada').then(() =>
            setNote(''),
          );
        }}
        className="space-y-3"
      >
        <TextAreaField
          label="Nota interna (solo la ve el club)"
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" variant="secondary" loading={busy} loadingText="Guardando…">
          Guardar nota
        </Button>
      </form>
    </li>
  );
}

/** Staff → Solicitudes de información (Administración y Recepción). */
export function InfoRequestsPage() {
  useDocumentTitle('Solicitudes de información');
  const [status, setStatus] = useState(INFO_REQUEST_STATUS.NUEVA);
  const [program, setProgram] = useState('');
  const requests = useAsync(
    () => infoRequestClient.list({ status, program }).then((d) => d.requests),
    [status, program],
  );

  return (
    <div>
      <PageHeader
        title="Solicitudes de información"
        description="Personas que pidieron información desde el sitio. Escríbeles por WhatsApp y marca cómo quedó."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'Todos' },
            ...Object.values(INFO_REQUEST_STATUS).map((value) => ({
              value,
              label: INFO_REQUEST_STATUS_LABELS[value],
            })),
          ]}
        />
        <SelectField
          label="Programa"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          options={[
            { value: '', label: 'Todos' },
            ...Object.entries(INFO_REQUEST_PROGRAM_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>
      <SectionCard
        title={requests.data ? `${requests.data.length} solicitudes` : 'Solicitudes'}
        async={requests}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'No hay solicitudes con estos filtros' }}
      >
        {(list) => (
          <ul className="space-y-4" aria-label="Solicitudes">
            {list.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                onChanged={(updated) =>
                  requests.setData((d) => d.map((x) => (x.id === updated.id ? updated : x)))
                }
              />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
