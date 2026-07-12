const express = require("express");
const router = express.Router();
const importController = require("../controllers/import.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Require authenticated users
router.use(authMiddleware.chkUser);

// GET combined references CSV
router.get("/references", importController.exportImportReferences);

module.exports = router;
