import { motion } from 'framer-motion';

import { Button } from '../../components/ui/Button.jsx';
import { Container } from '../../components/ui/Container.jsx';

const STATS = [
  { n: '+10', l: 'años formando jugadores' },
  { n: '3', l: 'canchas de arcilla' },
  { n: '5', l: 'programas por nivel' },
  { n: '4', l: 'categorías de competición' },
];

export function Hero() {
  return (
    <section id="inicio" className="relative isolate overflow-hidden bg-navy-900">
      <div className="absolute inset-0">
        <picture>
          <source
            type="image/webp"
            srcSet="/img/hero-canchas-560.webp 560w, /img/hero-canchas-900.webp 900w, /img/hero-canchas-1400.webp 1400w, /img/hero-canchas-1920.webp 1920w"
            sizes="100vw"
          />
          <img
            src="/img/hero-canchas-1400.jpg"
            srcSet="/img/hero-canchas-560.jpg 560w, /img/hero-canchas-900.jpg 900w, /img/hero-canchas-1400.jpg 1400w, /img/hero-canchas-1920.jpg 1920w"
            sizes="100vw"
            alt="Canchas de arcilla del Club de Tenis Ciudad Jardín con vista a la montaña y cielo de nubes al atardecer"
            className="h-full w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/50 to-navy-900/20" />
      </div>

      <Container className="relative flex min-h-[640px] flex-col justify-end py-24 md:min-h-[760px] md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0, 0, 0, 1] }}
        >
          <p className="font-display text-sm font-semibold uppercase tracking-eyebrow text-green-300">
            Fusagasugá · Cundinamarca
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tighter text-on-inverse md:text-6xl">
            Del primer golpe al <em className="text-green-300 not-italic">alto rendimiento</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-normal text-on-inverse-muted">
            Más de una década formando tenistas en la región, en canchas de arcilla con la
            cordillera de fondo. Aquí no solo se aprende a competir: se forma a la persona.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="#academia" variant="primary">
              Conoce nuestra academia
            </Button>
            <Button
              to="/canchas"
              variant="outline"
              className="border-on-inverse text-on-inverse hover:bg-white/10"
            >
              Reserva una cancha
            </Button>
          </div>
        </motion.div>
      </Container>

      <div className="relative border-t border-white/10 bg-navy-900/60 backdrop-blur">
        <Container>
          <dl className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.l}>
                <dt className="sr-only">{stat.l}</dt>
                <dd className="font-display text-3xl font-semibold text-on-inverse md:text-4xl">
                  {stat.n}
                </dd>
                <p className="mt-1 text-sm text-on-inverse-muted">{stat.l}</p>
              </div>
            ))}
          </dl>
        </Container>
      </div>
    </section>
  );
}
