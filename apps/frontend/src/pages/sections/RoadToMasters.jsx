import { Badge } from '../../components/ui/Badge.jsx';
import { Section } from '../../components/ui/Section.jsx';

// Re-sequences the same real Academy programs as an age-ordered pathway --
// no invented milestones, tournament names, or dates.
const STEPS = [
  {
    age: '3 a 6 años',
    title: 'Mini Tenis',
    copy: 'Primer contacto con la raqueta a través del juego.',
  },
  {
    age: '7 a 12 años',
    title: 'Iniciación',
    copy: 'Fundamentos técnicos: derecha, revés y saque.',
  },
  {
    age: 'Por nivel',
    title: 'Competencia',
    copy: 'Entrenamiento orientado al torneo y al ranking interno.',
  },
  {
    age: 'Selección',
    title: 'Alto Rendimiento',
    copy: 'Plan individualizado con seguimiento técnico, físico y psicológico.',
  },
];

export function RoadToMasters() {
  return (
    <Section
      background="canvas"
      heading={{
        eyebrow: 'El camino del jugador',
        title: 'De Mini Tenis a Alto Rendimiento',
        lede: 'El mismo programa de la academia, visto como una progresión: cada etapa construye sobre la anterior.',
      }}
    >
      <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative rounded-lg border border-neutral-200 p-6">
            <div className="font-display text-sm font-semibold text-tertiary">Etapa {i + 1}</div>
            <h3 className="mt-2 font-display text-lg font-semibold text-primary">{step.title}</h3>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-success">
              {step.age}
            </div>
            <p className="mt-3 text-sm text-secondary">{step.copy}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <Badge>Próximamente: seguimiento del camino a tu Master en Mi CTCJ</Badge>
      </div>
    </Section>
  );
}
