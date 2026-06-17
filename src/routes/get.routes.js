const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");

const { getSubjects } = require("../controllers/get/getSubject/getSubject.controller");
const { getSubjectById } = require("../controllers/get/getSubject/getSubjectById.controller");

const router = express.Router();

// Get all subjects (supports query params)
router.get(
    "/subjects",
    authMiddleware.chkUser,
    getSubjects
);

// Get subject by ID
router.get(
    "/subjects/:subjectId",
    authMiddleware.chkUser,
    getSubjectById
);

module.exports = router;