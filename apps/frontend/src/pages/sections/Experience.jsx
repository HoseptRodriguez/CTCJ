import { Section } from '../../components/ui/Section.jsx';

const PILLARS = [
  {
    step: 'Entrena',
    title: 'Cada golpe, con propósito',
    copy: 'Cinco programas, uno para cada etapa: desde el primer contacto con la raqueta hasta la construcción técnica que sostiene todo lo demás.',
    href: '#academia',
    linkLabel: 'Ver la academia',
  },
  {
    step: 'Compite',
    title: 'El ranking interno, tu camino',
    copy: 'Singles y dobles, cuatro categorías, dos temporadas al año y un Master al cierre de cada una. Un lugar real donde medir tu progreso.',
    href: '#ranking',
    linkLabel: 'Ver ranking CTCJ',
  },
  {
    step: 'Evoluciona',
    title: 'Del club a la alta competencia',
    copy: 'Para quien busca el máximo nivel: un plan individualizado con seguimiento técnico, físico y psicológico.',
    href: '#academia',
    linkLabel: 'Alto rendimiento',
  },
];

export function Experience() {
  return (
    <Section
      background="sunken"
      heading={{
        eyebrow: 'La experiencia CTCJ',
        title: 'Entrena, compite, evoluciona',
        lede: 'Un mismo camino, pensado para acompañar a cada jugador en la etapa en la que está.',
      }}
    >
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.step} className="rounded-lg bg-canvas p-8 shadow-sm">
            <p className="font-display text-sm font-semibold uppercase tracking-eyebrow text-tertiary">
              {pillar.step}
            </p>
            <h3 className="mt-3 font-display text-xl font-semibold text-primary">{pillar.title}</h3>
            <p className="mt-3 text-secondary">{pillar.copy}</p>
            <a
              href={pillar.href}
              className="mt-5 inline-block font-display text-sm font-semibold uppercase tracking-wide text-success"
            >
              {pillar.linkLabel} →
            </a>
          </div>
        ))}
      </div>
    </Section>
  );
}
