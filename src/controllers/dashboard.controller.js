const auditLogModel = require("../models/auditlog.model");
const eventModel = require("../models/event.model");
const noticeModel = require("../models/notice.model");
const programModel = require("../models/program.model");
const schoolModel = require("../models/school.model");
const subjectModel = require("../models/subject.model");
const userModel = require("../models/user.model");

const getStats = async (_req, res) => {
  try {
    const [
      totalUsers,
      totalSchools,
      totalPrograms,
      totalSubjects,
      totalNotices,
      totalEvents
    ] = await Promise.all([
      userModel.countDocuments(),
      schoolModel.countDocuments(),
      programModel.countDocuments(),
      subjectModel.countDocuments(),
      noticeModel.countDocuments(),
      eventModel.countDocuments()
    ]);

    return res.status(200).json({
      totalUsers,
      totalSchools,
      totalPrograms,
      totalSubjects,
      totalNotices,
      totalEvents
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

const getRecentUsers = async (_req, res) => {
  try {
    const users = await userModel
      .find()
      .select("-password -setupToken -setupTokenExpiry")
      .populate("schoolId", "name slug")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({ users });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

const getRecentActivities = async (_req, res) => {
  try {
    const activities = await auditLogModel
      .find()
      .populate("performedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({ activities });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

const getRecentNotices = async (_req, res) => {
  try {
    const notices = await noticeModel
      .find({ status: { $ne: "inactive" } })
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({ notices });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

const getUpcomingEvents = async (_req, res) => {
  try {
    const events = await eventModel
      .find({
        status: "scheduled",
        startDate: { $gte: new Date() }
      })
      .populate("createdBy", "firstName lastName")
      .sort({ startDate: 1 })
      .limit(10);

    return res.status(200).json({ events });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getStats,
  getRecentUsers,
  getRecentActivities,
  getRecentNotices,
  getUpcomingEvents
};
