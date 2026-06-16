const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true
        },

        programId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program",
            required: true
        },

        specializationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Specialization"
        },

        semester: {
            type: Number,
            required: true
        },

        credits: {
            type: Number,
            default: 0
        },

        coordinatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model("Subject", subjectSchema);