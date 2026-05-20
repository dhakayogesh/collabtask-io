const notificationService = require("../services/notification.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications(req.user, req.query);
  sendSuccess(res, result, "Notifications retrieved", 200, {
    count: result.notifications.length,
    unreadCount: result.unreadCount,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.notificationId, req.user);
  sendSuccess(res, { notification }, "Notification marked as read");
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user);
  sendSuccess(res, result, "Notifications marked as read");
});

module.exports = { getNotifications, markAllAsRead, markAsRead };
