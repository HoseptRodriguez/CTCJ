import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clinicalClient } from '../../api/clinicalClient.js';
import { membershipClient } from '../../api/membershipClient.js';
import { ToastProvider } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { clubTodayKey } from '../../lib/clubTime.js';

import { ClinicalPage } from './ClinicalPage.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/membershipClient.js', () => ({
  membershipClient: { lookupUser: vi.fn(), searchPlayers: vi.fn() },
}));
vi.mock('../../api/clinicalClient.js', () => ({
  clinicalClient: {
    listAppointments: vi.fn(),
    scheduleAppointment: vi.fn(),
    cancelAppointment: vi.fn(),
    markCompleted: vi.fn(),
    markNoShow: vi.fn(),
    listPlayerNotes: vi.fn(),
    createNote: vi.fn(),
    listRecoveryPlans: vi.fn(),
    createRecoveryPlan: vi.fn(),
    completeRecoveryPlan: vi.fn(),
    discontinueRecoveryPlan: vi.fn(),
    listMedicalHistory: vi.fn(),
    createMedicalHistoryEntry: vi.fn(),
    resolveMedicalHistoryEntry: vi.fn(),
  },
}));

const today = clubTodayKey();
const at = (hh) => new Date(`${today}T${hh}:00-05:00`).toISOString();
const PLAYER_ID = '11111111-1111-4111-8111-111111111111';
const PRACTITIONER_ID = '22222222-2222-4222-8222-222222222222';

const APPOINTMENTS = [
  {
    id: 'a1',
    playerId: PLAYER_ID,
    playerName: 'Ana Gómez',
    practitionerName: 'Laura Psico',
    discipline: 'PSYCHOLOGY',
    status: 'SCHEDULED',
    periodStart: at('09:00'),
    periodEnd: at('10:00'),
  },
  {
    id: 'a2',
    playerId: 'p2',
    playerName: 'Luis Paz',
    practitionerName: 'Pedro Fisio',
    discipline: 'PHYSIOTHERAPY',
    status: 'SCHEDULED',
    periodStart: at('11:00'),
    periodEnd: at('12:00'),
  },
];

function renderAs(roles, path = '/staff/clinico') {
  useAuth.mockReturnValue({ user: { id: PRACTITIONER_ID, roles: ['USUARIO', ...roles] } });
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <ClinicalPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}
const withPlayer = `/staff/clinico?jugador=${PLAYER_ID}&nombre=Ana%20G%C3%B3mez`;

beforeEach(() => {
  vi.clearAllMocks();
  clinicalClient.listAppointments.mockResolvedValue({ appointments: APPOINTMENTS });
  clinicalClient.listPlayerNotes.mockResolvedValue({ notes: [] });
  clinicalClient.listRecoveryPlans.mockResolvedValue({ plans: [] });
  clinicalClient.listMedicalHistory.mockResolvedValue({ entries: [] });
  membershipClient.searchPlayers.mockResolvedValue({
    players: [{ id: PLAYER_ID, firstName: 'Ana', lastName: 'Gómez' }],
  });
});

