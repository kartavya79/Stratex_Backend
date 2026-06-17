const subjectModel = require("../../models/subject.model");
const auditLogModel = require("../../models/auditlog.model");

const removeCoordinatorFromSubject = async (req, res) => {
    try {

        const { subjectId } = req.params;

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

            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "UNAUTHORIZED_CREATE_ATTEMPT",
                module: "Subject",
                remarks: "Unauthorized coordinator removal attempt",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });

            return res.status(403).json({
                message: "Unauthorized"
            });
        }

        // Subject Validation
        const subject = await subjectModel.findById(subjectId);

        if (!subject) {
            return res.status(404).json({
                message: "Subject not found"
            });
        }

        if (!subject.coordinatorId) {
            return res.status(400).json({
                message: "No coordinator assigned to this subject"
            });
        }

        const previousCoordinator =
            subject.coordinatorId;

        // Remove Coordinator
        subject.coordinatorId = null;
        subject.updatedBy = req.user._id;

        await subject.save();

        await auditLogModel.create({
            performedBy: req.user._id,
            action: "UPDATE",
            module: "Subject",
            targetId: subject._id,
            targetName: subject.name,
            remarks: "Coordinator removed successfully",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Coordinator removed successfully",
            subject,
            removedCoordinatorId: previousCoordinator
        });

    } catch (err) {

        console.error(err);

        try {

            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "COORDINATOR_REMOVAL_FAILED",
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
    removeCoordinatorFromSubject
};