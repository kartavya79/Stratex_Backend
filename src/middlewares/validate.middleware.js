const mongoose = require("mongoose");
const { sendError } = require("../utils/apiResponse");

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validate = (schema = {}) => (req, res, next) => {
  const errors = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const value = req.body[field];

    if (rules.required && isEmpty(value)) {
      errors.push(`${field} is required`);
      return;
    }

    if (isEmpty(value)) {
      return;
    }

    if (rules.type === "email" && !isEmail(value)) {
      errors.push(`${field} must be a valid email`);
    }

    if (rules.type === "objectId" && !mongoose.isValidObjectId(value)) {
      errors.push(`${field} must be a valid ObjectId`);
    }

    if (rules.type === "number") {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        errors.push(`${field} must be a number`);
      }

      if (rules.min !== undefined && numberValue < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
    }

    if (rules.type === "date") {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        errors.push(`${field} must be a valid date`);
      }
    }

    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
    }

    if (rules.minLength && String(value).trim().length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }
  });

  if (errors.length) {
    return sendError(res, 400, "Validation failed", errors);
  }

  next();
};

validate.objectIdParam = (paramName = "id") => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[paramName])) {
    return sendError(res, 400, `${paramName} must be a valid ObjectId`);
  }

  next();
};

module.exports = validate;
