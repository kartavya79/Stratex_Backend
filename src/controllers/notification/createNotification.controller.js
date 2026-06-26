const mongoose = require("mongoose");
const notificationModel = require("../../models/notificaton.Model");
const userNotificationModel = require("../../models/userNotificaton.model");
const auditLogModel = require("../../models/auditlog.model");
const { sendError, sendSuccess } = require("../../utils/apiResponse");
const { resolveAudience } = require("../../services/notification/audience.service");
const {
  validateCreateNotification,
} = require("../../services/notification/notificationValidation.service");

const creatorRoles = ["superAdmin", "schoolAdmin", "faculty", "coordinator", "examCell"];

const hasAllowedRole = (user, allowedRoles) => {
  const roles = user?.roles || [];
  return roles.some((role) => allowedRoles.includes(role));
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const createNotification = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    if (!hasAllowedRole(req.authUser || req.user, creatorRoles)) {
      return sendError(res, 403, "You are not allowed to create notifications");
    }

    const { errors, audience } = validateCreateNotification(req.body);

    if (errors.length) {
      return sendError(res, 400, "Validation failed", errors);
    }

    session.startTransaction();

    const [notification] = await notificationModel.create(
      [
        {
          title: String(req.body.title).trim(),
          message: String(req.body.message).trim(),
          type: req.body.type,
          priority: req.body.priority || "normal",
          senderId: req.user._id,
          createdBy: req.user._id,
          audience,
          reference: req.body.reference || undefined,
          action: req.body.action || undefined,
          metadata: req.body.metadata || {},
          expiresAt: req.body.expiresAt || null,
        },
      ],
      { session }
    );

    const { users, count } = await resolveAudience(audience, session);

    if (!count) {
      throw new Error("No active users matched the selected audience");
    }

    const now = new Date();
    const userNotificationDocs = users.map((user) => ({
      notificationId: notification._id,
      userId: user._id,
      deliveredAt: now,
    }));

    for (const docs of chunk(userNotificationDocs, 5000)) {
      await userNotificationModel.insertMany(docs, {
        session,
        ordered: false,
      });
    }

    await auditLogModel.create(
      [
        {
          performedBy: req.user._id,
          action: "CREATE_NOTIFICATION",
          module: "Notification",
          targetId: notification._id,
          targetName: notification.title,
          newData: {
            notificationId: notification._id,
            recipientCount: count,
            audience,
          },
          remarks: "Notification created and delivered",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return sendSuccess(res, 201, "Notification created successfully", {
      notification,
      recipientCount: count,
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    const statusCode = err.message?.includes("No active users") ? 400 : 500;
    console.error("Create notification failed:", err);

    return sendError(
      res,
      statusCode,
      statusCode === 400 ? err.message : "Internal Server Error"
    );
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createNotification,
};
