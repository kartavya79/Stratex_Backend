const subjectModel = require("../../models/subject.model");
const auditLogModel = require("../../models/auditlog.model");

const deleteSubject = async (req, res) => {
    try {

        const { subjectId } = req.params;

        const allowedRoles = [
            "superAdmin",
            "schoolAdmin"
        ];

        // Authorization
        if (
            !req.user.roles.some(role =>
                allowedRoles.includes(role)
            )
        ) {

            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "UNAUTHORIZED_DELETE_ATTEMPT",
                module: "Subject",
                remarks: "Unauthorized subject deletion attempt",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });

            return res.status(403).json({
                message: "Unauthorized"
            });
        }

        const subject =
            await subjectModel.findById(subjectId);

        if (!subject) {
            return res.status(404).json({
                message: "Subject not found"
            });
        }

        // Already inactive
        if (subject.status === "inactive") {
            return res.status(400).json({
                message: "Subject is already inactive"
            });
        }

        // Soft Delete
        subject.status = "inactive";
        subject.updatedBy = req.user._id;

        await subject.save();

        await auditLogModel.create({
            performedBy: req.user._id,
            action: "DELETE",
            module: "Subject",
            targetId: subject._id,
            targetName: subject.name,
            remarks: "Subject deactivated successfully",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Subject deleted successfully"
        });

    } catch (err) {

        console.error(err);

        try {

            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "SUBJECT_DELETE_FAILED",
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
    deleteSubject
};