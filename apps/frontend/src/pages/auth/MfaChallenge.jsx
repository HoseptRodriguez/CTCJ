import { useState } from 'react';

import { authClient } from '../../api/authClient.js';
import { MfaCodeField } from '../../components/mfa/MfaCodeField.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';

/**
 * Second step of the sign-in: the 6-digit code of the app, or one of the
 * recovery codes when the phone isn't at hand.
 *
 * @param {{ mfaToken: string, onSession: (session: object) => void, onCancel: () => void }} props
 */
export function MfaChallenge({ mfaToken, onSession, onCancel }) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!useRecovery && code.length !== 6) {
      setError('Escribe los 6 números que muestra la aplicación.');
      return;
    }
    if (useRecovery && recoveryCode.replace(/[^A-Za-z0-9]/g, '').length !== 8) {
      setError('El código de recuperación tiene 8 letras y números, por ejemplo K7QH-3MZP.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await authClient.mfaVerify(
        useRecovery ? { mfaToken, recoveryCode: recoveryCode.trim() } : { mfaToken, code },
      );
      onSession(session);
    } catch (err) {
      setError(describeIdentityError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <h2 className="font-display text-h3 font-bold text-ink">Verificación en dos pasos</h2>
        <p className="mt-2 text-body text-ink">
          {useRecovery
            ? 'Escribe uno de los códigos de recuperación que guardaste. Cada uno sirve una sola vez.'
            : 'Abre la aplicación de autenticación de tu teléfono y escribe el código de 6 números de «Club de Tenis Ciudad Jardín».'}
        </p>
      </div>
      {useRecovery ? (
        <TextField
          label="Código de recuperación"
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          error={error}
          className="font-mono text-lead tracking-wider"
        />
      ) : (
        <MfaCodeField value={code} onChange={setCode} error={error} autoFocus />
      )}
      <Button type="submit" size="lg" fullWidth loading={busy} loadingText="Comprobando…">
        Entrar
      </Button>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setError(null);
          }}
          className="focus-ring inline-flex min-h-btn items-center rounded font-semibold text-navy-500 underline underline-offset-4"
        >
          {useRecovery ? 'Usar el código de la aplicación' : 'Usar un código de recuperación'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring inline-flex min-h-btn items-center rounded font-semibold text-navy-500 underline underline-offset-4"
        >
          Volver a escribir el correo y la contraseña
        </button>
      </div>
      <p className="text-body-sm text-ink-soft">
        ¿Perdiste el teléfono y los códigos? Pide en la administración del club que restablezcan tu
        verificación en dos pasos.
      </p>
    </form>
  );
}
