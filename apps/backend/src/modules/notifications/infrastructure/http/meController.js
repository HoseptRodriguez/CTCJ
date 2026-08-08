import { mapNotificationsError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapNotificationsError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildNotificationsContainer>} container */
export function createMeController(container) {
  const listMyNotifications = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await container.listMyNotifications({ recipientId: req.user.id, limit });
    res.status(200).json(result);
  });

  const markNotificationRead = asyncHandler(async (req, res) => {
    const notification = await container.markNotificationRead({
      recipientId: req.user.id,
      notificationId: req.params.id,
    });
    res.status(200).json(notification);
  });

  const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const result = await container.markAllNotificationsRead({ recipientId: req.user.id });
    res.status(200).json(result);
  });

  return { listMyNotifications, markNotificationRead, markAllNotificationsRead };
}
