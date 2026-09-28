import {
  DATA_REQUEST_KIND,
  DATA_REQUEST_KIND_LABELS,
  DATA_REQUEST_STATUS_LABELS,
  DATA_REQUEST_TYPE,
} from '@ctcj/shared';
import { useState } from 'react';

import { privacyClient } from '../../api/privacyClient.js';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { CheckboxField, TextAreaField } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { describePrivacyError } from '../../lib/privacyErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';
import { DATE_MEDIUM, SectionCard, personName } from '../mictcj/shared.jsx';

import { FormAlert, StaffRow } from './staffShared.jsx';

/** "YYYY-MM-DD" (a club date) → "13 oct 2026". */
const formatDay = (ymd) => DATE_MEDIUM.format(new Date(`${ymd}T12:00:00-05:00`));

/** The deadline, always in words and never by color alone. */
export function deadlineBadge(r) {
  if (r.alert === 'ANSWERED') return { status: 'al-dia', label: 'Respondida' };
  if (r.alert === 'OVERDUE') {
    const days = Math.abs(r.businessDaysLeft);
    return {
      status: 'vencida',
      label: `Vencida hace ${days} día${days === 1 ? '' : 's'} hábil${days === 1 ? '' : 'es'}`,
    };
  }
  const left =
    r.businessDaysLeft === 0
      ? 'Vence hoy'
      : `Vence en ${r.businessDaysLeft} día${r.businessDaysLeft === 1 ? '' : 's'} hábil${r.businessDaysLeft === 1 ? '' : 'es'}`;
  return { status: r.alert === 'DUE_SOON' ? 'vencida' : 'pendiente', label: left };
}

