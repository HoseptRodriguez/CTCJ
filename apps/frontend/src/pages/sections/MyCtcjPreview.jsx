import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Section } from '../../components/ui/Section.jsx';

const FEATURES = [
  { name: 'Reservar y gestionar tus canchas', available: true },
  { name: 'Ver tus próximas reservas', available: true },
  { name: 'Historial de partidos y estadísticas', available: false },
  { name: 'Pagos y estado de cuenta', available: false },
];

export function MyCtcjPreview() {
  return (
    <Section
      background="canvas"
      heading={{
        eyebrow: 'Mi CTCJ',
        title: 'Tu plataforma dentro del club',
        lede: 'Una sola cuenta para reservar tu cancha y, poco a poco, ver todo lo demás de tu paso por el club.',
      }}
    >
      <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-center">
        <ul className="space-y-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.name}
              className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 px-5 py-4"
            >
              <span className="text-primary">{feature.name}</span>
              {feature.available ? (
                <span className="font-display text-xs font-semibold uppercase tracking-wide text-success">
                  Disponible
                </span>
              ) : (
                <Badge />
              )}
            </li>
          ))}
        </ul>
        <div className="rounded-lg bg-inverse p-8 text-center">
          <p className="text-on-inverse-muted">Ingresa con tu cuenta para ver tu panel.</p>
          <Button to="/mi-ctcj" variant="primary" className="mt-4">
            Ir a Mi CTCJ
          </Button>
        </div>
      </div>
    </Section>
  );
}
