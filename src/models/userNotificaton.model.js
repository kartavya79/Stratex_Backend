const mongoose = require("mongoose");
const { Schema } = mongoose;


const UserNotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    pinnedAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["pending", "delivered", "failed"],
      default: "delivered",
    },

    failureReason: {
      type: String,
      default: null,
    },

    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastRetryAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   INDEXES
===================================================== */

// Main notification feed
UserNotificationSchema.index({
  userId: 1,
  isDeleted: 1,
  createdAt: -1,
});

// Badge count
UserNotificationSchema.index({
  userId: 1,
  isRead: 1,
  isDeleted: 1,
});

// Archive
UserNotificationSchema.index({
  userId: 1,
  isArchived: 1,
});

// Pinned
UserNotificationSchema.index({
  userId: 1,
  isPinned: 1,
});

UserNotificationSchema.index({
  userId: 1,
  isPinned: 1,
  isDeleted: 1,
});

UserNotificationSchema.index({
  userId: 1,
  status: 1,
});

// Notification lookup
UserNotificationSchema.index({
  notificationId: 1,
});

// Prevent duplicates
UserNotificationSchema.index(
  {
    notificationId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("UserNotification", UserNotificationSchema);
