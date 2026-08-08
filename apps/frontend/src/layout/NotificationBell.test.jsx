import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notificationsClient } from '../api/notificationsClient.js';

import { NotificationBell } from './NotificationBell.jsx';

vi.mock('../api/notificationsClient.js', () => ({
  notificationsClient: {
    getMyNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

function renderBell() {
  return render(
    <MemoryRouter initialEntries={['/mi-ctcj']}>
      <NotificationBell />
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

function CurrentPath() {
  return null;
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows no unread badge when there are no unread notifications', async () => {
    notificationsClient.getMyNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });

    renderBell();

    await waitFor(() => expect(notificationsClient.getMyNotifications).toHaveBeenCalled());
    expect(screen.queryByText('9+')).not.toBeInTheDocument();
  });

  it('shows the unread count badge', async () => {
    notificationsClient.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          id: 'n1',
          type: 'CHALLENGE_RECEIVED',
          title: 'Nuevo reto',
          body: 'Ana te retó.',
          readAt: null,
          createdAt: '2026-08-13T10:00:00.000Z',
          linkPath: '/mi-ctcj',
        },
      ],
      unreadCount: 1,
    });

    renderBell();

    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('opens the dropdown and shows the empty state', async () => {
    notificationsClient.getMyNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
    const user = userEvent.setup();

    renderBell();
    await waitFor(() => expect(notificationsClient.getMyNotifications).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Notificaciones' }));

    expect(await screen.findByText('Sin notificaciones.')).toBeInTheDocument();
  });

  it('clicking an unread notification marks it read and refreshes', async () => {
    notificationsClient.getMyNotifications
      .mockResolvedValueOnce({
        notifications: [
          {
            id: 'n1',
            type: 'CHALLENGE_RECEIVED',
            title: 'Nuevo reto',
            body: 'Ana te retó.',
            readAt: null,
            createdAt: '2026-08-13T10:00:00.000Z',
            linkPath: '/mi-ctcj',
          },
        ],
        unreadCount: 1,
      })
      .mockResolvedValue({
        notifications: [
          {
            id: 'n1',
            type: 'CHALLENGE_RECEIVED',
            title: 'Nuevo reto',
            body: 'Ana te retó.',
            readAt: '2026-08-13T11:00:00.000Z',
            createdAt: '2026-08-13T10:00:00.000Z',
            linkPath: '/mi-ctcj',
          },
        ],
        unreadCount: 0,
      });
    notificationsClient.markNotificationRead.mockResolvedValue({});
    const user = userEvent.setup();

    renderBell();
    await screen.findByText('1');
    await user.click(screen.getByRole('button', { name: /Notificaciones/ }));
    await user.click(await screen.findByText('Nuevo reto'));

    await waitFor(() =>
      expect(notificationsClient.markNotificationRead).toHaveBeenCalledWith('n1'),
    );
  });
});
