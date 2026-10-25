import { useId, useState } from 'react';

import { CalendarIcon } from '../../components/icons/CalendarIcon.jsx';
import { CheckIcon } from '../../components/icons/CheckIcon.jsx';
import { PlusIcon } from '../../components/icons/PlusIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { CLUB_PHOTOS, ClubPhoto } from '../../components/ui/ClubPhoto.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { FontSizeToggle } from '../../components/ui/FontSizeToggle.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { Skeleton, SkeletonGroup, SkeletonText } from '../../components/ui/Skeleton.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { ToastProvider, useToast } from '../../components/ui/Toast.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

import { AnimationsShowcase } from './AnimationsShowcase.jsx';

/**
 * /dev/ui -- development-only catalogue of the v2 design system. Mounted in
 * App.jsx behind import.meta.env.DEV and lazy-loaded, so it is never part of
 * the production bundle.
 */
export function UiShowcase() {
  useDocumentTitle('Sistema de diseño');
  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink">
        <header className="bg-navy-500">
          <div className="mx-auto flex max-w-container flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <img
                src="/logo-insignia.png"
                alt="Escudo del Club de Tenis Ciudad Jardín"
                className="h-12 w-auto"
              />
              <span className="font-display text-h3 font-bold text-white">
                CTCJ · Sistema de diseño
              </span>
            </div>
            <FontSizeToggle tone="dark" />
          </div>
        </header>

        <main className="mx-auto max-w-container px-4 py-10 md:px-8">
          <PageHeader
            eyebrow="Solo en desarrollo"
            title="Componentes base"
            description="Todos los componentes del rediseño y sus variantes. Primero fácil, luego bonito."
          />
          <div className="space-y-12">
            <ColorsSection />
            <TypographySection />
            <ButtonsSection />
            <BadgesAndStatsSection />
            <CardsSection />
            <StatesSection />
            <NavigationSection />
            <FeedbackSection />
            <AnimationsShowcase />
            <PhotosSection />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

function Showcase({ title, children }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-4 font-display text-h2 font-bold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

const SWATCHES = [
  ['Azul marino', 'bg-navy-500', '#001A4D', 'text-white', 'Navegación, botón primario'],
  ['Verde limón', 'bg-lime', '#9EE67C', 'text-navy-500', 'Botón sobre azul, selección'],
  ['Arcilla', 'bg-clay', '#B8532A', 'text-white', 'Canchas libres, acentos'],
  ['Arcilla suave', 'bg-clay-soft', '#F3E1D6', 'text-ink', 'Fondos de acento'],
  ['Ámbar', 'bg-amber', '#F5B44A', 'text-navy-500', 'Avisos, contadores'],
  ['Fondo', 'bg-page', '#F4F6F9', 'text-ink', 'Fondo de la aplicación'],
  ['Superficie', 'bg-surface', '#FFFFFF', 'text-ink', 'Tarjetas y diálogos'],
  ['Texto', 'bg-ink', '#0E1A33', 'text-white', 'Texto principal'],
  ['Texto secundario', 'bg-ink-soft', '#4A5363', 'text-white', 'Explicaciones'],
  ['Peligro', 'bg-danger', '#B3261E', 'text-white', 'Acciones irreversibles'],
];

function ColorsSection() {
  return (
    <Showcase title="Colores">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SWATCHES.map(([name, bg, hex, fg, use]) => (
          <li key={name} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className={`${bg} ${fg} flex h-20 items-end p-3 font-semibold`}>{hex}</div>
            <div className="p-3">
              <p className="text-body font-semibold">{name}</p>
              <p className="text-body-sm text-ink-soft">{use}</p>
            </div>
          </li>
        ))}
      </ul>
    </Showcase>
  );
}

function TypographySection() {
  return (
    <Showcase title="Tipografía">
      <Card>
        <p className="font-display text-title-lg font-bold">Título de página 56px</p>
        <p className="font-display text-title font-bold">Título de página 48px (móvil)</p>
        <p className="font-display text-h2 font-bold">Título de sección 32px</p>
        <p className="font-display text-h3 font-bold">Título de tarjeta 24px</p>
        <p className="mt-4 text-lead">
          Texto de introducción 20px: explica en una frase qué se puede hacer aquí.
        </p>
        <p className="mt-2 text-body">
          Texto base 18px. Archivo en peso normal para leer cómodo; Archivo Narrow para títulos y
          números grandes.
        </p>
        <p className="mt-2 text-body-sm text-ink-soft">
          Texto pequeño 16px: el mínimo permitido en toda la aplicación.
        </p>
        <p className="mt-4 font-display text-stat font-bold">1.250.000</p>
      </Card>
    </Showcase>
  );
}

function ButtonsSection() {
  const [loading, setLoading] = useState(false);
  function fakeSave() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  }
  return (
    <Showcase title="Botones">
      <div className="space-y-6">
        <Card
          title="Sobre fondo claro"
          description="Tamaño md (48px) y lg (64px) para la acción principal."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" icon={<CalendarIcon />}>
              Reservar cancha
            </Button>
            <Button>Guardar nota</Button>
            <Button variant="secondary">Ver historial</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">Eliminar comentario</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              icon={<CheckIcon />}
              onClick={fakeSave}
              loading={loading}
              loadingText="Guardando…"
            >
              Marcar como pagada
            </Button>
            <Button disabled>No disponible</Button>
            <Button variant="secondary" icon={<PlusIcon />} to="/dev/ui">
              Enlace con aspecto de botón
            </Button>
          </div>
        </Card>
        <div className="rounded-xl bg-navy-500 p-6">
          <p className="mb-4 text-body font-semibold text-white">
            Sobre fondo azul (tone=&quot;dark&quot;)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button tone="dark" size="lg">
              Reservar cancha
            </Button>
            <Button tone="dark" variant="secondary">
              Ver planes
            </Button>
            <Button tone="dark" variant="ghost">
              Más información
            </Button>
          </div>
        </div>
      </div>
    </Showcase>
  );
}

