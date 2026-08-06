import { Section } from '../../components/ui/Section.jsx';

// These four roles are real -- they exist today in the platform's RBAC
// (see @ctcj/shared ROLE_DEFINITIONS: ENTRENADOR, FISIOTERAPEUTA,
// PSICOLOGO, NEUROPSICOLOGO). All four now have real tracking visible in
// Mi CTCJ: Entrenador (Phase 10, coaching module), Psicólogo/Neuropsicólogo
// (Phase 14, clinical module), and Fisioterapeuta (Phase 15, physiotherapy
// slice of the clinical module).
const ROLES = [
  { name: 'Entrenador', copy: 'Seguimiento técnico y planificación del entrenamiento.' },
  { name: 'Fisioterapeuta', copy: 'Prevención y recuperación física del jugador.' },
  { name: 'Psicólogo', copy: 'Acompañamiento mental y emocional dentro y fuera de la cancha.' },
  { name: 'Neuropsicólogo', copy: 'Seguimiento del desarrollo cognitivo en jugadores jóvenes.' },
];

export function PlayerDevelopment() {
  return (
    <Section
      background="raised"
      heading={{
        eyebrow: 'Desarrollo del jugador',
        title: 'Una plataforma pensada para un equipo multidisciplinario',
        lede: 'Ciudad Jardín construye su plataforma alrededor de un mismo jugador visto por distintos roles: cada uno de estos perfiles ya existe en el sistema.',
      }}
    >
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((role) => (
          <div key={role.name} className="rounded-lg bg-canvas p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-primary">{role.name}</h3>
            <p className="mt-2 text-sm text-secondary">{role.copy}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
