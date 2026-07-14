const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["academic", "examinations", "events", "general", "holidays", "administrative", "urgent"],
      default: "general"
    },
    audience: {
      type: [String],
      enum: ["superAdmin", "schoolAdmin", "faculty", "coordinator", "student", "examCell", "all"],
      default: ["all"]
    },
    audienceCriteria: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "inactive"],
      default: "published"
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    attachment: {
      url: {
        type: String,
        default: null
      },
      fileId: {
        type: String,
        default: null
      },
      name: {
        type: String,
        default: null
      },
      fileType: {
        type: String,
        default: null
      },
      size: {
        type: Number,
        default: null
      }
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    clearedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notice", noticeSchema);
