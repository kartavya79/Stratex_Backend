const mongoose = require("mongoose");
const notificationModel = require("../../models/notificaton.Model");
const userNotificationModel = require("../../models/userNotificaton.model");
const {
  buildPagination,
  buildPaginationMeta,
  escapeRegex,
} = require("../../utils/queryHelper");

const allowedSortFields = ["createdAt", "priority", "type", "title", "readAt", "deliveredAt"];

const buildNotificationMatch = (query = {}) => {
  const match = {};

  if (query.search) {
    const regex = new RegExp(escapeRegex(String(query.search).trim()), "i");
    match.$or = [
      { "notification.title": regex },
      { "notification.message": regex },
    ];
  }

  if (query.priority) {
    match["notification.priority"] = query.priority;
  }

  if (query.type) {
    match["notification.type"] = query.type;
  }

  if (query.isRead === "true" || query.isRead === true) {
    match.isRead = true;
  }

  if (query.isRead === "false" || query.isRead === false) {
    match.isRead = false;
  }

  return match;
};

const buildSortStage = (query = {}) => {
  const sortBy = allowedSortFields.includes(query.sortBy)
    ? query.sortBy
    : "createdAt";
  const order = query.order === "asc" ? 1 : -1;

  if (["priority", "type", "title", "createdAt"].includes(sortBy)) {
    return { [`notification.${sortBy}`]: order };
  }

  return { [sortBy]: order };
};

const getUnreadCount = (userId) => {
  return userNotificationModel.countDocuments({
    userId,
    isRead: false,
    isDeleted: false,
  });
};

const getNotificationFeed = async (userId, query = {}) => {
  const { page, limit, skip } = buildPagination(query, 100);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const notificationMatch = buildNotificationMatch(query);
  const sort = buildSortStage(query);

  const [result, unreadCount] = await Promise.all([
    userNotificationModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: notificationModel.collection.name,
          localField: "notificationId",
          foreignField: "_id",
          as: "notification",
        },
      },
      { $unwind: "$notification" },
      {
        $match: {
          ...notificationMatch,
          $or: [
            { "notification.expiresAt": null },
            { "notification.expiresAt": { $gt: new Date() } },
          ],
        },
      },
      { $sort: sort },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "notification.senderId",
                foreignField: "_id",
                as: "sender",
              },
            },
            {
              $addFields: {
                "notification.sender": { $arrayElemAt: ["$sender", 0] },
              },
            },
            { $unset: ["sender", "notification.sender.password"] },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]),
    getUnreadCount(userId),
  ]);

  const data = result[0]?.data || [];
  const total = result[0]?.total?.[0]?.count || 0;

  return {
    data,
    unreadCount,
    pagination: buildPaginationMeta({
      page,
      limit,
      total,
      count: data.length,
    }),
  };
};

module.exports = {
  buildNotificationMatch,
  getNotificationFeed,
  getUnreadCount,
};
