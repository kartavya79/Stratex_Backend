const userModel = require("../../models/user.model");

const hasValues = (values) => Array.isArray(values) && values.length > 0;

const buildAudienceQuery = (audience) => {
  const query = {
    status: "active",
  };

  if (!audience.allUsers && hasValues(audience.userIds)) {
    query._id = { $in: audience.userIds };
  }

  if (hasValues(audience.roles)) {
    query.roles = { $in: audience.roles };
  }

  if (hasValues(audience.schoolIds)) {
    query.schoolId = { $in: audience.schoolIds };
  }

  if (hasValues(audience.programIds)) {
    query["academicAssignments.programId"] = { $in: audience.programIds };
  }

  if (hasValues(audience.specializationIds)) {
    const specializationFilter = {
      "academicAssignments.specializationId": { $in: audience.specializationIds },
    };

    if (audience.includeUsersWithoutSpecialization) {
      query.$or = [
        specializationFilter,
        { "academicAssignments.specializationId": null },
        { "academicAssignments.specializationId": { $exists: false } },
      ];
    } else {
      Object.assign(query, specializationFilter);
    }
  }

  if (hasValues(audience.semesterIds)) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { currentSemester: { $in: audience.semesterIds } },
        { "academicAssignments.semesterId": { $in: audience.semesterIds } },
      ],
    });
  }

  if (hasValues(audience.excludeUserIds)) {
    const existingIdFilter = query._id || {};
    query._id = {
      ...existingIdFilter,
      $nin: audience.excludeUserIds,
    };
  }

  if (hasValues(audience.excludeRoles)) {
    query.roles = {
      ...(query.roles || {}),
      $nin: audience.excludeRoles,
    };
  }

  return query;
};

const resolveAudience = async (audience, session = null) => {
  const query = buildAudienceQuery(audience);
  const request = userModel.find(query).select("_id").lean();

  if (session) {
    request.session(session);
  }

  const users = await request;

  return {
    users,
    count: users.length,
  };
};

module.exports = {
  buildAudienceQuery,
  resolveAudience,
};
