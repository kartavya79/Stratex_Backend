const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { createNotification } = require("../controllers/notification/createNotification.controller");
const {
  getNotifications,
  getUnreadNotificationCount,
} = require("../controllers/notification/getNotifications.controller");
const {
  markAllNotificationsRead,
  markManyNotificationsRead,
  markNotificationRead,
} = require("../controllers/notification/markNotificationRead.controller");
const {
  restoreNotification,
  softDeleteNotification,
} = require("../controllers/notification/deleteNotification.controller");
const {
  getNotificationAnalytics,
} = require("../controllers/notification/notificationAnalytics.controller");
const {
  pinNotification,
  unpinNotification,
} = require("../controllers/notification/pinNotification.controller");

const router = express.Router();

router.use(authMiddleware.chkUser);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadNotificationCount);
router.get("/analytics", getNotificationAnalytics);
router.post("/", createNotification);
router.patch("/read-many", markManyNotificationsRead);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/pin", pinNotification);
router.patch("/:id/unpin", unpinNotification);
router.patch("/:id/read", markNotificationRead);
router.delete("/:id", softDeleteNotification);
router.patch("/:id/restore", restoreNotification);

module.exports = router;
