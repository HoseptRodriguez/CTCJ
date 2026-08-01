import { Button } from '../../components/ui/Button.jsx';
import { Section } from '../../components/ui/Section.jsx';

const WHATSAPP_NUMBER = '+57 310 864 6361';
const WHATSAPP_LINK = 'https://wa.me/573108646361';
const ADDRESS =
  'Km 1 vía Fusagasugá – Tibacuy, junto al conjunto Toscana. Primera vía alterna, frente al Colegio Gimnasio Americano.';
const SOCIAL_HANDLE = '@clubdetenisciudadjardin';

export function FinalCta() {
  return (
    <Section
      id="contacto"
      background="inverse"
      heading={{
        eyebrow: 'Contacto',
        title: 'Ven a jugar',
      }}
    >
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <dl className="space-y-6">
          <div>
            <dt className="font-display text-xs font-semibold uppercase tracking-wide text-on-inverse-muted">
              Dónde estamos
            </dt>
            <dd className="mt-1 text-on-inverse">{ADDRESS}</dd>
          </div>
          <div>
            <dt className="font-display text-xs font-semibold uppercase tracking-wide text-on-inverse-muted">
              WhatsApp
            </dt>
            <dd className="mt-1">
              <a href={WHATSAPP_LINK} className="text-green-300 hover:underline">
                {WHATSAPP_NUMBER}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-display text-xs font-semibold uppercase tracking-wide text-on-inverse-muted">
              Redes
            </dt>
            <dd className="mt-1 text-on-inverse">{SOCIAL_HANDLE}</dd>
          </div>
        </dl>

        <div className="rounded-lg bg-canvas p-8">
          <h3 className="font-display text-xl font-semibold text-primary">Reserva tu cancha</h3>
          <p className="mt-2 text-secondary">
            Consulta la disponibilidad real y reserva en línea, o escríbenos por WhatsApp si
            prefieres coordinar directamente.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/canchas" variant="primary">
              Reservar en línea
            </Button>
            <Button href={WHATSAPP_LINK} variant="outline">
              Escribir al club
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
