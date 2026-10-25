import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { notificationsClient } from '../api/notificationsClient.js';
import { AnimatedCheck } from '../components/motion/AnimatedCheck.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

/**
 * /notificaciones/baja?t=... -- the link "Dejar de recibir estos correos".
 * One click from the email and it's done: no login, no extra button. The
 * signed link says who and which kind of email.
 */
export function UnsubscribePage() {
  useDocumentTitle('Dejar de recibir correos');
  const [params] = useSearchParams();
  const token = params.get('t');
  const [state, setState] = useState(token ? 'working' : 'invalid');
  const [label, setLabel] = useState(null);
  const ran = useRef(false);
  const headingRef = useRef(null);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    notificationsClient
      .unsubscribe(token)
      .then((r) => {
        setLabel(r.label ?? null);
        setState('done');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  useEffect(() => {
    if (state !== 'working') headingRef.current?.focus();
  }, [state]);

  return (
    <section aria-labelledby="baja-titulo" className="bg-page">
      <div className="mx-auto max-w-xl px-4 py-16 text-center md:px-8">
        {state === 'working' && (
          <p role="status" className="text-lead text-ink">
            Procesando…
          </p>
        )}
        {state === 'done' && (
          <>
            <AnimatedCheck label="Listo" size={72} className="mx-auto" />
            <h1
              id="baja-titulo"
              ref={headingRef}
              tabIndex={-1}
              className="mt-4 font-display text-h2 font-bold text-ink outline-none"
            >
              Listo, ya no te enviaremos esos correos
            </h1>
            <p className="mt-3 text-lead text-ink" role="status">
              {label
                ? `Dejaste de recibir por correo: "${label}".`
                : 'Tu preferencia quedó guardada.'}{' '}
              Puedes volver a activarlos cuando quieras.
            </p>
          </>
        )}
        {state === 'invalid' && (
          <>
            <h1
              id="baja-titulo"
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-h2 font-bold text-ink outline-none"
            >
              No pudimos usar este enlace
            </h1>
            <p className="mt-3 text-lead text-ink">
              Puede estar incompleto. Entra a Mi CTCJ y apaga los avisos que no quieras.
            </p>
          </>
        )}
        {state !== 'working' && (
          <Button to="/mi-ctcj/notificaciones" size="lg" className="mt-8">
            Cambiar mis notificaciones
          </Button>
        )}
      </div>
    </section>
  );
}
