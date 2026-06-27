const crypto = require("crypto");

const createSetupToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return {
    rawToken,
    hashedToken,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
};

module.exports = {
  createSetupToken,
};
