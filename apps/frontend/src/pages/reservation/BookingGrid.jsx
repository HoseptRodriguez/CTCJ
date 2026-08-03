import { useEffect, useState } from 'react';

import { bookingClient } from '../../api/bookingClient.js';
import { findSlotReservation, reservationSlotStatus } from '../../lib/reservationSlotStatus.js';

import { SlotCell } from './SlotCell.jsx';

// Real, documented club operating hours (RNF-D-02 in the v7 master plan):
// 05:00-22:00 America/Bogotá. Bogotá has no DST, fixed UTC-5 -- this offset
// mirrors apps/backend's scheduleWindow.js CLUB_UTC_OFFSET_HOURS exactly, so
// slot timestamps line up with what the server stores and returns.
const CLUB_UTC_OFFSET_HOURS = 5;
const OPEN_HOUR = 5;
const CLOSE_HOUR = 22;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

function slotRange(dateKey, localHour) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = new Date(
    Date.UTC(year, month - 1, day, CLUB_UTC_OFFSET_HOURS + localHour, 0, 0, 0),
  );
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

/** @param {{ date: string, onSelectSlot: (slot: {courtId: string, courtName: string, start: string, end: string}) => void }} props */
export function BookingGrid({ date, onSelectSlot }) {
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSchedule(null);
    setError(null);
    bookingClient
      .getSchedule(date)
      .then((data) => {
        if (!cancelled) setSchedule(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (error) {
    return <p className="text-error">No se pudo cargar la disponibilidad. Intenta de nuevo.</p>;
  }
  if (!schedule) {
    return <p className="text-secondary">Cargando disponibilidad...</p>;
  }
  if (schedule.courts.length === 0) {
    return <p className="text-secondary">No hay canchas activas en este momento.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="w-16 text-left text-xs font-semibold uppercase tracking-wide text-tertiary">
              Hora
            </th>
            {schedule.courts.map((court) => (
              <th
                key={court.id}
                className="text-left text-xs font-semibold uppercase tracking-wide text-tertiary"
              >
                {court.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => {
            const { start, end } = slotRange(date, hour);
            const startIso = start.toISOString();
            return (
              <tr key={hour}>
                <th scope="row" className="text-left text-sm font-medium text-secondary">
                  {String(hour).padStart(2, '0')}:00
                </th>
                {schedule.courts.map((court) => {
                  const reservation = findSlotReservation(
                    schedule.reservations,
                    court.id,
                    startIso,
                  );
                  const status = reservationSlotStatus(reservation);
                  return (
                    <td key={court.id}>
                      <SlotCell
                        status={status}
                        onClick={() =>
                          onSelectSlot({
                            courtId: court.id,
                            courtName: court.name,
                            start: startIso,
                            end: end.toISOString(),
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
