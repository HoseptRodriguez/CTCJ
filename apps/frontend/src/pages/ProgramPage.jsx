import { Link, Navigate, useParams } from 'react-router-dom';

import { BrochureTitle, DiagonalDivider } from '../components/brochure/Brochure.jsx';
import { InfoRequestForm } from '../components/forms/InfoRequestForm.jsx';
import { TrophyIcon } from '../components/icons/TrophyIcon.jsx';
import { Accordion } from '../components/ui/Accordion.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ProgramLinkCard } from '../components/brochure/ProgramLinkCard.jsx';
import { ClubPhoto } from '../components/ui/ClubPhoto.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PROGRAMS, programBySlug } from '../lib/programs.js';

const SECTION = 'mx-auto max-w-container px-4 py-14 md:px-8';

/** /programas/:slug -- one page per program, same structure for the three. */
export function ProgramPage() {
  const { slug } = useParams();
  const program = programBySlug(slug);
  useDocumentTitle(program?.title ?? 'Programas');
  if (!program) return <Navigate to="/" replace />;
  const others = PROGRAMS.filter((p) => p.slug !== program.slug);

  return (
    <>
      <Header program={program} />

      <section aria-label="Para quién es y qué incluye" className="bg-page">
        <div className={`${SECTION} grid gap-10 md:grid-cols-2`}>
          <div>
            <BrochureTitle id="para-quien">¿Para quién es?</BrochureTitle>
            <p className="mt-6 text-lead text-ink">{program.forWhom}</p>
          </div>
          <div>
            <BrochureTitle id="que-incluye">¿Qué incluye?</BrochureTitle>
            <ul className="mt-6 list-disc space-y-2 pl-6 text-lead text-ink">
              {program.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <DiagonalDivider from="bg-page" to="bg-lime" />
      <section aria-labelledby="horarios-valor" className="bg-lime text-navy-500">
        <div className={`${SECTION} pt-6`}>
          <BrochureTitle id="horarios-valor" tone="lime">
            Horarios y valor
          </BrochureTitle>
          <dl className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-white/60 p-6">
              <dt className="font-display text-h3 font-bold uppercase">Horarios</dt>
              <dd className="mt-2 text-lead">{program.schedule}</dd>
            </div>
            <div className="rounded-xl bg-white/60 p-6">
              <dt className="font-display text-h3 font-bold uppercase">Valor</dt>
              <dd className="mt-2 text-lead">{program.price}</dd>
            </div>
          </dl>
        </div>
      </section>

      <DiagonalDivider from="bg-lime" to="bg-navy-500" flip />
      <section aria-labelledby="entrenadores" className="bg-navy-500 text-white">
        <div className={`${SECTION} pt-6`}>
          <BrochureTitle id="entrenadores" tone="navy">
            Entrenadores
          </BrochureTitle>
          <p className="mt-6 max-w-prose text-lead text-white/90">{program.coaches}</p>
          {program.slug === 'competencia' && <CompetitionLinks />}
        </div>
      </section>

      <DiagonalDivider from="bg-navy-500" to="bg-page" />
      <section aria-labelledby="preguntas" className="bg-page">
        <div className={`${SECTION} pt-6`}>
          <BrochureTitle id="preguntas">Preguntas frecuentes</BrochureTitle>
          <Accordion items={program.faq} className="mt-8 max-w-3xl" />
        </div>
      </section>

      <section
        id="solicitar-informacion"
        aria-label="Solicitar información"
        className="scroll-mt-24 bg-page"
      >
        <div className="mx-auto max-w-3xl px-4 pb-14 md:px-8">
          <InfoRequestForm
            key={program.slug}
            program={program.infoProgram}
            title={`Solicitar información: ${program.title.toLowerCase()}`}
          />
        </div>
      </section>

      <section aria-labelledby="otros-programas" className="bg-surface">
        <div className={SECTION}>
          <BrochureTitle id="otros-programas">Otros programas</BrochureTitle>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {others.map((p) => (
              <li key={p.slug}>
                <ProgramLinkCard program={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Header({ program }) {
  return (
    <section
      aria-labelledby="programa-titulo"
      className="relative isolate overflow-hidden bg-navy-500"
    >
      <ClubPhoto
        name={program.photo}
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-navy-500/80 md:bg-transparent md:bg-gradient-to-r md:from-navy-500 md:via-navy-500/80 md:to-transparent"
      />
      {/* Lime diagonal band, as in the club's brochure. */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 -z-10 h-16 w-2/3 bg-lime [clip-path:polygon(18%_100%,100%_0,100%_100%)] md:h-24"
      />
      <div className="mx-auto flex min-h-[26rem] max-w-container flex-col justify-center px-4 py-16 text-white md:min-h-[32rem] md:px-8">
        <p className="text-lead font-semibold text-lime">
          <Link to="/#clases" className="focus-ring rounded underline underline-offset-4">
            Programas
          </Link>{' '}
          · Academia Orlando Rodríguez
        </p>
        <BrochureTitle
          as="h1"
          id="programa-titulo"
          tone="navy"
          className="mt-4 text-white md:text-[3.5rem]"
        >
          {program.title}
        </BrochureTitle>
        <p className="mt-5 max-w-prose text-lead text-white/90">{program.lead}</p>
        <Button tone="dark" size="lg" href="#solicitar-informacion" className="mt-8 self-start">
          Solicitar información
        </Button>
      </div>
    </section>
  );
}

function CompetitionLinks() {
  return (
    <div className="mt-10 rounded-xl bg-white/10 p-6">
      <h3 className="flex items-center gap-3 font-display text-h3 font-bold uppercase text-lime">
        <TrophyIcon className="h-7 w-7" aria-hidden="true" />
        Ranking y torneos del club
      </h3>
      <p className="mt-2 text-lead text-white/90">
        La tabla de la temporada, los retos y los torneos están en Mi CTCJ (con tu cuenta).
      </p>
      <Button tone="dark" variant="secondary" size="lg" to="/mi-ctcj/ranking" className="mt-6">
        Ver el ranking y los torneos
      </Button>
    </div>
  );
}
