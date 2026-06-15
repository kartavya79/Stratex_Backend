const mongoose = require("mongoose");

const universityAccountSchema = new mongoose.Schema(
  {
    universityEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    institutionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    personalEmail: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    // University Account
    universityAccount: {
      type: universityAccountSchema,
      required: true,
    },

    // Academic Mapping
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
    },

    specializationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specialization",
    },

    // Roles
    roles: {
      type: [String],
      enum: [
        "student",
        "faculty",
        "coordinator",
        "schoolAdmin",
        "admin",
        "superAdmin",
      ],
      required: true,
      validate: {
        validator: (roles) => roles.length > 0,
        message: "At least one role is required",
      },
    },

    // Account Status
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "inactive",
    },

    // Authentication
    password: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    setupToken: {
      type: String,
    },

    setupTokenExpiry: {
      type: Date,
    },

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    lastLogin: {
      type: Date,
    },

    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual Full Name
userSchema.virtual("fullName").get(function () {
  return [this.firstName, this.middleName, this.lastName]
    .filter(Boolean)
    .join(" ");
});

// Include virtuals in JSON responses
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", userSchema);