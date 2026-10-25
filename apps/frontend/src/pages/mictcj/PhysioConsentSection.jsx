import { useState } from 'react';

import { clinicalClient } from '../../api/clinicalClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeClinicalError } from '../../lib/clinicalErrorMessages.js';
import { useAsync } from '../../lib/useAsync.js';

import { SectionCard } from './shared.jsx';

const LONG_DATE = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Bogota',
});
const when = (iso) => LONG_DATE.format(new Date(iso));

/**
 * Mi perfil → "Autorizo a la administración del club a ver mis notas de
 * fisioterapia". Off unless the player turns it on; they can withdraw it at
 * any time and it takes effect immediately. The club keeps both dates.
 */
export function PhysioConsentSection() {
  const toast = useToast();
  const consent = useAsync(() => clinicalClient.getMyPhysioConsent(), []);
  const [confirming, setConfirming] = useState(null); // 'grant' | 'revoke'
  const [saving, setSaving] = useState(false);

  async function apply() {
    setSaving(true);
    try {
      const result =
        confirming === 'grant'
          ? await clinicalClient.grantMyPhysioConsent()
          : await clinicalClient.revokeMyPhysioConsent();
      consent.setData(() => result);
      toast({
        title: result.authorized ? 'Autorización guardada' : 'Autorización retirada',
        tone: 'success',
      });
    } catch (err) {
      toast({
        title: 'No pudimos guardar el cambio',
        description: describeClinicalError(err),
        tone: 'error',
      });
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  }

  return (
    <SectionCard
      title="Mis notas de fisioterapia"
      description="Tú decides si la administración del club puede leerlas."
      async={consent}
      errorTitle="No pudimos cargar tu autorización"
    >
      {(c) => (
        <div className="space-y-4">
          <div className="rounded-lg bg-page p-4">
            <p className="text-lead font-semibold text-ink">
              Autorizo a la administración del club a ver mis notas de fisioterapia
            </p>
            <div className="mt-3">
              {c.authorized ? (
                <StatusBadge status="al-dia" label={`Autorizado desde el ${when(c.grantedAt)}`} />
              ) : (
                <StatusBadge
                  status="suspendida"
                  label={
                    c.revokedAt
                      ? `No autorizado (retirada el ${when(c.revokedAt)})`
                      : 'No autorizado'
                  }
                />
              )}
            </div>
          </div>
          <p className="text-body text-ink-soft">
            Aunque no autorices, la administración ve tus citas, tu asistencia y si el
            fisioterapeuta te marcó apto o no apto para jugar, nunca tu diagnóstico. Tus notas de
            psicología nunca las ve. Cada vez que alguien lee tus notas queda registrado.
          </p>
          {c.authorized ? (
            <Button variant="secondary" onClick={() => setConfirming('revoke')}>
              Retirar autorización
            </Button>
          ) : (
            <Button onClick={() => setConfirming('grant')}>Autorizar</Button>
          )}
          <ConfirmDialog
            open={confirming != null}
            tone="primary"
            title={
              confirming === 'grant'
                ? '¿Autorizar a la administración?'
                : '¿Retirar la autorización?'
            }
            description={
              confirming === 'grant'
                ? 'La administración del club podrá leer tus notas de fisioterapia hasta que retires la autorización.'
                : 'Desde ahora la administración ya no podrá leer tus notas de fisioterapia.'
            }
            confirmLabel={confirming === 'grant' ? 'Sí, autorizar' : 'Sí, retirar'}
            loading={saving}
            onConfirm={apply}
            onCancel={() => setConfirming(null)}
          />
        </div>
      )}
    </SectionCard>
  );
}
