import { useState } from 'react';

import { mfaClient } from '../../api/mfaClient.js';
import { MfaCodeField } from '../../components/mfa/MfaCodeField.jsx';
import { MfaSetupSteps } from '../../components/mfa/MfaSetupSteps.jsx';
import { RecoveryCodes } from '../../components/mfa/RecoveryCodes.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';

import { DATE_MEDIUM, SectionCard } from './shared.jsx';

/** Asks for a current code before a sensitive change (turn off, new recovery codes). */
function CodeGate({ title, action, onSubmit, onCancel }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (code.length !== 6) {
      setError('Escribe los 6 números que muestra la aplicación.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(code);
    } catch (err) {
      setError(describeIdentityError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-lg bg-page p-4">
      <p className="text-body font-semibold text-ink">{title}</p>
      <MfaCodeField value={code} onChange={setCode} error={error} autoFocus />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} loadingText="Comprobando…">
          {action}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * Mi perfil → "Verificación en dos pasos": turn it on (optional roles; the
 * required ones turn it on when they sign in), turn it off, or get new
 * recovery codes. Sensitive changes ask for a current code.
 */
export function TwoStepSection() {
  const toast = useToast();
  const status = useAsync(() => mfaClient.getStatus(), []);
  const [mode, setMode] = useState(null); // 'setup' | 'disable' | 'codes'
  const [newCodes, setNewCodes] = useState(null);

  return (
    <SectionCard
      title="Verificación en dos pasos"
      description="Además de la contraseña, un código de 6 números que genera tu teléfono. Si alguien descubre tu contraseña, igual no puede entrar."
      async={status}
    >
      {(s) => {
        if (newCodes) {
          return (
            <RecoveryCodes
              codes={newCodes}
              doneLabel="Listo"
              onDone={() => {
                setNewCodes(null);
                status.reload();
              }}
            />
          );
        }
        if (mode === 'setup') {
          return (
            <MfaSetupSteps
              headingLevel="h3"
              start={() => mfaClient.startSetup()}
              confirm={(code) => mfaClient.confirmSetup(code)}
              finishLabel="Listo"
              onFinished={() => {
                setMode(null);
                toast({ title: 'Verificación en dos pasos activada', tone: 'success' });
                status.reload();
              }}
            />
          );
        }
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={s.enabled ? 'al-dia' : 'suspendida'}
                label={s.enabled ? 'Activada' : 'Desactivada'}
              />
              {s.enabled && s.enabledAt && (
                <span className="text-body-sm text-ink-soft">
                  Desde el {DATE_MEDIUM.format(new Date(s.enabledAt))}
                </span>
              )}
            </div>
            {s.required && (
              <p className="text-body text-ink">
                Por tu rol en el club es obligatoria: no se puede desactivar.
              </p>
            )}
            {s.enabled && (
              <p className="text-body text-ink">
                Te quedan <strong>{s.recoveryCodesLeft}</strong> códigos de recuperación.
                {s.recoveryCodesLeft <= 3 && ' Pide unos nuevos antes de que se acaben.'}
              </p>
            )}
            {mode === 'disable' && (
              <CodeGate
                title="Para desactivarla, escribe el código de la aplicación."
                action="Desactivar"
                onCancel={() => setMode(null)}
                onSubmit={async (code) => {
                  await mfaClient.disable(code);
                  setMode(null);
                  toast({ title: 'Verificación en dos pasos desactivada', tone: 'success' });
                  status.reload();
                }}
              />
            )}
            {mode === 'codes' && (
              <CodeGate
                title="Los códigos anteriores dejarán de servir. Escribe el código de la aplicación."
                action="Crear códigos nuevos"
                onCancel={() => setMode(null)}
                onSubmit={async (code) => {
                  const r = await mfaClient.regenerateRecoveryCodes(code);
                  setMode(null);
                  setNewCodes(r.recoveryCodes);
                }}
              />
            )}
            {!mode && (
              <div className="flex flex-wrap gap-3">
                {!s.enabled && <Button onClick={() => setMode('setup')}>Activar</Button>}
                {s.enabled && (
                  <Button variant="secondary" onClick={() => setMode('codes')}>
                    Crear códigos de recuperación nuevos
                  </Button>
                )}
                {s.enabled && !s.required && (
                  <Button variant="secondary" onClick={() => setMode('disable')}>
                    Desactivar
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      }}
    </SectionCard>
  );
}
