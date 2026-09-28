import {
  COMMUNITY_RULES_ACCEPTANCE,
  HEALTH_DATA_AUTHORIZATION,
  MARKETING_AUTHORIZATION,
} from '@ctcj/shared';
import { useState } from 'react';

import { consentClient } from '../../api/consentClient.js';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { LegalBlock } from '../../pages/legal/LegalPage.jsx';
import { Button } from '../ui/Button.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';
import { CheckboxField } from '../ui/Field.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { useToast } from '../ui/Toast.jsx';

export const AUTHORIZATION_DOCS = {
  MARKETING: MARKETING_AUTHORIZATION,
  HEALTH_DATA: HEALTH_DATA_AUTHORIZATION,
  COMMUNITY_RULES: COMMUNITY_RULES_ACCEPTANCE,
};

const CHANNEL_LABELS = { email: 'Correo', whatsapp: 'WhatsApp' };

const LONG_DATE = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

const COPY = {
  MARKETING: {
    accept: 'Quiero recibir novedades',
    withdraw: 'Ya no quiero recibirlas',
    confirmWithdraw: 'Dejaremos de enviarte novedades y promociones por todos los canales.',
  },
  HEALTH_DATA: {
    accept: 'Autorizar',
    withdraw: 'Retirar autorización',
    confirmAccept:
      'Los profesionales de salud del club podrán registrar tus citas, notas y planes hasta que la retires.',
    confirmWithdraw:
      'Desde ahora no se podrán agendar citas ni registrar nueva información de salud tuya. Lo ya registrado se conserva como exige la ley.',
  },
  COMMUNITY_RULES: {
    accept: 'Aceptar y continuar',
    withdraw: 'Retirar mi aceptación',
    confirmWithdraw:
      'No podrás publicar ni comentar en la Comunidad hasta que vuelvas a aceptar las reglas.',
  },
};

/** The text of an authorization, as the person accepts it. */
export function AuthorizationText({ doc }) {
  return (
    <div className="space-y-3">
      {doc.sections.flatMap((s) =>
        s.blocks.map((block, i) => <LegalBlock key={`${s.id}-${i}`} block={block} />),
      )}
    </div>
  );
}

function StatusLine({ item }) {
  if (!item.accepted) return <StatusBadge status="suspendida" label="No autorizado" />;
  const since = LONG_DATE.format(new Date(item.acceptedAt));
  const channels = item.channels?.length
    ? ` · por ${item.channels.map((c) => CHANNEL_LABELS[c]).join(' y ')}`
    : '';
  const who = item.givenByGuardian ? 'Lo autorizó tu acudiente el' : 'Desde el';
  // Short badge (it never wraps); the details go on their own line.
  return (
    <div className="space-y-1">
      <StatusBadge status="al-dia" label="Autorizado" />
      <p className="text-body-sm text-ink-soft">
        {who} {since}
        {channels}
      </p>
    </div>
  );
}

/**
 * One optional authorization: its text, where it stands, and the button to
 * give or withdraw it (never pre-accepted). Withdrawing asks first. For a
 * minor, promotions and health data are the guardian's to give.
 *
 * @param {{ item: object, isMinor: boolean, onSaved: (item: object) => void,
 *   showText?: boolean, headingLevel?: 'h2'|'h3' }} props
 */
export function OptionalAuthorization({
  item,
  isMinor,
  onSaved,
  showText = true,
  headingLevel = 'h3',
}) {
  const toast = useToast();
  const doc = AUTHORIZATION_DOCS[item.type];
  const copy = COPY[item.type];
  const [channels, setChannels] = useState({ email: false, whatsapp: false });
  const [declares, setDeclares] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null); // 'accept' | 'withdraw'
  const [saving, setSaving] = useState(false);
  const Heading = headingLevel;
  const guardianGives = isMinor && item.type !== 'COMMUNITY_RULES';

  async function save(accept) {
    setSaving(true);
    try {
      const chosen = Object.keys(channels).filter((c) => channels[c]);
      const saved = await consentClient.setMyAuthorization(item.type, {
        accept,
        ...(item.type === 'MARKETING' && accept ? { channels: chosen } : {}),
      });
      onSaved(saved);
      toast({
        title: accept ? 'Autorización guardada' : 'Autorización retirada',
        tone: 'success',
      });
    } catch (err) {
      toast({
        title: 'No pudimos guardar el cambio',
        description: describeIdentityError(err),
        tone: 'error',
      });
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  function tryAccept() {
    if (item.type === 'MARKETING' && !channels.email && !channels.whatsapp) {
      setError('Elige al menos un canal: correo o WhatsApp.');
      return;
    }
    if (item.type === 'COMMUNITY_RULES' && !declares) {
      setError('Marca la casilla para aceptar las reglas.');
      return;
    }
    setError(null);
    if (copy.confirmAccept) setConfirming('accept');
    else save(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <Heading className="text-lead font-semibold text-ink">{doc.title}</Heading>
        <div className="mt-2">
          <StatusLine item={item} />
        </div>
      </div>
      {showText && <AuthorizationText doc={doc} />}

      {item.accepted ? (
        <Button variant="secondary" onClick={() => setConfirming('withdraw')}>
          {copy.withdraw}
        </Button>
      ) : guardianGives ? (
        <p className="rounded-lg bg-page p-4 text-body text-ink">
          {item.type === 'MARKETING'
            ? 'Las cuentas de menores de edad no reciben promociones.'
            : 'Como eres menor de edad, esta autorización la da tu acudiente desde su perfil («Cuentas vinculadas»).'}
        </p>
      ) : (
        <div className="space-y-3">
          {item.type === 'MARKETING' && (
            <fieldset className="space-y-3">
              <legend className="mb-2 text-body font-semibold text-ink">¿Por dónde?</legend>
              {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                <CheckboxField
                  key={key}
                  checked={channels[key]}
                  onChange={(v) => setChannels((c) => ({ ...c, [key]: v }))}
                >
                  {label}
                </CheckboxField>
              ))}
            </fieldset>
          )}
          {item.type === 'COMMUNITY_RULES' && (
            <CheckboxField checked={declares} onChange={setDeclares}>
              Acepto las reglas. Declaro que solo publicaré fotos o videos de otras personas con su
              permiso y, si aparece un menor de edad, con permiso de su acudiente.
            </CheckboxField>
          )}
          {error && (
            <p role="alert" className="text-body-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <Button onClick={tryAccept} loading={saving && confirming == null}>
            {copy.accept}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming != null}
        tone="primary"
        title={confirming === 'accept' ? `¿${copy.accept}?` : `¿${copy.withdraw}?`}
        description={confirming === 'accept' ? copy.confirmAccept : copy.confirmWithdraw}
        confirmLabel={confirming === 'accept' ? 'Sí, autorizar' : 'Sí, retirar'}
        loading={saving}
        onConfirm={() => save(confirming === 'accept')}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
