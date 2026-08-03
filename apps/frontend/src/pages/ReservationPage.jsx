import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { guardianshipClient } from '../api/guardianshipClient.js';
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
  const [bookableMinors, setBookableMinors] = useState([]);
  const [holderUserId, setHolderUserId] = useState(null); // null = booking for myself

  useEffect(() => {
    if (status !== 'authenticated') {
      setBookableMinors([]);
      return;
    }
    let cancelled = false;
    guardianshipClient
      .listMine()
      .then((data) => {
        if (cancelled) return;
        setBookableMinors(data.guardianships.filter((g) => g.status === 'APPROVED' && g.canBook));
      })
      .catch(() => {
        // Courtesy feature -- fail silent, everyone can still book for themselves.
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

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

      {bookableMinors.length > 0 ? (
        <label className="mt-6 flex items-center gap-2 text-sm text-secondary">
          Reservando para
          <select
            value={holderUserId ?? ''}
            onChange={(e) => setHolderUserId(e.target.value || null)}
            className="rounded-md border border-neutral-300 bg-canvas px-3 py-1.5 text-sm"
          >
            <option value="">Mí</option>
            {bookableMinors.map((g) => (
              <option key={g.minorUserId} value={g.minorUserId}>
                {g.minorEmail}
              </option>
            ))}
          </select>
        </label>
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
          holderUserId={holderUserId}
          onClose={() => setSelectedSlot(null)}
          onConfirmed={handleConfirmed}
        />
      ) : null}
    </Section>
  );
}
