import { useEffect, useRef, useState } from 'react';

import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { Button } from '../ui/Button.jsx';

import { MfaCodeField } from './MfaCodeField.jsx';
import { RecoveryCodes } from './RecoveryCodes.jsx';

/** A QR code (SVG text from the server) as an image with its description. */
function QrImage({ svg, accountName }) {
  const src = `data:image/svg+xml;base64,${window.btoa(svg)}`;
  return (
    <img
      src={src}
      alt={`Código QR para agregar la cuenta ${accountName} en la aplicación de autenticación`}
      className="h-56 w-56 rounded-lg border-2 border-line bg-white p-2"
    />
  );
}

/**
 * Turning on two-step verification, one step at a time, in plain words for
 * people who have never done it:
 *   1. install the app, 2. scan the QR (or type the key),
 *   3. type the code the app shows, 4. save the recovery codes.
 * `start` and `confirm` come from the caller (sign-in or profile).
 *
 * @param {{ start: () => Promise<{ qrSvg: string, manualKey: string, accountName: string }>,
 *   confirm: (code: string) => Promise<{ recoveryCodes: string[] }>,
 *   onFinished: (result: object) => void, finishLabel?: string, headingLevel?: 'h2'|'h3' }} props
 */
export function MfaSetupSteps({ start, confirm, onFinished, finishLabel, headingLevel = 'h2' }) {
  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const headingRef = useRef(null);
  const Heading = headingLevel;

  // Each new step: move focus to its title so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  async function goToQr() {
    setBusy(true);
    setError(null);
    try {
      setSetup(await start());
      setStep(2);
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setBusy(false);
    }
  }

  async function check(event) {
    event.preventDefault();
    if (code.length !== 6) {
      setError('Escribe los 6 números que muestra la aplicación.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await confirm(code);
      setResult(r);
      setStep(4);
    } catch (err) {
      setError(describeIdentityError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  const title = (text) => (
    <Heading
      ref={headingRef}
      tabIndex={-1}
      className="font-display text-h3 font-bold text-ink outline-none"
    >
      Paso {step} de 4: {text}
    </Heading>
  );

  return (
    <div className="space-y-5">
      {step === 1 && (
        <>
          {title('Instala una aplicación de autenticación')}
          <p className="text-body text-ink">
            En tu teléfono, abre la tienda de aplicaciones (Play Store o App Store) e instala una de
            estas, gratis: <strong>Google Authenticator</strong> o{' '}
            <strong>Microsoft Authenticator</strong>. Si ya tienes una, sigue.
          </p>
          {error && (
            <p role="alert" className="text-body font-semibold text-danger">
              {error}
            </p>
          )}
          <Button size="lg" onClick={goToQr} loading={busy} loadingText="Preparando…">
            Ya tengo la aplicación
          </Button>
        </>
      )}

      {step === 2 && setup && (
        <>
          {title('Escanea el código QR')}
          <ol className="list-decimal space-y-2 pl-6 text-body text-ink">
            <li>Abre la aplicación y toca el botón «+» o «Agregar cuenta».</li>
            <li>Elige «Escanear un código QR» y apunta la cámara a este código.</li>
          </ol>
          <QrImage svg={setup.qrSvg} accountName={setup.accountName} />
          <details className="rounded-lg bg-page p-4">
            <summary className="focus-ring cursor-pointer rounded text-body font-semibold text-navy-500">
              ¿No puedes escanear? Escribe esta clave
            </summary>
            <p className="mt-2 text-body text-ink">
              En la aplicación elige «Ingresar una clave de configuración» y escribe:
            </p>
            <p className="mt-2 break-all font-mono text-lead font-bold tracking-wider text-ink">
              {setup.manualKey}
            </p>
          </details>
          <Button size="lg" onClick={() => setStep(3)}>
            Ya lo escaneé
          </Button>
        </>
      )}

      {step === 3 && (
        <form onSubmit={check} noValidate className="space-y-5">
          {title('Escribe el código de la aplicación')}
          <p className="text-body text-ink">
            La aplicación ahora muestra un código de 6 números para «Club de Tenis Ciudad Jardín»
            que cambia cada 30 segundos. Escríbelo aquí.
          </p>
          <MfaCodeField value={code} onChange={setCode} error={error} autoFocus />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" loading={busy} loadingText="Comprobando…">
              Activar
            </Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              Volver al código QR
            </Button>
          </div>
        </form>
      )}

      {step === 4 && result && (
        <>
          {title('Guarda tus códigos de recuperación')}
          <RecoveryCodes
            codes={result.recoveryCodes}
            onDone={() => onFinished(result)}
            doneLabel={finishLabel}
          />
        </>
      )}
    </div>
  );
}
