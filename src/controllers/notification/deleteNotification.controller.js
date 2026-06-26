const mongoose = require("mongoose");
const userNotificationModel = require("../../models/userNotificaton.model");
const auditLogModel = require("../../models/auditlog.model");
const { sendError, sendSuccess } = require("../../utils/apiResponse");

const writeDeleteAudit = async (req, action, targetId, oldData, newData) => {
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

const softDeleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "id must be a valid ObjectId");
    }

    const oldRecord = await userNotificationModel.findOne({
      notificationId: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!oldRecord) {
      return sendError(res, 404, "Notification not found");
    }

    const now = new Date();
    const updated = await userNotificationModel.findOneAndUpdate(
      {
        notificationId: req.params.id,
        userId: req.user._id,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
        },
      },
      { new: true }
    );

    await writeDeleteAudit(req, "DELETE_NOTIFICATION", req.params.id, oldRecord, {
      isDeleted: updated.isDeleted,
      deletedAt: updated.deletedAt,
    });

    return sendSuccess(res, 200, "Notification deleted successfully", updated);
  } catch (err) {
    console.error("Soft delete notification failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

const restoreNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "id must be a valid ObjectId");
    }

    const oldRecord = await userNotificationModel.findOne({
      notificationId: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!oldRecord) {
      return sendError(res, 404, "Notification not found");
    }

    const updated = await userNotificationModel.findOneAndUpdate(
      {
        notificationId: req.params.id,
        userId: req.user._id,
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
        },
      },
      { new: true }
    );

    await writeDeleteAudit(req, "RESTORE_NOTIFICATION", req.params.id, oldRecord, {
      isDeleted: updated.isDeleted,
      deletedAt: updated.deletedAt,
    });

    return sendSuccess(res, 200, "Notification restored successfully", updated);
  } catch (err) {
    console.error("Restore notification failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

module.exports = {
  restoreNotification,
  softDeleteNotification,
};
