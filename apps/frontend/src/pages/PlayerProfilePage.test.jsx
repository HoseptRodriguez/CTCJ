import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { coachingClient } from '../api/coachingClient.js';
import { competitionClient } from '../api/competitionClient.js';
import { goalsClient } from '../api/goalsClient.js';
import { membershipClient } from '../api/membershipClient.js';

import { PlayerProfilePage } from './PlayerProfilePage.jsx';

vi.mock('../api/membershipClient.js', () => ({
  membershipClient: {
    getMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
    uploadMyAvatar: vi.fn(),
    getMyAchievements: vi.fn(),
  },
}));

vi.mock('../api/goalsClient.js', () => ({
  goalsClient: { createGoal: vi.fn(), getMyGoals: vi.fn(), abandonGoal: vi.fn() },
}));

vi.mock('../api/competitionClient.js', () => ({
  competitionClient: { getMyCompetitionSummary: vi.fn() },
}));

vi.mock('../api/coachingClient.js', () => ({
  coachingClient: { getMyPerformance: vi.fn() },
}));

const PROFILE = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Gomez',
  email: 'ana@example.com',
  phone: null,
  birthDate: null,
  bio: null,
  avatarUrl: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <PlayerProfilePage />
    </MemoryRouter>,
  );
}

describe('PlayerProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom doesn't implement this -- AvatarSection's preview relies on it.
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    membershipClient.getMyProfile.mockResolvedValue(PROFILE);
    membershipClient.getMyAchievements.mockResolvedValue({
      badges: [
        { code: 'FIRST_WIN', label: 'Primera victoria', earned: true },
        { code: 'TEN_WINS', label: '10 victorias', earned: false },
      ],
    });
    goalsClient.getMyGoals.mockResolvedValue({ goals: [] });
    competitionClient.getMyCompetitionSummary.mockResolvedValue({
      hasSeason: false,
      categories: [],
      recentMatches: [],
    });
    coachingClient.getMyPerformance.mockResolvedValue({
      ratings: [],
      summary: { ratedAreas: [], latestByArea: {}, progressByArea: {} },
    });
  });

  it('shows an avatar placeholder with the first initial when no avatar is set', async () => {
    renderPage();
    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('pre-fills and submits the personal info form', async () => {
    const user = userEvent.setup();
    membershipClient.updateMyProfile.mockResolvedValue({ ...PROFILE, phone: '3001234567' });
    renderPage();

    const phoneInput = await screen.findByLabelText('Teléfono');
    await user.type(phoneInput, '3001234567');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(membershipClient.updateMyProfile).toHaveBeenCalledWith({
        phone: '3001234567',
        birthDate: null,
        bio: null,
      }),
    );
    expect(await screen.findByText('Perfil actualizado.')).toBeInTheDocument();
  });

  it('uploads a new avatar and shows it once done', async () => {
    membershipClient.uploadMyAvatar.mockResolvedValue({ avatarUrl: '/uploads/avatars/x.jpg' });
    const { container } = renderPage();
    await screen.findByText('A');

    const file = new File(['fake'], 'foto.jpg', { type: 'image/jpeg' });
    const fileInput = container.querySelector('input[type="file"]');
    const user = userEvent.setup();
    await user.upload(fileInput, file);

    await waitFor(() => expect(membershipClient.uploadMyAvatar).toHaveBeenCalledWith(file));
    // Shows the local blob preview immediately rather than waiting on a
    // round-trip -- the upload having resolved successfully (asserted
    // above) is what matters, not which URL the <img> currently points to.
    expect(await screen.findByAltText('Tu foto de perfil')).toBeInTheDocument();
  });

  it('shows the achievements grid with earned/locked states', async () => {
    renderPage();

    expect(await screen.findByText('Primera victoria')).toBeInTheDocument();
    expect(screen.getAllByText('Obtenido')).toHaveLength(1);
    expect(screen.getAllByText('Pendiente')).toHaveLength(1);
  });

  it('creates a goal and refreshes the list', async () => {
    const user = userEvent.setup();
    goalsClient.createGoal.mockResolvedValue({ id: 'goal-1' });
    renderPage();

    await user.type(await screen.findByLabelText('Título de la meta'), 'Reach Category 2');
    await user.click(screen.getByRole('button', { name: 'Agregar meta' }));

    await waitFor(() =>
      expect(goalsClient.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Reach Category 2', metricType: 'CUSTOM' }),
      ),
    );
    expect(goalsClient.getMyGoals).toHaveBeenCalledTimes(2);
  });

  it('lists existing goals and abandons one', async () => {
    const user = userEvent.setup();
    goalsClient.getMyGoals.mockResolvedValue({
      goals: [
        {
          id: 'goal-1',
          title: 'Saque a 8',
          metricType: 'SKILL_RATING',
          status: 'ACTIVE',
          currentProgress: 6,
          percentComplete: 75,
        },
      ],
    });
    goalsClient.abandonGoal.mockResolvedValue({ id: 'goal-1', status: 'ABANDONED' });

    renderPage();

    expect(await screen.findByText('Saque a 8')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abandonar' }));

    await waitFor(() => expect(goalsClient.abandonGoal).toHaveBeenCalledWith('goal-1'));
  });
});
