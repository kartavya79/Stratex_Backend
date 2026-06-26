const { sendError, sendSuccess } = require("../../utils/apiResponse");
const {
  getNotificationFeed,
  getUnreadCount,
} = require("../../services/notification/notificationQuery.service");

const getNotifications = async (req, res) => {
  try {
    const feed = await getNotificationFeed(req.user._id, req.query);

    return sendSuccess(
      res,
      200,
      "Notifications fetched successfully",
      {
        unreadCount: feed.unreadCount,
        notifications: feed.data,
      },
      feed.pagination
    );
  } catch (err) {
    console.error("Get notifications failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

const getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount(req.user._id);

    return sendSuccess(res, 200, "Unread notification count fetched successfully", {
      unreadCount,
    });
  } catch (err) {
    console.error("Get unread notification count failed:", err);

    return sendError(res, 500, "Internal Server Error");
  }
};

module.exports = {
  getNotifications,
  getUnreadNotificationCount,
};
