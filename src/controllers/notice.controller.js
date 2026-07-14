const noticeModel = require("../models/notice.model");
const mongoose = require("mongoose");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const auditLogModel = require("../models/auditlog.model");
const notificationModel = require("../models/notificaton.Model");
const userNotificationModel = require("../models/userNotificaton.model");
const { resolveAudience } = require("../services/notification/audience.service");
const { validateAudience } = require("../services/notification/notificationValidation.service");
const notificationCache = require("../services/notification/notificationCache.service");
const { noticeAttachment } = require("../services/storage.service");
const {
  createListController,
  createGetByIdController,
  createDeleteController
} = require("./rest.controller");

const options = {
  resourceName: "Notice",
  resourceKey: "notice",
  collectionName: "notices",
  searchFields: ["title", "content"],
  filterMap: {
    status: "status",
    category: "category",
    createdBy: { field: "createdBy", type: "objectId" },
  },
  getBaseFilters: (req) => {
    const roles = req.authUser?.roles || req.user?.roles || [];
    const schoolId = req.authUser?.schoolId || req.user?.schoolId;

    if (roles.includes("superAdmin")) return {};
    if (roles.includes("schoolAdmin") && schoolId) {
      return {
        $or: [
          { schoolId },
          { "audienceCriteria.schoolIds": schoolId },
          { audience: "all" },
          { audience: { $in: ["schoolAdmin"] } },
        ],
      };
    }

    return {};
  },
  getExtraFilters: (query) => {
    if (query.published === "true" || query.published === true) {
      return { status: "published" };
    }

    if (query.published === "false" || query.published === false) {
      return { status: { $ne: "published" } };
    }

    return {};
  },
  allowedSortFields: ["title", "status", "category", "publishedAt", "createdAt", "updatedAt"],
  populate: [
    { path: "createdBy", select: "firstName lastName" },
    { path: "updatedBy", select: "firstName lastName" }
  ]
};

const getNotices = createListController(noticeModel, options);
const getNoticeById = createGetByIdController(noticeModel, options);
const deleteNotice = createDeleteController(noticeModel, options);
const noticeCategories = ["academic", "examinations", "events", "general", "holidays", "administrative", "urgent"];
const schoolAdminNoticeRoles = ["faculty", "coordinator", "student"];

const getUserRoles = (req) => req.authUser?.roles || req.user?.roles || [];
const getUserSchoolId = (req) => req.authUser?.schoolId || req.user?.schoolId || null;
const hasRole = (req, role) => getUserRoles(req).includes(role);
const sameId = (left, right) => String(left || "") === String(right || "");

const assertCanManageNotice = (req, notice = null) => {
  if (hasRole(req, "superAdmin")) return;

  if (hasRole(req, "schoolAdmin")) {
    const schoolId = getUserSchoolId(req);
    if (!schoolId) {
      const error = new Error("School admin account is not linked to a school");
      error.statusCode = 403;
      throw error;
    }

    if (!notice || sameId(notice.schoolId, schoolId)) return;

    const error = new Error("You can manage only notices created for your school");
    error.statusCode = 403;
    throw error;
  }

  const error = new Error("You are not allowed to manage notices");
  error.statusCode = 403;
  throw error;
};

