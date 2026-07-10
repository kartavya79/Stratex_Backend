const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const authController = require("../controllers/auth.controller");
const { getUsers } = require("../controllers/get/getUsers.controller");
const { getUserById } = require("../controllers/get/getUserById.controller");
const { updateUser } = require("../controllers/update/updateUser.controller");
const { softRemoveUser } = require("../controllers/remove/softRemoveUser.controller");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const mapIdToUserId = (req, _res, next) => {
  req.params.userId = req.params.id;
  next();
};

router.get("/", authMiddleware.chkUser, getUsers);
router.get("/:id", authMiddleware.chkUser, validate.objectIdParam("id"), mapIdToUserId, getUserById);
router.post("/", authMiddleware.chkUser, upload.single("profile"), authController.register);
router.put(
  "/:id",
  authMiddleware.chkUser,
  validate.objectIdParam("id"),
  upload.single("profile"),
  validate({
    firstName: { minLength: 2 },
    lastName: { minLength: 2 },
    personalEmail: { type: "email" },
    status: { enum: ["active", "inactive", "suspended"] },
  }),
  mapIdToUserId,
  updateUser
);
router.delete("/:id", authMiddleware.chkUser, validate.objectIdParam("id"), mapIdToUserId, softRemoveUser);

module.exports = router;
