import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clinicalClient } from '../../api/clinicalClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

import { ClinicalPage } from './ClinicalPage.jsx';

vi.mock('../../api/clinicalClient.js', () => ({
  clinicalClient: {
    scheduleAppointment: vi.fn(),
    cancelAppointment: vi.fn(),
    markCompleted: vi.fn(),
    markNoShow: vi.fn(),
    listAppointments: vi.fn(),
    createNote: vi.fn(),
    listPlayerNotes: vi.fn(),
    getMyAppointments: vi.fn(),
    getMyNotes: vi.fn(),
  },
}));

vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn() },
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const PSICOLOGO_USER = { user: { id: 'psych-1', roles: ['USUARIO', 'PSICOLOGO'] } };
const RECEPCION_USER = { user: { id: 'staff-1', roles: ['USUARIO', 'RECEPCION'] } };
const ADMIN_USER = { user: { id: 'admin-1', roles: ['USUARIO', 'ADMINISTRADOR'] } };

const PLAYER = {
  id: 'user-1',
  email: 'jugador@example.com',
  firstName: 'Ana',
  lastName: 'Gomez',
  roleCodes: ['USUARIO', 'JUGADOR'],
};
const NOT_A_PLAYER = { ...PLAYER, id: 'user-2', roleCodes: ['USUARIO'] };
const PRACTITIONER = {
  id: 'psych-1',
  email: 'dra@example.com',
  firstName: 'Dra. Sofia',
  lastName: 'Reyes',
};

async function searchFor(user, email) {
  await user.type(screen.getByLabelText('Correo del jugador'), email);
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
}

describe('ClinicalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clinicalClient.listAppointments.mockResolvedValue({ appointments: [] });
    clinicalClient.listPlayerNotes.mockResolvedValue({ notes: [] });
  });

  it('shows appointment scheduling for a JUGADOR target, RECEPCION cannot see the Notas tab', async () => {
    useAuth.mockReturnValue(RECEPCION_USER);
    membershipClient.lookupUser.mockResolvedValue(PLAYER);

    const user = userEvent.setup();
    render(<ClinicalPage />);
    await searchFor(user, PLAYER.email);

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Citas' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Notas' })).not.toBeInTheDocument();
  });

  it('shows the Notas tab for a PSICOLOGO', async () => {
    useAuth.mockReturnValue(PSICOLOGO_USER);
    membershipClient.lookupUser.mockResolvedValue(PLAYER);

    const user = userEvent.setup();
    render(<ClinicalPage />);
    await searchFor(user, PLAYER.email);

    expect(await screen.findByRole('tab', { name: 'Notas' })).toBeInTheDocument();
  });

  it('does not show the Notas tab for ADMINISTRADOR (excluded from note content)', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    membershipClient.lookupUser.mockResolvedValue(PLAYER);

    const user = userEvent.setup();
    render(<ClinicalPage />);
    await searchFor(user, PLAYER.email);

    await screen.findByText('Ana Gomez');
    expect(screen.queryByRole('tab', { name: 'Notas' })).not.toBeInTheDocument();
  });

  it('shows an error for a non-JUGADOR target', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    membershipClient.lookupUser.mockResolvedValue(NOT_A_PLAYER);

    const user = userEvent.setup();
    render(<ClinicalPage />);
    await searchFor(user, NOT_A_PLAYER.email);

    expect(await screen.findByText('Este usuario no tiene el rol Jugador.')).toBeInTheDocument();
  });

  it('schedules an appointment by resolving the practitioner email', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    membershipClient.lookupUser.mockResolvedValueOnce(PLAYER).mockResolvedValueOnce(PRACTITIONER);
    clinicalClient.scheduleAppointment.mockResolvedValue({ id: 'appt-1', status: 'SCHEDULED' });

    const user = userEvent.setup();
    render(<ClinicalPage />);
    await searchFor(user, PLAYER.email);
    await screen.findByText('Sin citas todavía.');

    await user.type(screen.getByLabelText('Correo del profesional'), PRACTITIONER.email);
    await user.type(screen.getByLabelText('Fecha'), '2026-03-01');
    await user.type(screen.getByLabelText('Hora inicio'), '10:00');
    await user.type(screen.getByLabelText('Hora fin'), '11:00');
    await user.click(screen.getByRole('button', { name: 'Agendar cita' }));

    await waitFor(() =>
      expect(clinicalClient.scheduleAppointment).toHaveBeenCalledWith({
        playerId: 'user-1',
        practitionerId: 'psych-1',
        start: '2026-03-01T10:00:00-05:00',
        end: '2026-03-01T11:00:00-05:00',
      }),
    );
  });

  it('creates a note as PSICOLOGO and refreshes the list', async () => {
    useAuth.mockReturnValue(PSICOLOGO_USER);
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    clinicalClient.createNote.mockResolvedValue({ id: 'note-1' });

    const user = userEvent.setup();
    render(<ClinicalPage />);
    await searchFor(user, PLAYER.email);
    await user.click(await screen.findByRole('tab', { name: 'Notas' }));
    await waitFor(() => expect(clinicalClient.listPlayerNotes).toHaveBeenCalledWith('user-1'));

    await user.selectOptions(screen.getByLabelText('Tipo'), 'RECOMMENDATION');
    await user.selectOptions(screen.getByLabelText('Visibilidad'), 'PLAYER_VISIBLE');
    await user.type(screen.getByLabelText('Nota'), 'Sigue practicando la respiración.');
    await user.click(screen.getByRole('button', { name: 'Agregar nota' }));

    await waitFor(() =>
      expect(clinicalClient.createNote).toHaveBeenCalledWith('user-1', {
        noteType: 'RECOMMENDATION',
        visibility: 'PLAYER_VISIBLE',
        content: 'Sigue practicando la respiración.',
      }),
    );
  });

  it('cancels a scheduled appointment with a reason', async () => {
    useAuth.mockReturnValue(ADMIN_USER);
    membershipClient.lookupUser.mockResolvedValue(PLAYER);
    clinicalClient.listAppointments.mockResolvedValue({
      appointments: [
        {
          id: 'appt-1',
          status: 'SCHEDULED',
          periodStart: '2026-03-01T15:00:00.000Z',
          practitionerName: 'Dra. Sofia Reyes',
        },
      ],
    });
    vi.spyOn(window, 'prompt').mockReturnValue('jugador no puede asistir');
    clinicalClient.cancelAppointment.mockResolvedValue({ id: 'appt-1', status: 'CANCELLED' });

    const user = userEvent.setup();
    render(<ClinicalPage />);
    await searchFor(user, PLAYER.email);
    await screen.findByText(/Dra. Sofia Reyes/);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(clinicalClient.cancelAppointment).toHaveBeenCalledWith(
        'appt-1',
        'jugador no puede asistir',
      ),
    );
  });
});
