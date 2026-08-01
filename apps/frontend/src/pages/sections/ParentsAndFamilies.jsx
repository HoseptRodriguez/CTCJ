import { Badge } from '../../components/ui/Badge.jsx';
import { Section } from '../../components/ui/Section.jsx';

export function ParentsAndFamilies() {
  return (
    <Section
      background="raised"
      heading={{
        eyebrow: 'Padres y familias',
        title: 'Un rol propio para acompañar a tu jugador',
        lede: 'El sistema ya reconoce a padres y tutores como un tipo de cuenta distinto, pensado para acompañar el paso de sus hijos por el club.',
      }}
    >
      <div className="mt-10 max-w-2xl">
        <p className="text-secondary">
          Hoy, una cuenta de padre o tutor puede registrarse y reservar cancha como cualquier
          jugador. El seguimiento del progreso de cada hijo desde una sola cuenta familiar es la
          siguiente pieza de Mi CTCJ.
        </p>
        <div className="mt-6">
          <Badge>Próximamente: seguimiento familiar en Mi CTCJ</Badge>
        </div>
      </div>
    </Section>
  );
}