function AnswerPanel({ item, onClose, onAnswered }) {
  const toast = useToast();
  const [answer, setAnswer] = useState('');
  const [erase, setErase] = useState(false);
  const [confirming, setConfirming] = useState(null); // 'EN_TRAMITE' | 'RESPONDIDA'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isDeletion = item?.kind === DATA_REQUEST_KIND.SUPRESION;

  function ask(status) {
    if (status === 'RESPONDIDA' && answer.trim().length < 5) {
      setError('Escribe la respuesta que recibirá la persona.');
      return;
    }
    setError(null);
    setConfirming(status);
  }

  async function send() {
    setBusy(true);
    try {
      const updated = await privacyClient.answerDataRequest(item.id, {
        status: confirming,
        ...(answer.trim() ? { answer: answer.trim() } : {}),
        ...(isDeletion && confirming === 'RESPONDIDA' && erase ? { eraseAccount: true } : {}),
      });
      toast({
        title: confirming === 'RESPONDIDA' ? 'Respuesta enviada' : 'Marcada en trámite',
        description: item.radicado,
        tone: 'success',
      });
      onAnswered(updated);
    } catch (err) {
      setConfirming(null);
      setError(describePrivacyError(err));
    } finally {
      setBusy(false);
    }
  }

  const eraseNow = isDeletion && confirming === 'RESPONDIDA' && erase;
  return (
    <>
      <SlidePanel
        open={item != null}
        onClose={onClose}
        title={item ? item.radicado : 'Solicitud'}
        footer={
          <div className="flex flex-col gap-3">
            <Button size="lg" fullWidth onClick={() => ask('RESPONDIDA')}>
              Enviar respuesta
            </Button>
            {item?.status === 'RECIBIDA' && (
              <Button variant="secondary" size="lg" fullWidth onClick={() => ask('EN_TRAMITE')}>
                Marcar en trámite
              </Button>
            )}
          </div>
        }
      >
        {item && (
          <div className="space-y-6">
            <div className="space-y-2 rounded-xl bg-page p-5">
              <p className="text-body text-ink-soft">
                {DATA_REQUEST_KIND_LABELS[item.kind]} ·{' '}
                {item.requestType === DATA_REQUEST_TYPE.CONSULTA
                  ? 'consulta (10 días hábiles)'
                  : 'reclamo (15 días hábiles)'}
              </p>
              <p className="break-words text-lead font-bold text-ink">
                {personName(item.requester) ?? 'Persona sin nombre'}
              </p>
              <p className="break-words text-body text-ink">{item.requester?.email}</p>
              <p className="whitespace-pre-wrap text-body text-ink">“{item.description}”</p>
              <p className="text-body-sm text-ink-soft">
                Recibida el {DATE_MEDIUM.format(new Date(item.receivedAt))} · responder a más tardar
                el {formatDay(item.dueOn)}
              </p>
            </div>
            <TextAreaField
              label="Respuesta para la persona"
              rows={5}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              hint="La verá en Mi CTCJ › Mis datos y privacidad. Escribe en lenguaje sencillo."
            />
            {isDeletion && (
              <CheckboxField checked={erase} onChange={setErase}>
                Eliminar la cuenta al enviar la respuesta: se borran sus datos personales y lo que
                publicó en la Comunidad; se conservan facturas, registros de salud y la prueba de
                sus autorizaciones.
              </CheckboxField>
            )}
            <FormAlert>{error}</FormAlert>
          </div>
        )}
      </SlidePanel>
      <ConfirmDialog
        open={confirming != null}
        tone={eraseNow ? 'danger' : 'primary'}
        title={
          eraseNow
            ? '¿Responder y eliminar la cuenta?'
            : confirming === 'RESPONDIDA'
              ? '¿Enviar la respuesta?'
              : '¿Marcar en trámite?'
        }
        description={
          eraseNow
            ? 'La cuenta quedará anonimizada y la persona ya no podrá entrar. Esto no se puede deshacer.'
            : confirming === 'RESPONDIDA'
              ? 'La solicitud quedará respondida y la persona verá tu respuesta.'
              : 'La persona verá que su solicitud está en trámite. El plazo no cambia.'
        }
        confirmLabel={
          eraseNow
            ? 'Sí, eliminar cuenta'
            : confirming === 'RESPONDIDA'
              ? 'Sí, enviar'
              : 'Sí, marcar'
        }
        loading={busy}
        onConfirm={send}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}

/**
 * Staff → Datos personales: the consultas y reclamos of the data subjects
 * (Ley 1581 de 2012), with their radicado and legal deadline. The ones
 * closest to their deadline come first; near or past it, they say so.
 */
export function DataRequestsPage() {
  useDocumentTitle('Datos personales');
  const requests = useAsync(() => privacyClient.listDataRequests(), []);
  const [openId, setOpenId] = useState(null);
  const item = requests.data?.requests.find((r) => r.id === openId) ?? null;
  const late = (requests.data?.requests ?? []).filter(
    (r) => r.alert === 'OVERDUE' || r.alert === 'DUE_SOON',
  );

  return (
    <div>
      <PageHeader
        title="Datos personales"
        description="Consultas y reclamos sobre datos personales. La ley da 10 días hábiles para una consulta y 15 para un reclamo."
      />
      {late.length > 0 && (
        <p
          role="status"
          className="mb-6 rounded-xl border-2 border-amber bg-amber-soft p-4 text-body font-semibold text-ink"
        >
          {late.length === 1
            ? '1 solicitud está vencida o por vencer.'
            : `${late.length} solicitudes están vencidas o por vencer.`}{' '}
          Respóndelas primero.
        </p>
      )}
      <SectionCard
        title="Solicitudes"
        async={requests}
        isEmpty={(d) => d.requests.length === 0}
        empty={{ title: 'No hay solicitudes sobre datos personales' }}
      >
        {(d) => (
          <ul className="space-y-3" aria-label="Solicitudes sobre datos personales">
            {d.requests.map((r) => {
              const badge = deadlineBadge(r);
              return (
                <li key={r.id}>
                  <StaffRow
                    title={`${r.radicado} · ${DATA_REQUEST_KIND_LABELS[r.kind]}`}
                    badge={<StatusBadge status={badge.status} label={badge.label} />}
                    subtitle={
                      <span className="break-words">
                        {personName(r.requester) ?? 'Persona sin nombre'}
                        {r.requester?.email ? ` · ${r.requester.email}` : ''}
                      </span>
                    }
                    meta={`${r.status === 'RECIBIDA' ? 'Recibida' : `${DATA_REQUEST_STATUS_LABELS[r.status]} · recibida`} el ${DATE_MEDIUM.format(new Date(r.receivedAt))} · plazo: ${formatDay(r.dueOn)}`}
                    actions={
                      r.status === 'RESPONDIDA' ? null : (
                        <Button onClick={() => setOpenId(r.id)}>Responder</Button>
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      <AnswerPanel
        key={openId ?? 'none'}
        item={item}
        onClose={() => setOpenId(null)}
        onAnswered={(updated) => {
          requests.setData((d) => ({
            requests: d.requests.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
          }));
          setOpenId(null);
        }}
      />
    </div>
  );
}
