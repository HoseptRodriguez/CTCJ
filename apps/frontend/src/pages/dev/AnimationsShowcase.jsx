import { LayoutGroup } from 'framer-motion';
import { useState } from 'react';

import { AnimatedCheck } from '../../components/motion/AnimatedCheck.jsx';
import { AnimatedList } from '../../components/motion/AnimatedList.jsx';
import { CountUp } from '../../components/motion/CountUp.jsx';
import { HeroBallTrajectory } from '../../components/motion/HeroBallTrajectory.jsx';
import { ParallaxPhoto } from '../../components/motion/ParallaxPhoto.jsx';
import { SlidePanel } from '../../components/motion/SlidePanel.jsx';
import { SplitHeadline } from '../../components/motion/SplitHeadline.jsx';
import { TabTransition } from '../../components/motion/TabTransition.jsx';
import { CheckIcon } from '../../components/icons/CheckIcon.jsx';
import { RefreshIcon } from '../../components/icons/RefreshIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useReducedMotion } from '../../lib/motion.js';

/** One demo: title, what it's for, and a "Repetir" button that replays it. */
function Demo({ title, description, onRepeat, children, dark = false }) {
  return (
    <Card
      title={title}
      headingLevel={3}
      description={description}
      actions={
        <Button variant="secondary" icon={<RefreshIcon />} onClick={onRepeat}>
          Repetir
        </Button>
      }
    >
      <div className={dark ? 'rounded-xl bg-navy-500 p-6' : undefined}>{children}</div>
    </Card>
  );
}

/** Remount counter: changing a component's key replays its entrance. */
function useReplay() {
  const [key, setKey] = useState(0);
  return [key, () => setKey((k) => k + 1)];
}

export function AnimationsShowcase() {
  const reduced = useReducedMotion();
  return (
    <section aria-labelledby="animaciones-title">
      <h2 id="animaciones-title" className="mb-2 font-display text-h2 font-bold text-ink">
        Animaciones
      </h2>
      <p className="mb-6 max-w-prose text-body text-ink-soft">
        GSAP para el sitio público; framer-motion para los paneles internos. Solo se anima transform
        y opacity.{' '}
        <strong className="text-ink">
          {reduced
            ? 'Su sistema pide reducir el movimiento: todo aparece sin animación.'
            : 'Si activa "reducir movimiento" en su sistema, todo aparece sin animación.'}
        </strong>
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HeroDemo />
        <HeadlineDemo />
        <CountUpDemo />
        <CheckDemo />
        <SlidePanelDemo />
        <ListDemo />
        <TabsDemo />
        <FeedbackDemo />
        <ParallaxDemo />
      </div>
    </section>
  );
}

function HeroDemo() {
  const [key, replay] = useReplay();
  return (
    <Demo
      title="HeroBallTrajectory"
      description="GSAP · la bola recorre el arco, que se dibuja, y rebota una vez (1,2 s en total)."
      onRepeat={replay}
      dark
    >
      <HeroBallTrajectory key={key} tone="dark" />
    </Demo>
  );
}

function HeadlineDemo() {
  const [key, replay] = useReplay();
  return (
    <Demo
      title="SplitHeadline"
      description="GSAP · el titular entra línea por línea."
      onRepeat={replay}
      dark
    >
      <SplitHeadline
        key={key}
        as="p"
        lines={['Su club.', 'Su cancha.', 'Su juego.']}
        className="font-display text-title font-bold text-white md:text-title-lg"
      />
    </Demo>
  );
}

function CountUpDemo() {
  const [key, replay] = useReplay();
  return (
    <Demo
      title="CountUp"
      description="GSAP · cuenta hasta el número al aparecer en pantalla. Cifras de ejemplo."
      onRepeat={replay}
    >
      <dl key={key} className="grid grid-cols-2 gap-6">
        <div>
          <dt className="text-body font-semibold text-ink-soft">Reservas de ejemplo</dt>
          <dd className="font-display text-stat font-bold text-ink">
            <CountUp value={1250} />
          </dd>
        </div>
        <div>
          <dt className="text-body font-semibold text-ink-soft">Recaudo de ejemplo</dt>
          <dd className="font-display text-stat font-bold text-ink">
            <CountUp value={4200000} prefix="$" />
          </dd>
        </div>
      </dl>
    </Demo>
  );
}

function CheckDemo() {
  const [key, replay] = useReplay();
  return (
    <Demo
      title="AnimatedCheck"
      description="framer-motion · confirma que la acción salió bien (0,25 s)."
      onRepeat={replay}
    >
      <div key={key} className="flex items-center gap-4">
        <AnimatedCheck label="Pago registrado" />
        <div>
          <p className="font-display text-h3 font-bold text-ink">Pago registrado</p>
          <p className="text-body text-ink-soft">Cancha 2 · $45.000 en efectivo</p>
        </div>
      </div>
    </Demo>
  );
}

