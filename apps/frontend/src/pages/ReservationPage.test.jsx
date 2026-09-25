import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from '../api/bookingClient.js';
import { guardianshipClient } from '../api/guardianshipClient.js';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { slotStartIso, upcomingDayKeys } from '../lib/clubTime.js';

import { ReservationPage } from './ReservationPage.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/bookingClient.js', () => ({
  bookingClient: {
    getSchedule: vi.fn(),
    hold: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  },
}));
vi.mock('../api/guardianshipClient.js', () => ({
  guardianshipClient: { listMine: vi.fn() },
}));

// Tomorrow is always fully inside the 30-minute..7-day booking window.
const TOMORROW = upcomingDayKeys(2)[1];
const COURTS = [
  { id: 'c1', name: 'Cancha 1', hasLighting: true, priceCop: 35000 },
  { id: 'c2', name: 'Cancha 2', hasLighting: true, priceCop: 35000 },
];

function scheduleFor(date) {
  return {
    date,
    courts: COURTS,
    reservations:
      date === TOMORROW
        ? [
            {
              courtId: 'c1',
              periodStart: slotStartIso(date, 7),
              periodEnd: slotStartIso(date, 8),
              label: 'Ocupada',
              occupied: true,
            },
            {
              courtId: 'c2',
              periodStart: slotStartIso(date, 9),
              periodEnd: slotStartIso(date, 10),
              label: 'Clase',
              occupied: true,
            },
          ]
        : [],
  };
}

function LoginSpy() {
  const location = useLocation();
  return <p>Login desde {`${location.state?.from?.pathname}${location.state?.from?.search}`}</p>;
}

