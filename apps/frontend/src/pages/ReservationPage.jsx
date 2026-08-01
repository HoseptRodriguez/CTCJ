import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Section } from '../components/ui/Section.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

import { BookingGrid } from './reservation/BookingGrid.jsx';
import { bogotaTodayKey, DatePicker } from './reservation/DatePicker.jsx';
import { HoldConfirmModal } from './reservation/HoldConfirmModal.jsx';
import { STATUS_CLASSES, STATUS_LABELS } from './reservation/SlotCell.jsx';

const LEGEND_STATUSES = ['available', 'mine', 'occupied', 'class', 'tournament'];

export function ReservationPage() {
  useDocumentTitle('Reserva tu cancha');
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [date, setDate] = useState(bogotaTodayKey);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [confirmedMessage, setConfirmedMessage] = useState(null);

  function handleSelectSlot(slot) {
    if (status !== 'authenticated') {
      navigate('/login', { state: { from: location } });
      return;
    }
    setConfirmedMessage(null);
    setSelectedSlot(slot);
  }

  function handleConfirmed() {
    setSelectedSlot(null);
    setConfirmedMessage('Tu reserva quedó confirmada. Te esperamos en el club.');
    setRefreshToken((n) => n + 1);
  }

  return (
    <Section
      heading={{
        eyebrow: 'Reservas',
        title: 'Reserva tu cancha',
        lede: 'Elige el día y la hora. La disponibilidad que ves aquí es la real del club.',
      }}
    >
      <div className="mt-8">
        <DatePicker
          value={date}
          onChange={(next) => {
            setDate(next);
            setConfirmedMessage(null);
          }}
        />
      </div>

      {confirmedMessage ? (
        <p className="mt-6 rounded-md bg-green-50 px-4 py-3 text-success" role="status">
          {confirmedMessage}
        </p>
      ) : null}

      <ul className="mt-6 flex flex-wrap gap-4 text-xs text-secondary">
        {LEGEND_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm border ${STATUS_CLASSES[s]}`} />
            {STATUS_LABELS[s]}
          </li>
        ))}
      </ul>

      <div className="mt-4" key={refreshToken}>
        <BookingGrid date={date} onSelectSlot={handleSelectSlot} />
      </div>

      {selectedSlot ? (
        <HoldConfirmModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onConfirmed={handleConfirmed}
        />
      ) : null}
    </Section>
  );
}
