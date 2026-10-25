import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { a11yViolations } from '../../test/axe.js';
import { announcementsClient, notificationsClient } from '../api/notificationsClient.js';
import { tournamentClient } from '../api/tournamentClient.js';
import { ToastProvider } from '../components/ui/Toast.jsx';

import { NewsTab } from './mictcj/NewsTab.jsx';
import { NotificationsTab } from './mictcj/NotificationsTab.jsx';
import { AnnouncementsPage } from './staff/AnnouncementsPage.jsx';
import { TournamentPublicPage, matchSummary } from './tournaments/TournamentPublicPage.jsx';
import { TournamentsPublicPage } from './tournaments/TournamentsPublicPage.jsx';
import { UnsubscribePage } from './UnsubscribePage.jsx';

vi.mock('../api/notificationsClient.js', () => ({
  notificationsClient: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    listNews: vi.fn(),
    unsubscribe: vi.fn(),
  },
  announcementsClient: {
    list: vi.fn(),
    preview: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    uploadImage: vi.fn(),
  },
}));
vi.mock('../api/tournamentClient.js', () => ({
  tournamentClient: { listPublic: vi.fn(), getPublic: vi.fn(), listTournaments: vi.fn() },
}));

const CHANNELS = [
  { id: 'APP', label: 'Dentro de la app', available: true },
  { id: 'EMAIL', label: 'Correo', available: true },
  { id: 'PUSH', label: 'En el celular (push)', available: false },
];
const cat = (id, kind, label, on) => ({
  id,
  kind,
  label,
  description: `Descripción de ${label}`,
  channels: { APP: on, EMAIL: on, PUSH: on },
});
const PREFS = {
  categories: [
    cat('RESULTS_NOTES', 'SERVICE', 'Resultados y notas', true),
    cat('MY_TOURNAMENTS', 'SERVICE', 'Torneos en los que participo', true),
    cat('CLUB_NOTICES', 'SERVICE', 'Comunicados del club', true),
    cat('NEW_TOURNAMENTS', 'PROMOTIONAL', 'Nuevos torneos e inscripciones', false),
    cat('PROMOTIONS', 'PROMOTIONAL', 'Promociones', false),
  ],
  channels: CHANNELS,
  dailyDigest: false,
  isMinor: false,
  promotionalLocked: false,
};

function renderAt(path, routePath, element) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Mi CTCJ > Notificaciones', () => {
  it('service on, promotional off, push hidden; a switch saves right away', async () => {
    const user = userEvent.setup();
    notificationsClient.getPreferences.mockResolvedValue(PREFS);
    notificationsClient.updatePreferences.mockImplementation(async () => ({
      ...PREFS,
      categories: PREFS.categories.map((c) =>
        c.id === 'PROMOTIONS' ? { ...c, channels: { ...c.channels, EMAIL: true } } : c,
      ),
    }));
    const { container } = renderAt('/n', '/n', <NotificationsTab />);
    const promoEmail = await screen.findByRole('switch', { name: 'Promociones Correo' });
    expect(promoEmail).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: 'Resultados y notas Correo' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.queryByText('En el celular (push)')).not.toBeInTheDocument();
    expect(await a11yViolations(container)).toEqual([]);

    await user.click(promoEmail);
    expect(notificationsClient.updatePreferences).toHaveBeenCalledWith({
      categories: { PROMOTIONS: { EMAIL: true } },
    });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Promociones Correo' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
  });

  it('a minor: promotional switches are the guardian’s', async () => {
    notificationsClient.getPreferences.mockResolvedValue({
      ...PREFS,
      isMinor: true,
      promotionalLocked: true,
    });
    renderAt('/n', '/n', <NotificationsTab />);
    expect(await screen.findByText(/las decide tu acudiente/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Promociones Correo' })).toBeDisabled();
  });
});

