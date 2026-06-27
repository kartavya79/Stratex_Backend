const userModel = require("../../models/user.model");

const normalizeEmail = (email) => email?.toLowerCase()?.trim();

const assertNoPayloadDuplicates = (usersData) => {
  const emailSet = new Set();
  const institutionIdSet = new Set();
  const personalEmailSet = new Set();

  for (const user of usersData) {
    const universityEmail = normalizeEmail(user.universityAccount?.universityEmail);
    const institutionId = user.universityAccount?.institutionId?.trim();
    const personalEmail = normalizeEmail(user.personalEmail);

    if (universityEmail && emailSet.has(universityEmail)) {
      const error = new Error(`Duplicate university email: ${universityEmail}`);
      error.statusCode = 400;
      throw error;
    }

    if (institutionId && institutionIdSet.has(institutionId)) {
      const error = new Error(`Duplicate institution ID: ${institutionId}`);
      error.statusCode = 400;
      throw error;
    }

    if (personalEmail && personalEmailSet.has(personalEmail)) {
      const error = new Error(`Duplicate personal email: ${personalEmail}`);
      error.statusCode = 400;
      throw error;
    }

    if (universityEmail) emailSet.add(universityEmail);
    if (institutionId) institutionIdSet.add(institutionId);
    if (personalEmail) personalEmailSet.add(personalEmail);
  }
};

const assertNoExistingUsers = async (usersData) => {
  const universityEmails = usersData
    .map((user) => normalizeEmail(user.universityAccount?.universityEmail))
    .filter(Boolean);
  const institutionIds = usersData
    .map((user) => user.universityAccount?.institutionId?.trim())
    .filter(Boolean);
  const personalEmails = usersData
    .map((user) => normalizeEmail(user.personalEmail))
    .filter(Boolean);

  const existingUser = await userModel
    .findOne({
      $or: [
        { "universityAccount.universityEmail": { $in: universityEmails } },
        { "universityAccount.institutionId": { $in: institutionIds } },
      ],
    })
    .lean();

  if (existingUser) {
    const error = new Error("User Already Exsists With Us Try To Rest Your Password ");
    error.statusCode = 422;
    throw error;
  }

  if (personalEmails.length) {
    const existingPersonalEmail = await userModel
      .findOne({ personalEmail: { $in: personalEmails } })
      .lean();

    if (existingPersonalEmail) {
      const error = new Error("Personal email already in use");
      error.statusCode = 409;
      throw error;
    }
  }
};

module.exports = {
  assertNoExistingUsers,
  assertNoPayloadDuplicates,
  normalizeEmail,
};
