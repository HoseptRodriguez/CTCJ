import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateNotification } from '../../../../src/modules/notifications/application/useCases/createNotification.js';
import { createListMyNotifications } from '../../../../src/modules/notifications/application/useCases/listMyNotifications.js';
import { createMarkNotificationRead } from '../../../../src/modules/notifications/application/useCases/markNotificationRead.js';
import { createMarkAllNotificationsRead } from '../../../../src/modules/notifications/application/useCases/markAllNotificationsRead.js';
import { NotificationNotFound } from '../../../../src/modules/notifications/application/errors/NotificationNotFound.js';

import { createFakeNotificationRepository, createFakeClock } from './fakes.js';

const NOW = new Date('2026-08-13T10:00:00Z');

function buildDeps() {
  return {
    notificationRepository: createFakeNotificationRepository(),
    clock: createFakeClock(NOW),
  };
}

describe('createNotification', () => {
  it('creates a notification for the recipient', async () => {
    const deps = buildDeps();
    const createNotification = createCreateNotification(deps);

    const result = await createNotification({
      recipientId: 'player-1',
      type: 'CHALLENGE_RECEIVED',
      title: 'Nuevo reto',
      body: 'Ana te retó a un partido.',
      linkPath: '/mi-ctcj',
    });

    expect(result).toMatchObject({
      recipientId: 'player-1',
      type: 'CHALLENGE_RECEIVED',
      title: 'Nuevo reto',
      body: 'Ana te retó a un partido.',
      linkPath: '/mi-ctcj',
      readAt: null,
    });
  });
});

describe('listMyNotifications', () => {
  it('returns recent notifications and a separate unread count', async () => {
    const deps = buildDeps();
    const createNotification = createCreateNotification(deps);
    const listMyNotifications = createListMyNotifications(deps);

    await createNotification({ recipientId: 'player-1', type: 'CHALLENGE_RECEIVED', title: 'A' });
    const second = await createNotification({
      recipientId: 'player-1',
      type: 'CHALLENGE_ACCEPTED',
      title: 'B',
    });
    await deps.notificationRepository.markRead(second.id, NOW);

    const result = await listMyNotifications({ recipientId: 'player-1' });

    expect(result.notifications).toHaveLength(2);
    expect(result.unreadCount).toBe(1);
  });

  it('scopes strictly to the caller', async () => {
    const deps = buildDeps();
    const createNotification = createCreateNotification(deps);
    const listMyNotifications = createListMyNotifications(deps);

    await createNotification({
      recipientId: 'other-player',
      type: 'CHALLENGE_RECEIVED',
      title: 'A',
    });

    const result = await listMyNotifications({ recipientId: 'player-1' });

    expect(result.notifications).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
  });
});

describe('markNotificationRead', () => {
  let deps;
  let createNotification;
  let markNotificationRead;

  beforeEach(() => {
    deps = buildDeps();
    createNotification = createCreateNotification(deps);
    markNotificationRead = createMarkNotificationRead(deps);
  });

  it('marks an owned notification read', async () => {
    const notification = await createNotification({
      recipientId: 'player-1',
      type: 'CHALLENGE_RECEIVED',
      title: 'A',
    });

    const result = await markNotificationRead({
      recipientId: 'player-1',
      notificationId: notification.id,
    });

    expect(result.readAt).toBe(NOW);
  });

  it('is idempotent -- marking an already-read notification again is a no-op', async () => {
    const notification = await createNotification({
      recipientId: 'player-1',
      type: 'CHALLENGE_RECEIVED',
      title: 'A',
    });
    await markNotificationRead({ recipientId: 'player-1', notificationId: notification.id });
    deps.clock.set(new Date('2026-08-14T10:00:00Z'));

    const result = await markNotificationRead({
      recipientId: 'player-1',
      notificationId: notification.id,
    });

    expect(result.readAt).toBe(NOW); // unchanged, not bumped to the later clock time
  });

  it('throws NotificationNotFound for a notification belonging to someone else', async () => {
    const notification = await createNotification({
      recipientId: 'player-1',
      type: 'CHALLENGE_RECEIVED',
      title: 'A',
    });

    await expect(
      markNotificationRead({ recipientId: 'someone-else', notificationId: notification.id }),
    ).rejects.toThrow(NotificationNotFound);
  });

  it('throws NotificationNotFound for a nonexistent id', async () => {
    await expect(
      markNotificationRead({ recipientId: 'player-1', notificationId: 'does-not-exist' }),
    ).rejects.toThrow(NotificationNotFound);
  });
});

describe('markAllNotificationsRead', () => {
  it('marks every unread notification for the recipient read', async () => {
    const deps = buildDeps();
    const createNotification = createCreateNotification(deps);
    const listMyNotifications = createListMyNotifications(deps);
    const markAllNotificationsRead = createMarkAllNotificationsRead(deps);

    await createNotification({ recipientId: 'player-1', type: 'CHALLENGE_RECEIVED', title: 'A' });
    await createNotification({ recipientId: 'player-1', type: 'CHALLENGE_ACCEPTED', title: 'B' });

    await markAllNotificationsRead({ recipientId: 'player-1' });

    const result = await listMyNotifications({ recipientId: 'player-1' });
    expect(result.unreadCount).toBe(0);
  });
});
