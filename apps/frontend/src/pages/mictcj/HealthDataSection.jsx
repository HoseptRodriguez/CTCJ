import { consentClient } from '../../api/consentClient.js';
import { OptionalAuthorization } from '../../components/legal/OptionalAuthorization.jsx';
import { useAsync } from '../../lib/useAsync.js';

import { SectionCard } from './shared.jsx';

/**
 * Mi perfil → "Mis datos de salud": the explicit, optional authorization
 * (Ley 1581 de 2012, art. 6) without which psychology, neuropsychology and
 * physiotherapy can't record anything about the player. Sits right above
 * the administration's access to the physiotherapy notes.
 */
export function HealthDataSection() {
  const authorizations = useAsync(() => consentClient.getMyAuthorizations(), []);

  return (
    <SectionCard
      title="Mis datos de salud"
      description="Opcional. Solo si quieres atención de psicología, neuropsicología o fisioterapia en el club."
      async={authorizations}
      errorTitle="No pudimos cargar tu autorización"
    >
      {(a) => {
        const item = a.items.find((i) => i.type === 'HEALTH_DATA');
        return (
          <OptionalAuthorization
            item={item}
            isMinor={a.isMinor}
            onSaved={(saved) =>
              authorizations.setData((d) => ({
                ...d,
                items: d.items.map((i) => (i.type === saved.type ? saved : i)),
              }))
            }
          />
        );
      }}
    </SectionCard>
  );
}
