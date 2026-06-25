const mongoose = require("mongoose");

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildPagination = (query, maxLimit = 100) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || 10, 1),
    maxLimit
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildSearchFilter = (search, fields = []) => {
  if (!search || !fields.length) {
    return {};
  }

  const regex = new RegExp(escapeRegex(search.trim()), "i");

  return {
    $or: fields.map((field) => ({
      [field]: regex,
    })),
  };
};

const normalizeObjectIdFilter = (value) => {
  if (!value) {
    return undefined;
  }

  return mongoose.isValidObjectId(value) ? value : "000000000000000000000000";
};

const buildAllowedFilters = (query, filterMap = {}) => {
  const filter = {};

  Object.entries(filterMap).forEach(([queryKey, config]) => {
    const value = query[queryKey];

    if (value === undefined || value === "") {
      return;
    }

    const field = typeof config === "string" ? config : config.field;
    const type = typeof config === "string" ? "string" : config.type || "string";

    if (type === "objectId") {
      filter[field] = normalizeObjectIdFilter(value);
      return;
    }

    if (type === "boolean") {
      filter[field] = value === "true" || value === true;
      return;
    }

    if (type === "date") {
      const date = new Date(value);
      filter[field] = Number.isNaN(date.getTime()) ? new Date(0) : date;
      return;
    }

    if (type === "dateDay") {
      const start = new Date(value);
      if (Number.isNaN(start.getTime())) {
        filter[field] = new Date(0);
        return;
      }

      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter[field] = { $gte: start, $lt: end };
      return;
    }

    filter[field] = value;
  });

  return filter;
};

const buildSort = (query, allowedSortFields = ["createdAt"]) => {
  const sortBy = allowedSortFields.includes(query.sortBy)
    ? query.sortBy
    : "createdAt";
  const order = query.order === "asc" ? 1 : -1;

  return {
    [sortBy]: order,
  };
};

const buildPaginationMeta = ({ page, limit, total, count }) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    count,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  buildAllowedFilters,
  buildPagination,
  buildPaginationMeta,
  buildSearchFilter,
  buildSort,
  escapeRegex,
  normalizeObjectIdFilter,
};
