import { Badge } from '../../components/ui/Badge.jsx';
import { Section } from '../../components/ui/Section.jsx';

export function NewsAndEvents() {
  return (
    <Section
      background="canvas"
      heading={{
        eyebrow: 'Noticias y comunidad',
        title: 'Noticias, eventos e historias del club',
        lede: 'Estamos construyendo el espacio para contar lo que pasa en el club: resultados, eventos y las historias de nuestros jugadores.',
      }}
    >
      <div className="mt-10 rounded-lg border border-dashed border-neutral-300 bg-raised p-10 text-center">
        <Badge />
        <p className="mt-4 font-display text-lg font-semibold text-primary">Muy pronto, aquí</p>
        <p className="mx-auto mt-2 max-w-md text-secondary">
          Síguenos en redes mientras tanto -- ahí compartimos lo que va pasando en las canchas.
        </p>
      </div>
    </Section>
  );
}