const validateNoticeCategory = (value) => {
  const category = value || "general";
  if (noticeCategories.includes(category)) return category;

  const error = new Error("Invalid notice category");
  error.statusCode = 400;
  throw error;
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizeNoticeAudience = (value) => {
  if (!value) return ["all"];

  if (Array.isArray(value)) {
    return value.length ? value : ["all"];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.length ? parsed : ["all"];
  } catch {
    // Fall back to comma separated values.
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toNotificationAudience = (audience = []) => {
  if (!audience.length || audience.includes("all")) {
    return { allUsers: true };
  }

  return {
    allUsers: false,
    roles: audience,
  };
};

const normalizeNoticeAudienceCriteria = (value, fallbackAudience = []) => {
  if (!value) {
    return toNotificationAudience(fallbackAudience);
  }

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return toNotificationAudience(fallbackAudience);
    }
  }

  const { errors, audience } = validateAudience(parsed);
  if (errors.length) {
    const error = new Error(errors[0]);
    error.statusCode = 400;
    throw error;
  }

  return audience;
};

const enforceNoticeAudienceScope = (req, audience, audienceCriteria) => {
  if (hasRole(req, "superAdmin")) {
    return {
      audience,
      audienceCriteria,
      schoolId: null,
    };
  }

  if (!hasRole(req, "schoolAdmin")) {
    const error = new Error("You are not allowed to create notices");
    error.statusCode = 403;
    throw error;
  }

  const schoolId = getUserSchoolId(req);
  if (!schoolId) {
    const error = new Error("School admin account is not linked to a school");
    error.statusCode = 403;
    throw error;
  }

  const requestedRoles = audience.includes("all")
    ? []
    : audience.filter((role) => role !== "all");

  if (!requestedRoles.length || requestedRoles.some((role) => !schoolAdminNoticeRoles.includes(role))) {
    const error = new Error("School admins can create notices only for faculty, coordinators, or students in their school");
    error.statusCode = 403;
    throw error;
  }

  return {
    audience: requestedRoles,
    audienceCriteria: {
      ...audienceCriteria,
      allUsers: false,
      roles: requestedRoles,
      schoolIds: [String(schoolId)],
    },
    schoolId,
  };
};

const buildAttachmentPayload = async (file) => {
  if (!file) return undefined;

  const upload = await noticeAttachment(file.buffer, file.originalname);

  return {
    url: upload.url,
    fileId: upload.fileId,
    name: file.originalname,
    fileType: file.mimetype,
    size: file.size,
  };
};

const createNoticeNotification = async ({ notice, req, session }) => {
  if (notice.status !== "published") return { recipientCount: 0 };

  const audience = notice.audienceCriteria || toNotificationAudience(notice.audience);
  const { users, count } = await resolveAudience(audience, session);

  if (!count) {
    throw new Error("No active users matched the selected notice audience");
  }

  const attachments = notice.attachment?.url
    ? [
        {
          name: notice.attachment.name,
          url: notice.attachment.url,
          fileType: notice.attachment.fileType,
          size: notice.attachment.size,
        },
      ]
    : [];

  const [notification] = await notificationModel.create(
    [
      {
        title: notice.title,
        message: notice.content,
        type: "notice",
        priority: "normal",
        senderId: req.user._id,
        createdBy: req.user._id,
        audience,
        reference: {
          model: "Notice",
          id: notice._id,
        },
        action: {
          label: "View Notice",
          url: "/dashboard/notices",
        },
        metadata: {
          noticeId: notice._id,
          attachments,
        },
      },
    ],
    { session }
  );

  const now = new Date();
  const userNotificationDocs = users.map((user) => ({
    notificationId: notification._id,
    userId: user._id,
    deliveredAt: now,
    status: "delivered",
  }));

  for (const docs of chunk(userNotificationDocs, 5000)) {
    await userNotificationModel.insertMany(docs, {
      session,
      ordered: false,
    });
  }

  notificationCache.invalidate();

  return { notification, recipientCount: count };
};

const createNotice = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    assertCanManageNotice(req);
    const audience = normalizeNoticeAudience(req.body.audience);
    const audienceCriteria = normalizeNoticeAudienceCriteria(req.body.audienceCriteria, audience);
    const scopedAudience = enforceNoticeAudienceScope(req, audience, audienceCriteria);
    const attachment = await buildAttachmentPayload(req.file);
    const category = validateNoticeCategory(req.body.category);

    session.startTransaction();

    const [notice] = await noticeModel.create(
      [
        {
          title: req.body.title,
          content: req.body.content,
          category,
          audience: scopedAudience.audience,
          audienceCriteria: scopedAudience.audienceCriteria,
          schoolId: scopedAudience.schoolId,
          status: req.body.status || "published",
          publishedAt: req.body.publishedAt || Date.now(),
          ...(attachment ? { attachment } : {}),
          createdBy: req.user._id,
        },
      ],
      { session }
    );

    const notificationResult = await createNoticeNotification({
      notice,
      req,
      session,
    });

    await auditLogModel.create({
      performedBy: req.user._id,
      action: "CREATE",
      module: "Notice",
      targetId: notice._id,
      targetName: notice.title,
      remarks: "Notice created successfully",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await session.commitTransaction();

    return sendSuccess(res, 201, "Notice created successfully", {
      notice,
      notification: notificationResult.notification || null,
      recipientCount: notificationResult.recipientCount,
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(err);

    const statusCode = err.statusCode || (err.message?.includes("No active users") ? 400 : 500);

    return sendError(
      res,
      statusCode,
      statusCode < 500 ? err.message : "Internal Server Error"
    );
  } finally {
    await session.endSession();
  }
};

const updateNotice = async (req, res) => {
  try {
    const notice = await noticeModel.findById(req.params.id);

    if (!notice) {
      return sendError(res, 404, "Notice not found");
    }

    assertCanManageNotice(req, notice);

    const update = {
      ...req.body,
      updatedBy: req.user._id,
    };

    if (req.body.category !== undefined) {
      update.category = validateNoticeCategory(req.body.category);
    }

    if (req.body.audience !== undefined) {
      update.audience = normalizeNoticeAudience(req.body.audience);
    }

    if (req.body.audienceCriteria !== undefined) {
      update.audienceCriteria = normalizeNoticeAudienceCriteria(
        req.body.audienceCriteria,
        update.audience || notice.audience,
      );
    }

    if (update.audience || update.audienceCriteria) {
      const scopedAudience = enforceNoticeAudienceScope(
        req,
        update.audience || notice.audience,
        update.audienceCriteria || notice.audienceCriteria || toNotificationAudience(update.audience || notice.audience),
      );
      update.audience = scopedAudience.audience;
      update.audienceCriteria = scopedAudience.audienceCriteria;
      update.schoolId = scopedAudience.schoolId;
    }

    if (req.file) {
      update.attachment = await buildAttachmentPayload(req.file);
    }

    const updatedNotice = await noticeModel.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
        runValidators: true,
      }
    );

    await auditLogModel.create({
      performedBy: req.user._id,
      action: "UPDATE",
      module: "Notice",
      targetId: updatedNotice._id,
      targetName: updatedNotice.title,
      remarks: "Notice updated successfully",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, 200, "Notice updated successfully", updatedNotice);
  } catch (err) {
    console.error(err);

    return sendError(res, err.statusCode || 500, err.statusCode ? err.message : "Internal Server Error");
  }
};

module.exports = {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice: async (req, res) => {
    try {
      const notice = await noticeModel.findById(req.params.id);

      if (!notice) {
        return sendError(res, 404, "Notice not found");
      }

      assertCanManageNotice(req, notice);

      notice.status = "inactive";
      notice.updatedBy = req.user._id;
      await notice.save();

      await auditLogModel.create({
        performedBy: req.user._id,
        action: "DELETE",
        module: "Notice",
        targetId: notice._id,
        targetName: notice.title,
        remarks: "Notice deleted successfully",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return sendSuccess(res, 200, "Notice deleted successfully");
    } catch (err) {
      console.error(err);
      return sendError(res, err.statusCode || 500, err.statusCode ? err.message : "Internal Server Error");
    }
  }
};
