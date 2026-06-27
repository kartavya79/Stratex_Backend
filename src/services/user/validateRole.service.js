const allowedRoles = [
  "student",
  "faculty",
  "coordinator",
  "schoolAdmin",
  "examCell",
  "superAdmin",
];

const roleRequiresAcademicAssignments = (roles) =>
  roles.includes("student") ||
  roles.includes("faculty") ||
  roles.includes("coordinator");

const validateRoles = (roles) => {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    const error = new Error("At least one role is required");
    error.statusCode = 400;
    throw error;
  }

  const uniqueRoles = [...new Set(roles)];

  if (uniqueRoles.length !== roles.length) {
    const error = new Error("Duplicate roles are not allowed");
    error.statusCode = 400;
    throw error;
  }

  if (roles.some((role) => !allowedRoles.includes(role))) {
    const error = new Error("Invalid role provided");
    error.statusCode = 400;
    throw error;
  }

  if (roles.includes("coordinator") && !roles.includes("faculty")) {
    const error = new Error("Coordinator must also have faculty role");
    error.statusCode = 400;
    throw error;
  }
};

module.exports = {
  allowedRoles,
  roleRequiresAcademicAssignments,
  validateRoles,
};
