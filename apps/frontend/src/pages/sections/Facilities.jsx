import { Section } from '../../components/ui/Section.jsx';

export function Facilities() {
  return (
    <Section
      id="instalaciones"
      background="canvas"
      heading={{
        eyebrow: 'Nuestros espacios',
        title: 'Arcilla, montaña y cielo abierto',
        lede: 'Tres canchas de polvo de ladrillo cuidadosamente mantenidas, en una ladera con vista a la cordillera. El lugar es parte del entrenamiento.',
      }}
    >
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2">
        <figure className="group relative col-span-2 row-span-2 overflow-hidden rounded-lg">
          <img
            src="/img/instalacion-red-1000.jpg"
            alt="Cancha de arcilla con la red en primer plano y montañas al fondo"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <figcaption className="absolute bottom-4 left-4 rounded-full bg-canvas px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-primary shadow-md">
            Cancha central
          </figcaption>
        </figure>
        <figure className="relative row-span-2 overflow-hidden rounded-lg">
          <img
            src="/img/accion-saque-700.jpg"
            alt="Jugador ejecutando un saque"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <figcaption className="absolute bottom-4 left-4 rounded-full bg-canvas px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-primary shadow-md">
            Entrenamiento
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-lg">
          <img
            src="/img/accion-palmeras-480.jpg"
            alt="Saque con palmeras al fondo"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </figure>
        <figure className="overflow-hidden rounded-lg">
          <img
            src="/img/accion-espera-480.jpg"
            alt="Jugador en posición de espera"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </figure>
      </div>
    </Section>
  );
}
