const notificationModel = require("../../models/notificaton.Model");
const userNotificationModel = require("../../models/userNotificaton.model");
const { sendError, sendSuccess } = require("../../utils/apiResponse");

const analyticsRoles = ["superAdmin", "schoolAdmin"];

const hasAllowedRole = (user, allowedRoles) => {
  const roles = user?.roles || [];
  return roles.some((role) => allowedRoles.includes(role));
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const daysAgo = (days) => {
  const value = startOfDay(new Date());
  value.setDate(value.getDate() - days);
  return value;
};

const toKeyedCounts = (rows) =>
  rows.reduce((acc, row) => {
    acc[row._id || "unknown"] = row.count;
    return acc;
  }, {});

const getNotificationAnalytics = async (req, res) => {
  try {
    if (!hasAllowedRole(req.authUser || req.user, analyticsRoles)) {
      return sendError(res, 403, "You are not allowed to view notification analytics");
    }

    const today = startOfDay(new Date());
    const weekStart = daysAgo(7);
    const monthStart = daysAgo(30);

    const [
      totalNotifications,
      delivered,
      read,
      unread,
      deleted,
      latestNotification,
      todayNotifications,
      thisWeek,
      thisMonth,
      byType,
      byPriority,
    ] = await Promise.all([
      notificationModel.countDocuments({}),
      userNotificationModel.countDocuments({}),
      userNotificationModel.countDocuments({ isRead: true, isDeleted: false }),
      userNotificationModel.countDocuments({ isRead: false, isDeleted: false }),
      userNotificationModel.countDocuments({ isDeleted: true }),
      notificationModel
        .findOne({})
        .sort({ createdAt: -1 })
        .populate("senderId", "firstName lastName roles")
        .lean(),
      notificationModel.countDocuments({ createdAt: { $gte: today } }),
      notificationModel.countDocuments({ createdAt: { $gte: weekStart } }),
      notificationModel.countDocuments({ createdAt: { $gte: monthStart } }),
      notificationModel.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      notificationModel.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const activeDelivered = read + unread;
    const readPercentage = activeDelivered
      ? Number(((read / activeDelivered) * 100).toFixed(2))
      : 0;
    const unreadPercentage = activeDelivered
      ? Number(((unread / activeDelivered) * 100).toFixed(2))
      : 0;

    return sendSuccess(res, 200, "Notification analytics fetched successfully", {
      totalNotifications,
      delivered,
      read,
      unread,
      deleted,
      readPercentage,
      unreadPercentage,
      latestNotification,
      todayNotifications,
      thisWeek,
      thisMonth,
      notificationsByType: toKeyedCounts(byType),
      notificationsByPriority: toKeyedCounts(byPriority),
    });
  } catch (err) {
    console.error("Notification analytics failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

module.exports = {
  getNotificationAnalytics,
};