function SlidePanelDemo() {
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  function openPanel() {
    setPaid(false);
    setOpen(true);
  }
  return (
    <Demo
      title="SlidePanel"
      description="framer-motion · panel lateral para “Cobrar” o “Tu reserva”."
      onRepeat={openPanel}
    >
      <Button onClick={openPanel}>Cobrar reserva</Button>
      <SlidePanel
        open={open}
        onClose={() => setOpen(false)}
        title="Cobrar"
        description="Cancha 2 · sábado 26 de septiembre, 7:00 a. m."
        footer={
          paid ? (
            <Button fullWidth size="lg" variant="secondary" onClick={() => setOpen(false)}>
              Listo, cerrar
            </Button>
          ) : (
            <Button fullWidth size="lg" icon={<CheckIcon />} onClick={() => setPaid(true)}>
              Marcar como pagada
            </Button>
          )
        }
      >
        {paid ? (
          <div className="flex items-center gap-4">
            <AnimatedCheck label="Pago registrado" />
            <p className="text-lead font-semibold text-ink">Pago registrado</p>
          </div>
        ) : (
          <dl className="space-y-3 text-body">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Jugador</dt>
              <dd className="font-semibold">Ana Gómez (ejemplo)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Valor</dt>
              <dd className="font-display text-h3 font-bold">$45.000</dd>
            </div>
          </dl>
        )}
      </SlidePanel>
    </Demo>
  );
}

const INITIAL_PAYMENTS = [
  { id: 'p1', name: 'Cancha 1 · 6:00 a. m.', paid: false },
  { id: 'p2', name: 'Cancha 2 · 7:00 a. m.', paid: false },
  { id: 'p3', name: 'Cancha 3 · 8:00 a. m.', paid: false },
  { id: 'p4', name: 'Cancha 1 · 5:00 p. m.', paid: true },
];

function ListDemo() {
  const [payments, setPayments] = useState(INITIAL_PAYMENTS);
  const pending = payments.filter((p) => !p.paid);
  const done = payments.filter((p) => p.paid);
  const markPaid = (id) =>
    setPayments((list) => list.map((p) => (p.id === id ? { ...p, paid: true } : p)));

  return (
    <Demo
      title="AnimatedList"
      description="framer-motion · el ítem viaja de “Sin pagar” a “Pagadas”."
      onRepeat={() => setPayments(INITIAL_PAYMENTS)}
    >
      <LayoutGroup>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-3 text-body font-bold text-ink">Sin pagar ({pending.length})</h4>
            <AnimatedList
              aria-label="Sin pagar"
              layoutScope="pagos"
              items={pending}
              getKey={(p) => p.id}
              renderItem={(p) => (
                <div className="rounded-lg border border-line bg-surface p-3">
                  <p className="text-body font-semibold">{p.name}</p>
                  <Button className="mt-2" variant="secondary" onClick={() => markPaid(p.id)}>
                    Marcar como pagada
                  </Button>
                </div>
              )}
            />
          </div>
          <div>
            <h4 className="mb-3 text-body font-bold text-ink">Pagadas ({done.length})</h4>
            <AnimatedList
              aria-label="Pagadas"
              layoutScope="pagos"
              items={done}
              getKey={(p) => p.id}
              renderItem={(p) => (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3">
                  <p className="text-body font-semibold">{p.name}</p>
                  <StatusBadge status="al-dia" label="Pagada" />
                </div>
              )}
            />
          </div>
        </div>
      </LayoutGroup>
    </Demo>
  );
}

const TAB_CONTENT = {
  proximas: 'Sábado 26 · Cancha 2 · 7:00 a. m.',
  pasadas: 'Miércoles 17 · Cancha 1 · 6:00 p. m.',
  canceladas: 'No tiene reservas canceladas.',
};

function TabsDemo() {
  const [tab, setTab] = useState('proximas');
  const content = (id) => (
    <TabTransition activeKey={id}>
      <p className="text-body">{TAB_CONTENT[id]}</p>
    </TabTransition>
  );
  return (
    <Demo
      title="TabTransition"
      description="framer-motion · el contenido cambia con un fundido suave."
      onRepeat={() => setTab((t) => (t === 'proximas' ? 'pasadas' : 'proximas'))}
    >
      <Tabs
        label="Mis reservas (demo)"
        value={tab}
        onChange={setTab}
        tabs={Object.keys(TAB_CONTENT).map((id) => ({
          id,
          label: { proximas: 'Próximas', pasadas: 'Pasadas', canceladas: 'Canceladas' }[id],
          content: content(id),
        }))}
      />
    </Demo>
  );
}

function FeedbackDemo() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const showToast = () =>
    toast({ title: 'Reserva confirmada', description: 'Cancha 2, sábado a las 7:00 a. m.' });
  return (
    <Demo
      title="Toast y ConfirmDialog"
      description="framer-motion · entran y salen con animación corta."
      onRepeat={showToast}
    >
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={showToast}>
          Mostrar aviso
        </Button>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Abrir confirmación
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        tone="primary"
        title="¿Guardar los cambios?"
        description="Se actualizará el horario de la cancha 3 para toda la semana."
        confirmLabel="Sí, guardar cambios"
        onConfirm={() => {
          setOpen(false);
          toast({ title: 'Cambios guardados' });
        }}
        onCancel={() => setOpen(false)}
      />
    </Demo>
  );
}

function ParallaxDemo() {
  const [key, replay] = useReplay();
  return (
    <Demo
      title="ParallaxPhoto"
      description="GSAP ScrollTrigger · la foto se desplaza como máximo 40 px al hacer scroll."
      onRepeat={replay}
    >
      <ParallaxPhoto
        key={key}
        name="accion-palmeras"
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="aspect-[4/3] rounded-xl"
      />
    </Demo>
  );
}
