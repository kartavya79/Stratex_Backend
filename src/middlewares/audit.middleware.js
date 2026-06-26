const auditLogModel = require("../models/auditlog.model");
const mongoose = require("mongoose");

const methodActionMap = {
  GET: "READ",
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE"
};

const moduleMap = {
  users: "User",
  schools: "School",
  programs: "Program",
  specializations: "Specialization",
  subjects: "Subject",
  notices: "Notice",
  events: "Event",
  dashboard: "Dashboard",
  auth: "Auth",
  notifications: "Notification"
};

const getAction = (req) => {
  if (req.originalUrl.includes("/auth/logout")) {
    return "LOGOUT";
  }

  if (req.originalUrl.includes("/auth/setup-password")) {
    return "SETUP_PASSWORD";
  }

  return methodActionMap[req.method];
};

const auditRequest = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", async () => {
    try {
      if (req.method !== "GET") {
        return;
      }

      const pathAfterApi = req.originalUrl.split("?")[0].split("/api/")[1];
      const resource = pathAfterApi?.split("/")[0];
      const module = moduleMap[resource];
      const action = getAction(req);
      const targetId = req.params?.id || req.params?.userId || req.params?.subjectId;

      if (!module || !action) {
        return;
      }

      await auditLogModel.create({
        performedBy: req.user?._id,
        action,
        module,
        targetId: mongoose.isValidObjectId(targetId) ? targetId : undefined,
        remarks: `${req.method} ${req.originalUrl} completed with ${res.statusCode}`,
        newData: {
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      });
    } catch (err) {
      console.error("Audit middleware error:", err.message);
    }
  });

  next();
};

module.exports = auditRequest;
