const noticeModel = require("../models/notice.model");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const auditLogModel = require("../models/auditlog.model");
const {
  createListController,
  createGetByIdController,
  createUpdateController,
  createDeleteController
} = require("./rest.controller");

const options = {
  resourceName: "Notice",
  resourceKey: "notice",
  collectionName: "notices",
  searchFields: ["title", "content"],
  filterMap: {
    status: "status",
    createdBy: { field: "createdBy", type: "objectId" },
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
  allowedSortFields: ["title", "status", "publishedAt", "createdAt", "updatedAt"],
  populate: [
    { path: "createdBy", select: "firstName lastName" },
    { path: "updatedBy", select: "firstName lastName" }
  ]
};

const getNotices = createListController(noticeModel, options);
const getNoticeById = createGetByIdController(noticeModel, options);
const updateNotice = createUpdateController(noticeModel, options);
const deleteNotice = createDeleteController(noticeModel, options);

const createNotice = async (req, res) => {
  try {
    const notice = await noticeModel.create({
      ...req.body,
      createdBy: req.user._id
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

    return sendSuccess(res, 201, "Notice created successfully", notice);
  } catch (err) {
    console.error(err);

    return sendError(res, 500, "Internal Server Error");
  }
};

module.exports = {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
};