describe('Mi CTCJ > Novedades', () => {
  it('shows the announcements with their format and the image alt text', async () => {
    notificationsClient.listNews.mockResolvedValue({
      news: [
        {
          id: 'n1',
          title: 'Canchas cerradas',
          body: '**Hoy** no hay juego.\n\n- Cancha 1',
          imageUrl: '/uploads/announcements/x.webp',
          imageAlt: 'Canchas bajo la lluvia',
          kind: 'SERVICE',
          publishedAt: '2026-10-05T14:00:00Z',
        },
      ],
    });
    const { container } = renderAt('/n', '/n', <NewsTab />);
    expect(await screen.findByRole('heading', { name: 'Canchas cerradas' })).toBeInTheDocument();
    expect(screen.getByText('Hoy').tagName).toBe('STRONG');
    expect(screen.getByRole('img', { name: 'Canchas bajo la lluvia' })).toBeInTheDocument();
    expect(await a11yViolations(container)).toEqual([]);
  });
});

describe('/notificaciones/baja', () => {
  it('one click from the email: done, without login', async () => {
    notificationsClient.unsubscribe.mockResolvedValue({ label: 'Promociones', changed: true });
    renderAt('/notificaciones/baja?t=abc.def', '/notificaciones/baja', <UnsubscribePage />);
    expect(await screen.findByRole('heading', { name: /ya no te enviaremos/ })).toBeInTheDocument();
    expect(notificationsClient.unsubscribe).toHaveBeenCalledTimes(1);
    expect(notificationsClient.unsubscribe).toHaveBeenCalledWith('abc.def');
    expect(screen.getByText(/"Promociones"/)).toBeInTheDocument();
  });

  it('a broken link says so', async () => {
    notificationsClient.unsubscribe.mockRejectedValue(new Error('bad'));
    renderAt('/notificaciones/baja?t=x', '/notificaciones/baja', <UnsubscribePage />);
    expect(await screen.findByRole('heading', { name: /No pudimos usar/ })).toBeInTheDocument();
  });
});

const PUBLIC = {
  tournament: {
    id: 't1',
    name: 'Copa Octubre',
    category: 'CUARTA',
    modality: 'SINGLES',
    status: 'IN_PROGRESS',
    startsOn: '2026-10-12',
    endsOn: '2026-10-20',
    champion: null,
  },
  participants: [
    { seed: 1, names: ['Ana Gómez'] },
    { seed: 2, names: ['Lucía R.'] },
    { seed: 3, names: ['Pedro Díaz'] },
  ],
  rounds: [
    {
      round: 1,
      name: 'Semifinal',
      matches: [
        {
          id: 'm1',
          slot: 0,
          a: { seed: 1, names: ['Ana Gómez'] },
          b: null,
          winner: 'A',
          score: null,
          bye: true,
          scheduledAt: null,
          courtName: null,
          playedAt: null,
        },
        {
          id: 'm2',
          slot: 1,
          a: { seed: 2, names: ['Lucía R.'] },
          b: { seed: 3, names: ['Pedro Díaz'] },
          winner: 'B',
          score: '0-2',
          bye: false,
          scheduledAt: null,
          courtName: null,
          playedAt: '2026-10-12',
        },
      ],
    },
    {
      round: 2,
      name: 'Final',
      matches: [
        {
          id: 'm3',
          slot: 0,
          a: { seed: 1, names: ['Ana Gómez'] },
          b: { seed: 3, names: ['Pedro Díaz'] },
          winner: null,
          score: null,
          bye: false,
          scheduledAt: '2026-10-20T14:00:00Z',
          courtName: 'Cancha 1',
          playedAt: null,
        },
      ],
    },
  ],
};

