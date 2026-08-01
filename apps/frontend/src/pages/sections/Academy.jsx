import { Section } from '../../components/ui/Section.jsx';

const PROGRAMS = [
  {
    idx: '01',
    title: 'Mini Tenis',
    age: '3 a 6 años',
    copy: 'Primer contacto con la raqueta a través del juego. Coordinación, equilibrio y amor por el deporte desde la cancha adaptada.',
  },
  {
    idx: '02',
    title: 'Iniciación',
    age: '7 a 12 años',
    copy: 'Fundamentos técnicos: derecha, revés y saque. Se construye la base sobre la que crecerá todo lo demás.',
  },
  {
    idx: '03',
    title: 'Recreación',
    age: 'Todas las edades',
    copy: 'Para quienes juegan por disfrute y salud. Tenis a tu ritmo, en un ambiente familiar y sin presión competitiva.',
  },
  {
    idx: '04',
    title: 'Competencia',
    age: 'Por nivel',
    copy: 'Entrenamiento orientado al torneo. Táctica, físico y mentalidad para competir en el ranking interno y fuera del club.',
  },
  {
    idx: '05',
    title: 'Alto Rendimiento',
    age: 'Selección',
    copy: 'Plan individualizado para el jugador que busca competir al máximo nivel. Seguimiento técnico, físico y psicológico.',
  },
];

export function Academy() {
  return (
    <Section
      id="academia"
      background="canvas"
      heading={{
        eyebrow: 'La academia',
        title: 'Un programa para cada etapa',
        lede: 'Adaptamos el entrenamiento a la edad y el objetivo de cada jugador, ya sea dar los primeros golpes, competir o llegar al alto rendimiento.',
      }}
    >
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROGRAMS.map((program) => (
          <article key={program.idx} className="rounded-lg border border-neutral-200 p-6">
            <div className="font-display text-3xl font-semibold text-neutral-300">
              {program.idx}
            </div>
            <h3 className="mt-3 font-display text-xl font-semibold text-primary">
              {program.title}
            </h3>
            <div className="mt-1 text-sm font-semibold text-success">{program.age}</div>
            <p className="mt-3 text-secondary">{program.copy}</p>
            <a
              href="#contacto"
              className="mt-4 inline-block font-display text-sm font-semibold uppercase tracking-wide text-primary"
            >
              Más información →
            </a>
          </article>
        ))}

        <article className="rounded-lg bg-inverse p-6">
          <div className="font-display text-3xl font-semibold text-green-300">—</div>
          <h3 className="mt-3 font-display text-xl font-semibold text-on-inverse">
            ¿No sabes por dónde empezar?
          </h3>
          <div className="mt-1 text-sm font-semibold text-on-inverse-muted">Te orientamos</div>
          <p className="mt-3 text-on-inverse-muted">
            Escríbenos y te ayudamos a elegir el programa según la edad, el nivel y los objetivos de
            cada jugador.
          </p>
          <a
            href="#contacto"
            className="mt-4 inline-block font-display text-sm font-semibold uppercase tracking-wide text-green-300"
          >
            Hablar con el club →
          </a>
        </article>
      </div>
    </Section>
  );
}
