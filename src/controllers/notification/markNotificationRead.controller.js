const mongoose = require("mongoose");
const userNotificationModel = require("../../models/userNotificaton.model");
const auditLogModel = require("../../models/auditlog.model");
const { sendError, sendSuccess } = require("../../utils/apiResponse");
const {
  validateNotificationIds,
} = require("../../services/notification/notificationValidation.service");
const notificationCache = require("../../services/notification/notificationCache.service");

const writeReadAudit = async (req, action, targetId, newData = {}) => {
  await auditLogModel.create({
    performedBy: req.user._id,
    action,
    module: "Notification",
    targetId,
    newData,
    remarks: action,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
};

const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "id must be a valid ObjectId");
    }

    const now = new Date();
    const result = await userNotificationModel.updateOne(
      {
        notificationId: req.params.id,
        userId: req.user._id,
        isDeleted: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      }
    );

    if (!result.matchedCount) {
      return sendError(res, 404, "Notification not found");
    }

    await writeReadAudit(req, "READ_NOTIFICATION", req.params.id, {
      notificationId: req.params.id,
      readAt: now,
    });

    notificationCache.invalidate();

    return sendSuccess(res, 200, "Notification marked as read", {
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Mark notification read failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

const markManyNotificationsRead = async (req, res) => {
  try {
    const { errors, notificationIds } = validateNotificationIds(req.body.notificationIds);

    if (errors.length) {
      return sendError(res, 400, "Validation failed", errors);
    }

    const now = new Date();
    const result = await userNotificationModel.updateMany(
      {
        notificationId: { $in: notificationIds },
        userId: req.user._id,
        isDeleted: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      }
    );

    await writeReadAudit(req, "READ_MULTIPLE_NOTIFICATION", undefined, {
      notificationIds,
      modifiedCount: result.modifiedCount,
      readAt: now,
    });

    notificationCache.invalidate();

    return sendSuccess(res, 200, "Notifications marked as read", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Mark many notifications read failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const now = new Date();
    const result = await userNotificationModel.updateMany(
      {
        userId: req.user._id,
        isDeleted: false,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      }
    );

    await writeReadAudit(req, "READ_ALL_NOTIFICATION", undefined, {
      modifiedCount: result.modifiedCount,
      readAt: now,
    });

    notificationCache.invalidate();

    return sendSuccess(res, 200, "All notifications marked as read", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Mark all notifications read failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

module.exports = {
  markAllNotificationsRead,
  markManyNotificationsRead,
  markNotificationRead,
};
