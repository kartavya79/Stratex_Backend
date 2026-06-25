const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const eventController = require("../controllers/event.controller");

const router = express.Router();

router.get("/", authMiddleware.chkUser, eventController.getEvents);
router.get("/:id", authMiddleware.chkUser, validate.objectIdParam("id"), eventController.getEventById);
router.post(
  "/",
  authMiddleware.chkUser,
  validate({
    title: { required: true, minLength: 2 },
    startDate: { required: true, type: "date" },
    endDate: { type: "date" },
    status: { enum: ["scheduled", "completed", "cancelled", "inactive"] },
  }),
  eventController.createEvent
);
router.put(
  "/:id",
  authMiddleware.chkUser,
  validate.objectIdParam("id"),
  validate({
    title: { minLength: 2 },
    startDate: { type: "date" },
    endDate: { type: "date" },
    status: { enum: ["scheduled", "completed", "cancelled", "inactive"] },
  }),
  eventController.updateEvent
);
router.delete("/:id", authMiddleware.chkUser, validate.objectIdParam("id"), eventController.deleteEvent);

module.exports = router;
