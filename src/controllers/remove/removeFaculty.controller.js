const subjectModel = require("../../models/subject.model");
const userModel = require("../../models/user.model");
const auditLogModel = require("../../models/auditlog.model");

const removeFacultyFromSubject = async (req, res) => {
    try {

        const { subjectId } = req.params;
        const { facultyId } = req.body;

        const allowedRoles = [
            "superAdmin",
            "schoolAdmin"
        ];

        if (
            !req.user.roles.some(role =>
                allowedRoles.includes(role)
            )
        ) {
            return res.status(403).json({
                message: "Unauthorized"
            });
        }

        if (!facultyId) {
            return res.status(400).json({
                message: "Faculty ID is required"
            });
        }

        const subject = await subjectModel.findById(subjectId);

        if (!subject) {
            return res.status(404).json({
                message: "Subject not found"
            });
        }

        const faculty = await userModel.findById(facultyId);

        if (!faculty) {
            return res.status(404).json({
                message: "Faculty not found"
            });
        }

        if (!faculty.roles.includes("faculty")) {
            return res.status(400).json({
                message: "User is not a faculty member"
            });
        }

        const isAssigned = subject.facultyIds.some(
            id => id.toString() === facultyId.toString()
        );

        if (!isAssigned) {
            return res.status(400).json({
                message: "Faculty is not assigned to this subject"
            });
        }

        // Remove from Subject
        subject.facultyIds = subject.facultyIds.filter(
            id => id.toString() !== facultyId.toString()
        );

        subject.updatedBy = req.user._id;

        await subject.save();

        if (
            subject.coordinatorId &&
            subject.coordinatorId.toString() === facultyId.toString()
        ) {
            return res.status(400).json({
                message:
                    "Cannot remove faculty while assigned as coordinator"
            });
        }

        // Remove from Faculty academicAssignments
        for (const assignment of faculty.academicAssignments) {

            assignment.assignedSubjects =
                assignment.assignedSubjects.filter(
                    id =>
                        id.toString() !==
                        subject._id.toString()
                );
        }

        await faculty.save();

        await auditLogModel.create({
            performedBy: req.user._id,
            action: "UPDATE",
            module: "Subject",
            targetId: subject._id,
            targetName: subject.name,
            remarks: `Faculty removed from subject`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Faculty removed successfully"
        });

    } catch (err) {

        console.error(err);

        try {
            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "FACULTY_REMOVAL_FAILED",
                module: "Subject",
                targetId: req.params?.subjectId,
                remarks: err.message,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });
        } catch (auditErr) {
            console.error(auditErr);
        }

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    removeFacultyFromSubject
};