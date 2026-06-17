const express = require('express')
const authMiddleware = require("../middlewares/auth.middleware")
const assigneFaculty = require("../controllers/assigne/assigneFaculty.controller")
const assigneCoordinator = require("../controllers/assigne/assigneCoordinator.controller")

const router = express.Router()


router.post('/subjects/:subjectId/assign-faculty',authMiddleware.chkUser,assigneFaculty.assignFacultyToSubject)
router.post('/subjects/:subjectId/assign-coordinator',authMiddleware.chkUser,assigneCoordinator.assignCoordinatorToSubject)



module.exports = router