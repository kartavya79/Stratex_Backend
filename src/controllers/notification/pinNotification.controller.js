const mongoose = require("mongoose");
const userNotificationModel = require("../../models/userNotificaton.model");
const auditLogModel = require("../../models/auditlog.model");
const { sendError, sendSuccess } = require("../../utils/apiResponse");
const notificationCache = require("../../services/notification/notificationCache.service");

const PIN_LIMIT = Number(process.env.NOTIFICATION_PIN_LIMIT) || 5;

const writePinAudit = async (req, action, targetId, oldData, newData) => {
  await auditLogModel.create({
    performedBy: req.user._id,
    action,
    module: "Notification",
    targetId,
    oldData,
    newData,
    remarks: action,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
};

const pinNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "id must be a valid ObjectId");
    }

    const userNotification = await userNotificationModel
      .findOne({
        notificationId: req.params.id,
        userId: req.user._id,
        isDeleted: false,
      })
      .lean();

    if (!userNotification) {
      return sendError(res, 404, "Notification not found");
    }

    if (!userNotification.isPinned) {
      const pinnedCount = await userNotificationModel.countDocuments({
        userId: req.user._id,
        isPinned: true,
        isDeleted: false,
      });

      if (pinnedCount >= PIN_LIMIT) {
        return sendError(res, 400, `You can pin maximum ${PIN_LIMIT} notifications`);
      }
    }

    const now = new Date();
    const updated = await userNotificationModel.findOneAndUpdate(
      {
        notificationId: req.params.id,
        userId: req.user._id,
        isDeleted: false,
      },
      {
        $set: {
          isPinned: true,
          pinnedAt: now,
        },
      },
      { new: true }
    );

    await writePinAudit(req, "NOTIFICATION_PINNED", req.params.id, userNotification, {
      isPinned: true,
      pinnedAt: now,
    });

    notificationCache.invalidate();

    return sendSuccess(res, 200, "Notification pinned successfully", updated);
  } catch (err) {
    console.error("Pin notification failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

const unpinNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "id must be a valid ObjectId");
    }

    const oldRecord = await userNotificationModel
      .findOne({
        notificationId: req.params.id,
        userId: req.user._id,
        isDeleted: false,
      })
      .lean();

    if (!oldRecord) {
      return sendError(res, 404, "Notification not found");
    }

    const updated = await userNotificationModel.findOneAndUpdate(
      {
        notificationId: req.params.id,
        userId: req.user._id,
        isDeleted: false,
      },
      {
        $set: {
          isPinned: false,
          pinnedAt: null,
        },
      },
      { new: true }
    );

    await writePinAudit(req, "NOTIFICATION_UNPINNED", req.params.id, oldRecord, {
      isPinned: false,
      pinnedAt: null,
    });

    notificationCache.invalidate();

    return sendSuccess(res, 200, "Notification unpinned successfully", updated);
  } catch (err) {
    console.error("Unpin notification failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

module.exports = {
  pinNotification,
  unpinNotification,
};
