import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { notificationsClient } from '../api/notificationsClient.js';
import { BellIcon } from '../components/icons/BellIcon.jsx';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Mounted in both Header.jsx (JUGADOR-facing, wraps /mi-ctcj) and
 * StaffLayout.jsx (wraps /staff/*) -- there's no shared authenticated-user
 * header in this app, so this has to be added to both independently (see
 * the Phase 3a plan). Unconditional for any logged-in user, not gated on
 * role, since anyone could in principle receive a notification.
 */
export function NotificationBell() {
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleNotificationClick(notification) {
    if (!notification.readAt) {
      try {
        await notificationsClient.markNotificationRead(notification.id);
        await refetch();
      } catch {
        // Non-fatal -- still navigate even if marking read failed.
      }
    }
    setOpen(false);
    if (notification.linkPath) {
      navigate(notification.linkPath);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative flex h-11 w-11 items-center justify-center rounded-md text-primary hover:bg-neutral-100"
        aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-on-inverse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-dropdown mt-2 w-80 rounded-md border border-neutral-200 bg-canvas shadow-lg">
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications === null ? (
              <p className="p-3 text-sm text-secondary">Cargando...</p>
            ) : null}
            {notifications?.length === 0 ? (
              <p className="p-3 text-sm text-secondary">Sin notificaciones.</p>
            ) : null}
            {notifications?.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 ${
                  notification.readAt ? '' : 'bg-raised'
                }`}
              >
                <p className="font-semibold text-primary">{notification.title}</p>
                {notification.body ? (
                  <p className="mt-0.5 text-secondary">{notification.body}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-tertiary">
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
