const crypto = require("crypto");
const notificationModel = require("../../models/notificaton.Model");

const DEFAULT_WINDOW_MS =
  Number(process.env.NOTIFICATION_DUPLICATE_WINDOW_MS) || 5 * 60 * 1000;

const sortObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortObject).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(value[key]);
        return acc;
      }, {});
  }

  return value;
};

const buildDuplicatePayload = ({ title, message, type, reference, audience }) => ({
  title: String(title || "").trim(),
  message: String(message || "").trim(),
  type,
  reference: {
    model: reference?.model || null,
    id: reference?.id ? String(reference.id) : null,
  },
  audience: sortObject(audience || {}),
});

const createDuplicateKey = (payload) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(buildDuplicatePayload(payload)))
    .digest("hex");
};

const findRecentDuplicate = async (payload, options = {}) => {
  const duplicateKey = createDuplicateKey(payload);

  if (options.allowDuplicate) {
    return {
      duplicateKey,
      notification: null,
    };
  }

  const createdAfter = new Date(Date.now() - (options.windowMs || DEFAULT_WINDOW_MS));

  const notification = await notificationModel
    .findOne({
      duplicateKey,
      createdAt: { $gte: createdAfter },
    })
    .lean();

  return {
    duplicateKey,
    notification,
  };
};

module.exports = {
  createDuplicateKey,
  findRecentDuplicate,
};
