const eventModel = require("../models/event.model");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const auditLogModel = require("../models/auditlog.model");
const {
  createListController,
  createGetByIdController,
  createUpdateController,
  createDeleteController
} = require("./rest.controller");

const options = {
  resourceName: "Event",
  resourceKey: "event",
  collectionName: "events",
  searchFields: ["title", "description", "location"],
  filterMap: {
    status: "status",
    date: { field: "startDate", type: "dateDay" },
  },
  getExtraFilters: (query) => {
    if (query.upcoming === "true" || query.upcoming === true) {
      if (query.date) {
        const start = new Date(query.date);

        if (!Number.isNaN(start.getTime())) {
          const end = new Date(start);
          end.setDate(end.getDate() + 1);

          return {
            startDate: {
              $gte: start > new Date() ? start : new Date(),
              $lt: end,
            },
          };
        }
      }

      return {
        startDate: { $gte: new Date() },
      };
    }

    return {};
  },
  allowedSortFields: ["title", "startDate", "status", "createdAt", "updatedAt"],
  populate: [
    { path: "createdBy", select: "firstName lastName" },
    { path: "updatedBy", select: "firstName lastName" }
  ]
};

const getEvents = createListController(eventModel, options);
const getEventById = createGetByIdController(eventModel, options);
const updateEvent = createUpdateController(eventModel, options);
const deleteEvent = createDeleteController(eventModel, options);

const createEvent = async (req, res) => {
  try {
    const event = await eventModel.create({
      ...req.body,
      createdBy: req.user._id
    });

    await auditLogModel.create({
      performedBy: req.user._id,
      action: "CREATE",
      module: "Event",
      targetId: event._id,
      targetName: event.title,
      remarks: "Event created successfully",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, 201, "Event created successfully", event);
  } catch (err) {
    console.error(err);

    return sendError(res, 500, "Internal Server Error");
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