function BadgesAndStatsSection() {
  return (
    <Showcase title="Estados y cifras">
      <Card title="StatusBadge" description="Siempre con texto, color e icono.">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="al-dia" />
          <StatusBadge status="pendiente" />
          <StatusBadge status="vencida" />
          <StatusBadge status="suspendida" />
          <StatusBadge status="ACTIVE" size="lg" />
          <StatusBadge status="OVERDUE" size="lg" />
          <StatusBadge status="al-dia" label="Pagada" />
        </div>
      </Card>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reservas de hoy"
          value="14"
          hint="3 más que ayer"
          icon={<CalendarIcon />}
        />
        <StatCard label="Canchas libres ahora" value="2" unit="de 3" accent="clay" />
        <StatCard
          label="Pagos pendientes"
          value="5"
          accent="amber"
          to="/dev/ui"
          actionLabel="Ver pagos"
        />
        <StatCard label="Recaudo del mes" value="$4,2 M" accent="lime" hint="Septiembre" />
      </div>
    </Showcase>
  );
}

function CardsSection() {
  return (
    <Showcase title="Tarjetas y encabezado">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Próxima reserva"
          description="Cancha 2 · Sábado 26 de septiembre"
          actions={<StatusBadge status="al-dia" label="Confirmada" />}
          footer={
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary">Cambiar hora</Button>
              <Button variant="ghost">Cancelar reserva</Button>
            </div>
          }
        >
          <p className="font-display text-stat font-bold">7:00 a. m.</p>
        </Card>
        <Card padding="lg">
          <PageHeader
            className="mb-0 md:mb-0"
            backTo="/dev/ui"
            eyebrow="Recepción"
            title="Pagos del día"
            description="Marque cada reserva cuando el jugador pague."
            actions={<Button icon={<PlusIcon />}>Registrar pago</Button>}
          />
        </Card>
      </div>
    </Showcase>
  );
}

