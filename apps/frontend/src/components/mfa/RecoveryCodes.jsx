import { useState } from 'react';

import { Button } from '../ui/Button.jsx';
import { CheckboxField } from '../ui/Field.jsx';

/**
 * The 10 recovery codes, shown ONCE. The person copies, downloads or prints
 * them and confirms before going on.
 */
export function RecoveryCodes({ codes, onDone, doneLabel = 'Continuar' }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const text = [
    'Códigos de recuperación — Club de Tenis Ciudad Jardín',
    'Cada código sirve una sola vez, si no tienes el teléfono a mano.',
    '',
    ...codes,
  ].join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codigos-de-recuperacion-ctcj.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function finish() {
    if (!saved) {
      setError('Marca la casilla cuando hayas guardado los códigos.');
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-5">
      <div
        role="status"
        className="rounded-lg border-2 border-amber bg-amber-soft p-4 text-body text-ink"
      >
        <p className="font-semibold">Guarda estos códigos ahora: no los volverás a ver.</p>
        <p className="mt-1">
          Si pierdes o cambias el teléfono, cada código te deja entrar una vez. Guárdalos en un
          lugar seguro, fuera del teléfono (impresos o en tu gestor de contraseñas).
        </p>
      </div>
      <ol
        aria-label="Códigos de recuperación"
        className="grid grid-cols-2 gap-3 rounded-lg bg-page p-4 font-mono text-lead font-bold text-ink sm:grid-cols-2"
      >
        {codes.map((c) => (
          <li key={c} className="tracking-wider">
            {c}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={copy}>
          {copied ? 'Copiados' : 'Copiar'}
        </Button>
        <Button variant="secondary" onClick={download}>
          Descargar (.txt)
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      <CheckboxField
        checked={saved}
        onChange={(v) => {
          setSaved(v);
          if (v) setError(null);
        }}
        error={error}
      >
        Ya guardé mis códigos de recuperación en un lugar seguro.
      </CheckboxField>
      <Button size="lg" onClick={finish}>
        {doneLabel}
      </Button>
    </div>
  );
}
