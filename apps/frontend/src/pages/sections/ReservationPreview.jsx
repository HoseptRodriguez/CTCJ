import { useEffect, useState } from 'react';

import { bookingClient } from '../../api/bookingClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { Section } from '../../components/ui/Section.jsx';

export function ReservationPreview() {
  const [courtCount, setCourtCount] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bookingClient
      .listCourts()
      .then((data) => {
        if (!cancelled) setCourtCount(data.courts?.length ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section
      background="canvas"
      heading={{
        eyebrow: 'Reservas',
        title: 'Consulta la cancha disponible ahora mismo',
        lede:
          courtCount != null
            ? `${courtCount} ${courtCount === 1 ? 'cancha disponible' : 'canchas disponibles'} para reservar en línea, con la disponibilidad real del club.`
            : failed
              ? 'Consulta la disponibilidad completa del club en el calendario de reservas.'
              : 'Consultando disponibilidad...',
      }}
    >
      <div className="mt-8">
        <Button to="/canchas" variant="primary">
          Ver calendario de reservas
        </Button>
      </div>
    </Section>
  );
}
