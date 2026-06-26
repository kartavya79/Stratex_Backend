const notificationModel = require("../../models/notificaton.Model");
const userNotificationModel = require("../../models/userNotificaton.model");
const auditLogModel = require("../../models/auditlog.model");
const notificationCache = require("./notificationCache.service");

const DEFAULT_INTERVAL_MS =
  Number(process.env.NOTIFICATION_CLEANUP_INTERVAL_MS) || 15 * 60 * 1000;

let cleanupTimer = null;

const cleanupExpiredNotifications = async (options = {}) => {
  const now = options.now || new Date();
  const limit = Number(options.limit) || 500;

  const expiredNotifications = await notificationModel
    .find({
      expiresAt: { $lte: now },
      isExpired: { $ne: true },
    })
    .select("_id title")
    .limit(limit)
    .lean();

  if (!expiredNotifications.length) {
    return {
      expiredCount: 0,
      userNotificationModifiedCount: 0,
    };
  }

  const notificationIds = expiredNotifications.map((notification) => notification._id);

  await notificationModel.updateMany(
    { _id: { $in: notificationIds } },
    {
      $set: {
        isExpired: true,
        expiredAt: now,
      },
    }
  );

  const userNotificationResult = await userNotificationModel.updateMany(
    {
      notificationId: { $in: notificationIds },
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: now,
      },
    }
  );

  await auditLogModel.insertMany(
    expiredNotifications.map((notification) => ({
      action: "NOTIFICATION_EXPIRED",
      module: "Notification",
      targetId: notification._id,
      targetName: notification.title,
      newData: {
        notificationId: notification._id,
        expiredAt: now,
      },
      remarks: "Notification expired by cleanup service",
    }))
  );

  notificationCache.invalidate();

  return {
    expiredCount: expiredNotifications.length,
    userNotificationModifiedCount: userNotificationResult.modifiedCount,
  };
};

const scheduleNotificationCleanup = () => {
  if (process.env.NOTIFICATION_CLEANUP_DISABLED === "true" || cleanupTimer) {
    return cleanupTimer;
  }

  cleanupTimer = setInterval(() => {
    cleanupExpiredNotifications().catch((err) => {
      console.error("Notification cleanup failed:", err.message);
    });
  }, DEFAULT_INTERVAL_MS);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return cleanupTimer;
};

module.exports = {
  cleanupExpiredNotifications,
  scheduleNotificationCleanup,
};
