const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    location: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "inactive"],
      default: "scheduled"
    },
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

eventSchema.index({ startDate: 1 });

module.exports = mongoose.model("Event", eventSchema);
