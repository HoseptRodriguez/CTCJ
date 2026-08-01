import { Section } from '../../components/ui/Section.jsx';

const FACTS = [
  { n: 'Singles y dobles', l: 'las dos modalidades del ranking interno' },
  { n: '4 categorías', l: 'para que cada nivel compita entre pares' },
  { n: '2 temporadas al año', l: 'cada una cerrando con un Master' },
];

export function Competition() {
  return (
    <Section
      background="canvas"
      heading={{
        eyebrow: 'Competición CTCJ',
        title: 'Un sistema pensado para competir de verdad',
        lede: 'El entrenamiento orientado al torneo del programa de Competencia se apoya en un ranking interno con reglas claras y un cierre de temporada real.',
      }}
    >
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {FACTS.map((fact) => (
          <div key={fact.n} className="rounded-lg border border-neutral-200 p-6">
            <p className="font-display text-xl font-semibold text-primary">{fact.n}</p>
            <p className="mt-2 text-sm text-secondary">{fact.l}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