function StatesSection() {
  const [retrying, setRetrying] = useState(false);
  return (
    <Showcase title="Vacío, error y carga">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EmptyState
          title="Todavía no tiene reservas"
          description="Cuando reserve una cancha, aparecerá aquí con la fecha y la hora."
          action={<Button icon={<CalendarIcon />}>Reservar cancha</Button>}
        />
        <ErrorState
          onRetry={() => {
            setRetrying(true);
            setTimeout(() => setRetrying(false), 1500);
          }}
          retrying={retrying}
        />
        <Card title="Cargando">
          <SkeletonGroup label="Cargando reservas…">
            <Skeleton className="mb-4 h-10 w-1/2" />
            <SkeletonText lines={4} />
          </SkeletonGroup>
        </Card>
      </div>
    </Showcase>
  );
}

function NavigationSection() {
  const [range, setRange] = useState('hoy');
  return (
    <Showcase title="Pestañas y selector">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Tabs">
          <Tabs
            label="Mis reservas"
            tabs={[
              {
                id: 'proximas',
                label: 'Próximas',
                content: <p className="text-body">Sus reservas desde hoy.</p>,
              },
              {
                id: 'pasadas',
                label: 'Pasadas',
                content: <p className="text-body">Reservas anteriores.</p>,
              },
              {
                id: 'canceladas',
                label: 'Canceladas',
                content: <p className="text-body">Reservas canceladas.</p>,
              },
            ]}
          />
        </Card>
        <Card title="SegmentedControl y letra grande">
          <SegmentedControl
            label="Mostrar reservas de"
            value={range}
            onChange={setRange}
            options={[
              { value: 'hoy', label: 'Hoy' },
              { value: 'manana', label: 'Mañana' },
              { value: 'semana', label: 'Esta semana' },
            ]}
          />
          <p className="mt-2 text-body-sm text-ink-soft">Seleccionado: {range}</p>
          <div className="mt-6">
            <FontSizeToggle />
          </div>
        </Card>
      </div>
    </Showcase>
  );
}

function FeedbackSection() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    setDeleting(true);
    setTimeout(() => {
      setDeleting(false);
      setOpen(false);
      toast({
        title: 'Reserva cancelada',
        description: 'La cancha 2 quedó libre para otros jugadores.',
      });
    }, 1200);
  }

  return (
    <Showcase title="Confirmación y avisos">
      <Card>
        <div className="flex flex-wrap gap-3">
          <Button variant="danger" onClick={() => setOpen(true)}>
            Cancelar reserva
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ title: 'Nota guardada', tone: 'success' })}
          >
            Aviso de éxito
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'No se pudo guardar el pago',
                description:
                  'Se perdió la conexión. Revise el internet y vuelva a marcarlo como pagado.',
                tone: 'error',
              })
            }
          >
            Aviso de error
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: 'Mañana hay mantenimiento de la cancha 3', tone: 'info' })
            }
          >
            Aviso informativo
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={open}
        title="¿Cancelar la reserva?"
        description="Cancha 2, sábado 26 de septiembre a las 7:00 a. m. Si cancela, otra persona podrá reservar ese horario."
        confirmLabel="Sí, cancelar reserva"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setOpen(false)}
      />
    </Showcase>
  );
}

function PhotosSection() {
  return (
    <Showcase title="Fotos del club">
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Object.keys(CLUB_PHOTOS).map((name, i) => (
          <li key={name}>
            <ClubPhoto
              name={name}
              priority={i === 0}
              sizes="(min-width: 768px) 33vw, 50vw"
              className="aspect-[4/5] rounded-xl"
            />
            <p className="mt-2 text-body-sm text-ink-soft">{name}</p>
          </li>
        ))}
      </ul>
    </Showcase>
  );
}
