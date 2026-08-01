import { Section } from '../../components/ui/Section.jsx';

export function Coaches() {
  return (
    <Section
      background="raised"
      heading={{
        eyebrow: 'Nuestro equipo',
        title: 'Formación con nombre propio',
        lede: 'El club lleva el nombre de quien lo fundó y lo sigue dirigiendo desde la cancha.',
      }}
    >
      <div className="mt-10 flex flex-col items-start gap-8 rounded-lg bg-canvas p-8 shadow-sm sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-navy-500 font-display text-3xl font-semibold text-on-inverse">
          OR
        </div>
        <div>
          <h3 className="font-display text-2xl font-semibold text-primary">Orlando Rodríguez</h3>
          <p className="mt-1 font-display text-sm font-semibold uppercase tracking-wide text-success">
            Fundador y director
          </p>
          <p className="mt-4 max-w-2xl text-secondary">
            Impulsó el proyecto familiar que nació en Yopal y hoy dirige la Academia Orlando
            Rodríguez en Fusagasugá, dedicada a la masificación del tenis en las escuelas de la
            región. Más de una década formando jugadores con foco en la disciplina, el trabajo en
            equipo y el amor por el deporte.
          </p>
        </div>
      </div>
    </Section>
  );
}
