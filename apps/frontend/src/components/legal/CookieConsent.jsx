import { COOKIES_POLICY } from '@ctcj/shared';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';

import { consentClient } from '../../api/consentClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  COOKIE_CONSENT_EVENT,
  markCookieConsentRecorded,
  readCookieConsent,
  saveCookieConsent,
} from '../../lib/cookieConsent.js';
import { OPEN_COOKIE_SETTINGS_EVENT } from '../../lib/cookieSettingsEvent.js';
import { SlidePanel } from '../motion/SlidePanel.jsx';
import { Button } from '../ui/Button.jsx';

function CategoryOption({ id, title, description, checked, disabled, onChange, note }) {
  const descriptionId = `${id}-descripcion`;
  // The whole card is the label: a big target, not just the 24px box.
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-lg border-2 border-line p-4 has-[:focus-visible]:shadow-focus ${disabled ? '' : 'cursor-pointer'}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-describedby={descriptionId}
        className="mt-1 h-6 w-6 shrink-0 accent-navy-500"
      />
      <span>
        <span className="block text-lead font-bold text-ink">{title}</span>
        <span id={descriptionId} className="mt-1 block text-body text-ink-soft">
          {description}
          {note && <span className="mt-1 block font-semibold text-ink">{note}</span>}
        </span>
      </span>
    </label>
  );
}

function SettingsPanel({ open, decision, onClose, onSave }) {
  const [preferences, setPreferences] = useState(decision?.preferences ?? false);
  const idBase = useId();
  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Configurar cookies"
      footer={
        <Button size="lg" fullWidth onClick={() => onSave({ preferences, analytics: false })}>
          Guardar mi elección
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-body text-ink">
          Elige qué podemos guardar en tu navegador. Puedes cambiarlo cuando quieras desde
          &quot;Configurar cookies&quot;, en el pie de página.
        </p>
        <CategoryOption
          id={`${idBase}-necesarias`}
          title="Necesarias"
          description="Mantienen tu sesión segura y recuerdan esta decisión. Sin ellas el sitio no funciona."
          checked
          disabled
          note="Siempre activas."
        />
        <CategoryOption
          id={`${idBase}-preferencias`}
          title="Preferencias"
          description='Recuerdan si elegiste "Letra grande" para la próxima visita.'
          checked={preferences}
          onChange={setPreferences}
        />
        <CategoryOption
          id={`${idBase}-analitica`}
          title="Analítica"
          description="Medir cómo se usa el sitio."
          checked={false}
          disabled
          note="Hoy no usamos ninguna."
        />
        <p className="text-body text-ink">
          Detalle de cada una en la{' '}
          <Link
            to="/cookies"
            onClick={onClose}
            className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
          >
            Política de cookies
          </Link>
          .
        </p>
      </div>
    </SlidePanel>
  );
}

/**
 * Cookie consent: a banner on the first visit (it doesn't block the page),
 * three equally weighted choices, and a settings panel that "Configurar
 * cookies" (footer, /cookies) opens at any time. The decision is stored with
 * its date and the policy version -- a new policy version asks again -- and,
 * for signed-in people, recorded as proof in the consents table.
 */
export function CookieConsent() {
  const { status, user } = useAuth();
  const [decision, setDecision] = useState(readCookieConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    const changed = () => setDecision(readCookieConsent());
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    window.addEventListener(COOKIE_CONSENT_EVENT, changed);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
      window.removeEventListener(COOKIE_CONSENT_EVENT, changed);
    };
  }, []);

  // Proof for signed-in people: once per decision and per user.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (status !== 'authenticated' || !userId || !decision || decision.recordedFor === userId) {
      return;
    }
    let cancelled = false;
    Promise.resolve()
      .then(() =>
        consentClient.recordCookieConsent({
          preferences: decision.preferences,
          analytics: decision.analytics,
          policyVersion: decision.version,
        }),
      )
      .then(() => {
        if (cancelled) return;
        markCookieConsentRecorded(userId);
        setDecision(readCookieConsent());
      })
      .catch(() => {}); // retried on the next visit; the choice itself already applies
    return () => {
      cancelled = true;
    };
  }, [status, userId, decision]);

  function choose(choice) {
    setDecision(saveCookieConsent(choice));
    setSettingsOpen(false);
  }

  return (
    <>
      {!decision && !settingsOpen && (
        <section
          aria-labelledby={titleId}
          className="fixed inset-x-0 bottom-0 z-toast border-t-2 border-navy-500 bg-surface shadow-lg"
        >
          <div className="mx-auto max-w-container px-4 py-4 md:px-8 md:py-5">
            <h2 id={titleId} className="font-display text-h3 font-bold text-ink">
              Cookies en este sitio
            </h2>
            <p className="mt-1 max-w-prose text-body text-ink">
              Usamos las necesarias para que el sitio funcione. Con tu permiso, también recordamos
              tus preferencias, como &quot;Letra grande&quot;. No usamos publicidad ni seguimiento.{' '}
              <Link
                to={COOKIES_POLICY.path}
                className="focus-ring rounded font-semibold text-navy-500 underline underline-offset-4"
              >
                Política de cookies
              </Link>
            </p>
            {/* Three choices with the same size and visual weight. */}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => choose({ preferences: true, analytics: false })}
              >
                Aceptar todas
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => choose({ preferences: false, analytics: false })}
              >
                Solo necesarias
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setSettingsOpen(true)}>
                Configurar
              </Button>
            </div>
          </div>
        </section>
      )}
      <SettingsPanel
        key={settingsOpen ? `open-${decision?.decidedAt ?? 'new'}` : 'closed'}
        open={settingsOpen}
        decision={decision}
        onClose={() => setSettingsOpen(false)}
        onSave={choose}
      />
    </>
  );
}