describe('/torneos', () => {
  it('lists the tournaments by state, with links to each one', async () => {
    tournamentClient.listPublic.mockResolvedValue({
      tournaments: [
        { ...PUBLIC.tournament, status: 'OPEN', id: 'o1', name: 'Abierto de Noviembre' },
        PUBLIC.tournament,
      ],
    });
    const { container } = renderAt('/torneos', '/torneos', <TournamentsPublicPage />);
    expect(
      await screen.findByRole('heading', { name: /Inscripciones abiertas/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /En curso/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abierto de Noviembre/ })).toHaveAttribute(
      'href',
      '/torneos/o1',
    );
    expect(await a11yViolations(container)).toEqual([]);
  });

  it('a tournament: brackets in their own scrollable, focusable region; names only', async () => {
    tournamentClient.getPublic.mockResolvedValue(PUBLIC);
    const { container } = renderAt('/torneos/t1', '/torneos/:id', <TournamentPublicPage />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /Copa Octubre/ }),
    ).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Cuadros por ronda' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(
      within(region).getByText(/Lucía R\. contra Pedro Díaz: ganó Pedro Díaz, 0-2 en sets/),
    ).toBeInTheDocument();
    expect(within(region).getByText(/Ana Gómez pasa directo/)).toBeInTheDocument();
    expect(within(region).getByText(/Cancha: Cancha 1/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/@|\+57/);
    expect(await a11yViolations(container)).toEqual([]);
  });

  it('describes a match not yet defined', () => {
    expect(matchSummary({ a: { names: ['Ana'] }, b: null, winner: null, bye: false })).toMatch(
      /Por definir/,
    );
  });
});

describe('/staff/comunicados', () => {
  const PREVIEW = {
    audience: 10,
    recipients: 7,
    excluded: 3,
    byApp: 7,
    byEmail: 5,
    timeAllowed: false,
    suggestedTime: '2026-10-05T12:00:00.000Z',
    email: { subject: 'Torneo relámpago', html: '<p>Hola</p>', text: 'Hola' },
    app: { title: 'Torneo relámpago', body: 'Este sábado' },
  };

  beforeEach(() => {
    announcementsClient.list.mockResolvedValue({ announcements: [], waitingForQuota: 2 });
    tournamentClient.listTournaments.mockResolvedValue({ tournaments: [] });
    announcementsClient.preview.mockResolvedValue(PREVIEW);
    announcementsClient.create.mockResolvedValue({ id: 'a1', status: 'SCHEDULED' });
  });

  it('preview with counts and the next allowed time; confirm before sending', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/c', '/c', <AnnouncementsPage />);
    expect(await screen.findByText(/2 correos esperan al día siguiente/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Título/), 'Torneo relámpago');
    await user.type(screen.getByLabelText(/^Texto/), 'Este sábado');
    await user.click(screen.getByRole('radio', { name: 'Promocional' }));
    // "Enviar" stays disabled until the preview is seen.
    expect(screen.getByRole('button', { name: 'Enviar…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }));

    expect(await screen.findByText(/no lo recibirán por sus preferencias/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pueden enviar promociones/);
    expect(screen.getByTitle('Vista previa del correo')).toBeInTheDocument();
    expect(await a11yViolations(container)).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Programar a esa hora' }));
    expect(screen.getByLabelText(/Fecha y hora/)).toHaveValue('2026-10-05T07:00');
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Programar…' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Programar…' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/Lo recibirán 7 personas/);
    await user.click(screen.getByRole('button', { name: 'Sí, programar' }));
    expect(announcementsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Torneo relámpago',
        kind: 'PROMOTIONAL',
        audienceType: 'ALL',
        scheduledFor: '2026-10-05T07:00:00-05:00',
      }),
    );
  });

  it('an image needs its description', async () => {
    const user = userEvent.setup();
    announcementsClient.uploadImage.mockResolvedValue({ url: '/uploads/announcements/x.webp' });
    renderAt('/c', '/c', <AnnouncementsPage />);
    await screen.findByText(/correos esperan/);
    await user.type(screen.getByLabelText(/Título/), 'Con foto');
    await user.type(screen.getByLabelText(/^Texto/), 'Hola');
    await user.click(screen.getByRole('radio', { name: 'Servicio' }));
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/JPG, PNG o WebP/), file);
    await screen.findByRole('button', { name: 'Quitar imagen' });
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    expect(
      await screen.findByText('Describe la imagen para quien no puede verla.'),
    ).toBeInTheDocument();
    expect(announcementsClient.preview).not.toHaveBeenCalled();
  });
});
