import { useState } from 'react';

import { notificationsClient } from '../../api/notificationsClient.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAsync } from '../../lib/useAsync.js';

import { SectionCard } from './shared.jsx';

/**
 * Mi CTCJ > Notificaciones. Big switches per category and channel. The
 * service ones come activated; the promotional ones stay off until the
 * person turns them on (that is their authorization, Ley 2300 de 2023).
 * "En el celular (push)" exists but stays hidden until the app has push.
 */
export function NotificationsTab() {
  useDocumentTitle('Notificaciones');
  const toast = useToast();
  const prefs = useAsync(() => notificationsClient.getPreferences(), []);
  const [saving, setSaving] = useState(false);

  async function save(body, message) {
    setSaving(true);
    try {
      const updated = await notificationsClient.updatePreferences(body);
      prefs.setData(() => updated);
      toast({ title: message, tone: 'success' });
    } catch {
      toast({ title: 'No se pudo guardar. Intenta de nuevo.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Elige qué avisos quieres recibir y por dónde. Los cambios se guardan al momento."
      />
      <SectionCard title="Qué me avisan y por dónde" async={prefs}>
        {(p) => {
          const channels = p.channels.filter((c) => c.available);
          const groups = [
            {
              kind: 'SERVICE',
              title: 'Avisos del servicio',
              text: 'Sobre lo que ya tienes con el club. Vienen activados; puedes apagar los que no quieras.',
            },
            {
              kind: 'PROMOTIONAL',
              title: 'Promociones y novedades',
              text: p.promotionalLocked
                ? 'Como eres menor de edad, estas las decide tu acudiente.'
                : 'Solo si las activas. Te escribimos de lunes a viernes de 7:00 a. m. a 7:00 p. m. y los sábados de 8:00 a. m. a 3:00 p. m., nunca domingos ni festivos.',
            },
          ];
          return (
            <div className="space-y-8">
              {groups.map((g) => (
                <section key={g.kind} aria-labelledby={`grupo-${g.kind}`} className="space-y-4">
                  <div>
                    <h3 id={`grupo-${g.kind}`} className="font-display text-h3 font-bold text-ink">
                      {g.title}
                    </h3>
                    <p className="text-body text-ink-soft">{g.text}</p>
                  </div>
                  <ul className="space-y-4">
                    {p.categories
                      .filter((c) => c.kind === g.kind)
                      .map((c) => (
                        <li key={c.id} className="rounded-xl border border-line p-4">
                          <p id={`cat-${c.id}`} className="text-lead font-semibold text-ink">
                            {c.label}
                          </p>
                          <p className="text-body text-ink-soft">{c.description}</p>
                          <div className="mt-3 space-y-2">
                            {channels.map((ch) => (
                              <Switch
                                key={ch.id}
                                label={ch.label}
                                groupLabelId={`cat-${c.id}`}
                                checked={c.channels[ch.id]}
                                disabled={
                                  saving || (g.kind === 'PROMOTIONAL' && p.promotionalLocked)
                                }
                                onChange={(next) =>
                                  save(
                                    { categories: { [c.id]: { [ch.id]: next } } },
                                    next ? 'Aviso activado' : 'Aviso desactivado',
                                  )
                                }
                              />
                            ))}
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
              <section aria-labelledby="grupo-resumen" className="space-y-3">
                <h3 id="grupo-resumen" className="font-display text-h3 font-bold text-ink">
                  Correo
                </h3>
                <Switch
                  label="Resumen diario"
                  description="Un solo correo al día con todo, en vez de un correo por cada aviso."
                  checked={p.dailyDigest}
                  disabled={saving}
                  onChange={(next) =>
                    save(
                      { dailyDigest: next },
                      next ? 'Recibirás un resumen al día' : 'Recibirás cada aviso por separado',
                    )
                  }
                />
              </section>
              <p className="text-body text-ink-soft">
                Los avisos de tus reservas, facturas y membresía siempre te llegan. Si eres menor de
                edad, los correos le llegan a tu acudiente.
              </p>
            </div>
          );
        }}
      </SectionCard>
    </div>
  );
}
