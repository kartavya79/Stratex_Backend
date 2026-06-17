const express = require('express')
const authMiddleware = require("../middlewares/auth.middleware")
const removeFaculty = require("../controllers/remove/removeFaculty.controller")
const removeCoordinator= require("../controllers/remove/removeCoordinator.controller")
const removeSubject = require("../controllers/remove/softRemoveSubject.controller")
const router = express.Router()



// delete staff
router.delete('/subjects/:subjectId/remove-faculty',authMiddleware.chkUser,removeFaculty.removeFacultyFromSubject)
router.delete('/subjects/:subjectId/remove-coordinator',authMiddleware.chkUser,removeCoordinator.removeCoordinatorFromSubject)


// delete subject 
router.delete("/subjects/:subjectId/remove-subject",authMiddleware.chkUser,removeSubject.deleteSubject)

module.exports = router