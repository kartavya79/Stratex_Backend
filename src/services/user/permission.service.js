const auditLogModel = require("../../models/auditlog.model");

const hasRole = (user, role) => user?.roles?.includes(role);

const hasAnyRole = (user, roles = []) =>
  roles.some((role) => hasRole(user, role));

const assertCanCreateUsers = async (req) => {
  if (hasAnyRole(req.user, ["superAdmin", "schoolAdmin"])) {
    return;
  }

  await auditLogModel.create({
    performedBy: req.user?._id,
    action: "UNAUTHORIZED_CREATE_ATTEMPT",
    module: "User",
    remarks: "Unauthorized registration attempt",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const error = new Error("Unauthorized");
  error.statusCode = 403;
  throw error;
};

const assertCanCreateRoleSet = (actor, targetRoles, targetSchoolId) => {
  if (targetRoles.includes("superAdmin") && !hasRole(actor, "superAdmin")) {
    const error = new Error("Cannot register superAdmin through this endpoint");
    error.statusCode = 403;
    throw error;
  }

  if (hasRole(actor, "schoolAdmin") && targetRoles.includes("schoolAdmin")) {
    const error = new Error("SchoolAdmin Cannot create another SchoolAdmin");
    error.statusCode = 403;
    throw error;
  }

  const forbiddenRolesForSchoolAdmin = ["superAdmin", "schoolAdmin", "examCell"];

  if (
    hasRole(actor, "schoolAdmin") &&
    targetRoles.some((role) => forbiddenRolesForSchoolAdmin.includes(role))
  ) {
    const error = new Error("School Admin cannot create privileged accounts");
    error.statusCode = 403;
    throw error;
  }

  if (
    hasRole(actor, "schoolAdmin") &&
    actor.schoolId?.toString() !== targetSchoolId?.toString()
  ) {
    const error = new Error("School Admin can only create users for their own school");
    error.statusCode = 403;
    throw error;
  }
};

module.exports = {
  assertCanCreateRoleSet,
  assertCanCreateUsers,
  hasAnyRole,
  hasRole,
};
