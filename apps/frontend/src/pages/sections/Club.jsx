import { Section } from '../../components/ui/Section.jsx';

const VALUES = ['Disciplina y perseverancia', 'Integridad y juego limpio', 'Pasión'];

export function Club() {
  return (
    <Section
      id="club"
      background="canvas"
      heading={{
        eyebrow: 'Nuestra historia',
        title: 'Un sueño familiar que se volvió referente',
      }}
    >
      <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-lg leading-relaxed text-secondary">
            Hace más de diez años, un sueño familiar en Yopal dio inicio a un proyecto que hoy es
            referente en la región. Nos trasladamos a Fusagasugá y encontramos en las canchas del
            antiguo Cercun tres espacios para seguir creciendo.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-secondary">
            Desde entonces nos dedicamos a la masificación del tenis en las escuelas, compartiendo
            lo que aprendimos como jugadores y entrenadores. No solo formamos campeones: cultivamos
            el amor por el tenis, la disciplina y el trabajo en equipo.
          </p>
          <div className="mt-6 border-l-2 border-action pl-4">
            <p className="font-display text-lg font-semibold text-primary">Orlando Rodríguez</p>
            <p className="text-sm text-tertiary">Fundador y director</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg">
          <img
            src="/img/accion-desplazamiento-700.jpg"
            alt="Jugador desplazándose sobre la cancha de arcilla del club"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-4 left-4 rounded-full bg-canvas px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-primary shadow-md">
            Formación integral
          </span>
        </div>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-raised p-6">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
            Misión
          </h3>
          <p className="mt-3 text-secondary">
            Formación de tenis de calidad con entrenadores experimentados, infraestructura adecuada
            y enfoque en disciplina, esfuerzo y trabajo en equipo.
          </p>
        </div>
        <div className="rounded-lg bg-raised p-6">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
            Visión
          </h3>
          <p className="mt-3 text-secondary">
            Ser el referente principal en la formación de tenistas de la región.
          </p>
        </div>
        <div className="rounded-lg bg-raised p-6">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-tertiary">
            Valores
          </h3>
          <ul className="mt-3 space-y-1.5 text-secondary">
            {VALUES.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
