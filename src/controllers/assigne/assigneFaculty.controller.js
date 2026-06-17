const subjectModel = require("../../models/subject.model");
const userModel = require("../../models/user.model");
const auditLogModel = require("../../models/auditlog.model");

const assignFacultyToSubject = async (req, res) => {
    try {

        const { subjectId } = req.params;
        const { facultyIds } = req.body;

        // Authorization
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

        if (
            !facultyIds ||
            !Array.isArray(facultyIds) ||
            facultyIds.length === 0
        ) {
            return res.status(400).json({
                message: "Faculty IDs are required"
            });
        }

        const subject =
            await subjectModel.findById(subjectId);

        if (!subject) {
            return res.status(404).json({
                message: "Subject not found"
            });
        }

        const faculties =
            await userModel.find({
                _id: { $in: facultyIds }
            });

        if (
            faculties.length !== facultyIds.length
        ) {
            return res.status(404).json({
                message:
                    "One or more faculty users not found"
            });
        }

        for (const faculty of faculties) {

            if (
                !faculty.roles.includes("faculty")
            ) {
                return res.status(400).json({
                    message:
                        `${faculty.fullName} is not a faculty member`
                });
            }

            if (
                faculty.schoolId.toString() !==
                subject.schoolId.toString()
            ) {
                return res.status(400).json({
                    message:
                        `${faculty.fullName} belongs to another school`
                });
            }
        }

        // Remove duplicates
        const mergedFacultyIds = [
            ...new Set([
                ...subject.facultyIds.map(id => id.toString()),
                ...facultyIds
            ])
        ];

        subject.facultyIds = mergedFacultyIds;
        subject.updatedBy = req.user._id;

        await subject.save();

        // Update Faculty Records
        for (const faculty of faculties) {

            const assignment =
                faculty.academicAssignments.find(
                    a =>
                        a.programId?.toString() ===
                        subject.programId.toString()
                );

            if (assignment) {

                const alreadyAssigned =
                    assignment.assignedSubjects.some(
                        id =>
                            id.toString() ===
                            subject._id.toString()
                    );

                if (!alreadyAssigned) {
                    assignment.assignedSubjects.push(
                        subject._id
                    );
                }

                await faculty.save();
            }
        }

        await auditLogModel.create({
            performedBy: req.user._id,
            action: "UPDATE",
            module: "Subject",
            targetId: subject._id,
            targetName: subject.name,
            remarks: "Faculty assigned to subject",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message:
                "Faculty assigned successfully",
            subject
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    assignFacultyToSubject
};