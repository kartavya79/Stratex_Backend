const express = require('express')
const authMiddleware = require("../middlewares/auth.middleware")
const updateSubject = require("../controllers/update/updateSubject.controller")
const router = express.Router()


router.patch("/subjects/:subjectId",authMiddleware.chkUser,updateSubject.updateSubject)

module.exports = router