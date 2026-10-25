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

  const getPreferences = asyncHandler(async (req, res) => {
    res.status(200).json(await container.getMyNotificationPreferences({ userId: req.user.id }));
  });

  const updatePreferences = asyncHandler(async (req, res) => {
    const result = await container.updateMyNotificationPreferences({
      userId: req.user.id,
      categories: req.body.categories,
      dailyDigest: req.body.dailyDigest,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    res.status(200).json(result);
  });

  const listNews = asyncHandler(async (req, res) => {
    res.status(200).json(await container.listMyNews({ userId: req.user.id }));
  });

  return {
    listMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getPreferences,
    updatePreferences,
    listNews,
  };
}