function renderPage(entry = '/canchas') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/canchas" element={<ReservationPage />} />
          <Route path="/login" element={<LoginSpy />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const cell = (court, time) =>
  screen.findByRole('button', { name: `${court}, ${time}: Libre. Reservar` });

/** Picks tomorrow in the day picker (not the "Mañana" part-of-day option). */
async function goToTomorrow(user) {
  const days = screen.getByRole('radiogroup', { name: 'Elige el día' });
  await user.click(within(days).getAllByRole('radio')[1]);
}

describe('ReservationPage — booking flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingClient.getSchedule.mockImplementation((date) => Promise.resolve(scheduleFor(date)));
    bookingClient.cancel.mockResolvedValue({});
    guardianshipClient.listMine.mockResolvedValue({ guardianships: [] });
  });

  it('shows the 3 steps and 8 day buttons (today + 7)', async () => {
    useAuth.mockReturnValue({ status: 'anonymous', user: null });
    renderPage();
    const steps = screen.getByRole('list', { name: 'Pasos para reservar' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(screen.getByRole('radiogroup', { name: 'Elige el día' })).getAllByRole('radio'),
    ).toHaveLength(8);
    await waitFor(() => expect(bookingClient.getSchedule).toHaveBeenCalled());
  });

  it('without a session, tapping a free hour goes to login and remembers that hour', async () => {
    useAuth.mockReturnValue({ status: 'anonymous', user: null });
    const user = userEvent.setup();
    renderPage();
    await goToTomorrow(user);

    await user.click(await cell('Cancha 1', '8:00 a. m.'));

    expect(
      await screen.findByText(`Login desde /canchas?fecha=${TOMORROW}&cancha=c1&hora=8`),
    ).toBeInTheDocument();
    expect(bookingClient.hold).not.toHaveBeenCalled();
  });

  it('occupied and class hours are shown as text, never as buttons', async () => {
    useAuth.mockReturnValue({ status: 'anonymous', user: null });
    const user = userEvent.setup();
    renderPage();
    await goToTomorrow(user);
    await cell('Cancha 1', '8:00 a. m.');

    expect(
      screen.queryByRole('button', { name: /Cancha 1, 7:00 a\. m\./ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancha 2, 9:00 a\. m\./ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Ocupada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clase').length).toBeGreaterThan(0);
  });

  it('holds the hour, shows the real countdown and COP price, and confirms', async () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1', roles: ['JUGADOR'] } });
    bookingClient.hold.mockResolvedValue({
      reservationId: 'r1',
      holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      priceCop: 35000,
    });
    bookingClient.confirm.mockResolvedValue({ status: 'CONFIRMED' });
    const user = userEvent.setup();
    renderPage();
    await goToTomorrow(user);

    await user.click(await cell('Cancha 1', '8:00 a. m.'));

    expect(bookingClient.hold).toHaveBeenCalledWith({
      courtId: 'c1',
      start: slotStartIso(TOMORROW, 8),
      end: slotStartIso(TOMORROW, 9),
    });
    const panel = await screen.findByRole('dialog', { name: 'Tu reserva' });
    expect(within(panel).getByText(/^[45]:\d\d$/)).toBeInTheDocument();
    expect(within(panel).getByText(/\$\s35\.000/)).toBeInTheDocument();
    expect(within(panel).getByText('Pagas en recepción al llegar.')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Confirmar reserva' }));

    expect(bookingClient.confirm).toHaveBeenCalledWith({ reservationId: 'r1' });
    expect(
      await within(panel).findByRole('img', { name: 'Reserva confirmada' }),
    ).toBeInTheDocument();
    expect(bookingClient.cancel).not.toHaveBeenCalled();
  });

  it('"Elegir otra hora" releases the hold on the server', async () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1', roles: ['JUGADOR'] } });
    bookingClient.hold.mockResolvedValue({
      reservationId: 'r9',
      holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      priceCop: 35000,
    });
    const user = userEvent.setup();
    renderPage();
    await goToTomorrow(user);
    await user.click(await cell('Cancha 2', '8:00 a. m.'));

    const panel = await screen.findByRole('dialog', { name: 'Tu reserva' });
    await user.click(within(panel).getByRole('button', { name: 'Elegir otra hora' }));

    expect(bookingClient.cancel).toHaveBeenCalledWith('r9');
  });

  it('back from login with the chosen hour: it is preselected and one tap reserves it', async () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1', roles: ['JUGADOR'] } });
    bookingClient.hold.mockResolvedValue({
      reservationId: 'r2',
      holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      priceCop: 35000,
    });
    const user = userEvent.setup();
    renderPage(`/canchas?fecha=${TOMORROW}&cancha=c1&hora=10`);

    const panel = await screen.findByRole('dialog', { name: 'Tu reserva' });
    expect(within(panel).getByText('Cancha 1')).toBeInTheDocument();
    expect(bookingClient.hold).not.toHaveBeenCalled();

    await user.click(within(panel).getByRole('button', { name: 'Reservar esta hora' }));

    expect(bookingClient.hold).toHaveBeenCalledWith(
      expect.objectContaining({ courtId: 'c1', start: slotStartIso(TOMORROW, 10) }),
    );
  });

  it('when the hold runs out, says so and offers to try again', async () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1', roles: ['JUGADOR'] } });
    bookingClient.hold.mockResolvedValue({
      reservationId: 'r3',
      holdExpiresAt: new Date(Date.now() + 1200).toISOString(),
      priceCop: 35000,
    });
    const user = userEvent.setup();
    renderPage();
    await goToTomorrow(user);
    await user.click(await cell('Cancha 1', '8:00 a. m.'));

    expect(
      await screen.findByText(/Se acabó el tiempo para confirmar/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
  });

  it('explains a server rejection in plain words', async () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1', roles: ['JUGADOR'] } });
    bookingClient.hold.mockRejectedValue(
      Object.assign(new Error('conflict'), { status: 409, code: 'slot_not_available' }),
    );
    const user = userEvent.setup();
    renderPage();
    await goToTomorrow(user);
    await user.click(await cell('Cancha 1', '8:00 a. m.'));

    expect(
      await screen.findByText('Alguien acaba de reservar esa hora. Elige otra hora libre.'),
    ).toBeInTheDocument();
  });
});