describe('ClinicalPage (Salud y bienestar)', () => {
  it('Recepción: agenda only, one tab per discipline, and never note content', async () => {
    renderAs(['RECEPCION'], withPlayer);
    expect(screen.getByText('Información confidencial de salud')).toBeInTheDocument();
    expect(screen.getByText(/Aquí ves solo la agenda/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Psicología' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Fisioterapia' })).toBeInTheDocument();

    const agenda = await screen.findByRole('list', { name: 'Citas de psicología' });
    expect(within(agenda).getByText('Ana Gómez')).toBeInTheDocument();
    expect(within(agenda).queryByText('Luis Paz')).not.toBeInTheDocument();
    // Front desk can cancel but not mark outcomes.
    expect(within(agenda).getByRole('button', { name: 'Cancelar cita' })).toBeInTheDocument();
    expect(within(agenda).queryByRole('button', { name: 'Asistió' })).not.toBeInTheDocument();

    // Even with a player open: appointments only, no notes.
    expect(await screen.findByRole('heading', { name: 'Citas del jugador' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Notas' })).not.toBeInTheDocument();
    expect(clinicalClient.listPlayerNotes).not.toHaveBeenCalled();
  });

  it('Administrador: can mark outcomes, still no notes', async () => {
    renderAs(['ADMINISTRADOR'], withPlayer);
    const agenda = await screen.findByRole('list', { name: 'Citas de psicología' });
    expect(within(agenda).getByRole('button', { name: 'Asistió' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Citas del jugador' });
    expect(screen.queryByRole('tab', { name: 'Notas' })).not.toBeInTheDocument();
    expect(clinicalClient.listPlayerNotes).not.toHaveBeenCalled();
  });

  it('Psicólogo: only the psychology agenda; the file has Citas and Notas, no physio tabs', async () => {
    renderAs(['PSICOLOGO'], withPlayer);
    expect(screen.queryByRole('tab', { name: 'Fisioterapia' })).not.toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Notas' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Planes de recuperación' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Historial médico' })).not.toBeInTheDocument();
  });

  it('Fisioterapeuta: the file adds Planes de recuperación and Historial médico', async () => {
    renderAs(['FISIOTERAPEUTA'], withPlayer);
    expect(await screen.findByRole('tab', { name: 'Planes de recuperación' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historial médico' })).toBeInTheDocument();
    const agenda = await screen.findByRole('list', { name: 'Citas de fisioterapia' });
    expect(within(agenda).getByText('Luis Paz')).toBeInTheDocument();
  });

  it('Psicólogo writes a note choosing who can see it', async () => {
    clinicalClient.createNote.mockResolvedValue({
      id: 'n1',
      noteType: 'FOLLOW_UP',
      visibility: 'PRIVATE',
      content: 'Buen avance.',
      createdAt: new Date().toISOString(),
    });
    const user = userEvent.setup();
    renderAs(['PSICOLOGO'], withPlayer);
    await user.click(await screen.findByRole('tab', { name: 'Notas' }));
    await user.click(await screen.findByRole('radio', { name: 'Seguimiento' }));
    await user.type(screen.getByLabelText('Nota'), 'Buen avance.');
    await user.click(screen.getByRole('radio', { name: /Solo psicología/ }));
    expect(
      screen.getByText('Las notas no se pueden editar después de guardarlas.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(clinicalClient.createNote).toHaveBeenCalledWith(PLAYER_ID, {
      noteType: 'FOLLOW_UP',
      visibility: 'PRIVATE',
      content: 'Buen avance.',
    });
    expect(await screen.findByText('Buen avance.', { selector: 'p' })).toBeInTheDocument();
  });

  it('cancelling asks for a reason first', async () => {
    clinicalClient.cancelAppointment.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['RECEPCION']);
    const agenda = await screen.findByRole('list', { name: 'Citas de psicología' });
    await user.click(within(agenda).getByRole('button', { name: 'Cancelar cita' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Cancelar la cita?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar cita' }));
    expect(await within(dialog).findByText('Escribe el motivo.')).toBeInTheDocument();
    expect(clinicalClient.cancelAppointment).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText('Motivo'), 'El jugador está enfermo');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar cita' }));
    await waitFor(() =>
      expect(clinicalClient.cancelAppointment).toHaveBeenCalledWith(
        'a1',
        'El jugador está enfermo',
      ),
    );
  });

  it('Recepción schedules by resolving the practitioner e-mail', async () => {
    clinicalClient.scheduleAppointment.mockResolvedValue({});
    membershipClient.lookupUser.mockResolvedValue({ id: PRACTITIONER_ID });
    const user = userEvent.setup();
    renderAs(['RECEPCION'], withPlayer);
    await screen.findByRole('list', { name: 'Citas de psicología' });
    await user.click(screen.getByRole('button', { name: 'Nueva cita' }));
    const panel = await screen.findByRole('dialog', { name: 'Nueva cita' });
    await user.type(within(panel).getByLabelText(/Correo del profesional/), 'laura@club.co');
    await user.type(within(panel).getByLabelText('Hora de inicio'), '09:00');
    await user.type(within(panel).getByLabelText('Hora de fin'), '10:00');
    await user.click(within(panel).getByRole('button', { name: 'Agendar cita' }));
    await waitFor(() =>
      expect(clinicalClient.scheduleAppointment).toHaveBeenCalledWith({
        playerId: PLAYER_ID,
        practitionerId: PRACTITIONER_ID,
        start: `${today}T09:00:00-05:00`,
        end: `${today}T10:00:00-05:00`,
      }),
    );
    expect(membershipClient.lookupUser).toHaveBeenCalledWith('laura@club.co');
  });

  it('Fisioterapeuta creates a recovery plan', async () => {
    clinicalClient.createRecoveryPlan.mockResolvedValue({});
    const user = userEvent.setup();
    renderAs(['FISIOTERAPEUTA'], withPlayer);
    await user.click(await screen.findByRole('tab', { name: 'Planes de recuperación' }));
    await user.type(await screen.findByLabelText(/Nombre del plan/), 'Tobillo');
    await user.click(screen.getByRole('radio', { name: /La ve el jugador/ }));
    await user.click(screen.getByRole('button', { name: 'Crear plan' }));
    expect(clinicalClient.createRecoveryPlan).toHaveBeenCalledWith(PLAYER_ID, {
      title: 'Tobillo',
      goal: undefined,
      visibility: 'PLAYER_VISIBLE',
    });
  });
});
