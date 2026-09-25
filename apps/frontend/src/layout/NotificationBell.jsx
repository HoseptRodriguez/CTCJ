import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { notificationsClient } from '../api/notificationsClient.js';
import { BellIcon } from '../components/icons/BellIcon.jsx';
import { cn } from '../components/ui/cn.js';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/**
 * Notification bell for any logged-in user (public header, Mi CTCJ, staff
 * console). The only icon-only control allowed in the app: it carries an
 * aria-label that includes the unread count. Amber counter with navy text.
 *
 * @param {{ tone?: 'light'|'dark' }} props -- the surface it sits on.
 */
export function NotificationBell({ tone = 'light' }) {
  const [notifications, setNotifications] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  function refetch() {
    return notificationsClient
      .getMyNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      });
  }

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function handleNotificationClick(notification) {
    if (!notification.readAt) {
      try {
        await notificationsClient.markNotificationRead(notification.id);
        await refetch();
      } catch {
        // Still navigate: failing to mark it read shouldn't block the link.
      }
    }
    setOpen(false);
    if (notification.linkPath) {
      navigate(notification.linkPath);
    }
  }

  async function markAllRead() {
    try {
      await notificationsClient.markAllNotificationsRead();
      await refetch();
    } catch {
      // Leave the list as it is; the person can retry.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          'focus-ring relative flex h-12 w-12 items-center justify-center rounded-lg',
          tone === 'dark' ? 'text-white hover:bg-white/10' : 'text-navy-500 hover:bg-navy-50',
        )}
        aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber px-1.5 text-body-sm font-bold text-navy-500 ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-dropdown mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface text-ink shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="font-display text-h3 font-bold">Notificaciones</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="focus-ring min-h-btn rounded-lg px-2 text-body-sm font-semibold text-navy-500 underline-offset-4 hover:underline"
              >
                Marcar todas como leídas
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications === null ? (
              <p className="p-3 text-body text-ink-soft">Cargando...</p>
            ) : null}
            {notifications?.length === 0 ? (
              <p className="p-3 text-body text-ink-soft">Sin notificaciones.</p>
            ) : null}
            {notifications?.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'focus-ring block w-full rounded-lg px-3 py-3 text-left hover:bg-page',
                  !notification.readAt && 'bg-navy-50',
                )}
              >
                <p className="flex items-center gap-2 text-body font-semibold text-ink">
                  {!notification.readAt ? (
                    <span className="rounded-full bg-amber px-2 text-body-sm font-bold text-navy-500">
                      Nueva
                    </span>
                  ) : null}
                  {notification.title}
                </p>
                {notification.body ? (
                  <p className="mt-1 text-body-sm text-ink-soft">{notification.body}</p>
                ) : null}
                <p className="mt-1 text-body-sm text-ink-soft">
                  {DATE_TIME_FORMATTER.format(new Date(notification.createdAt))}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
