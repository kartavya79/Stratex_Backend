const subjectModel = require("../../models/subject.model");
const schoolModel = require("../../models/school.model");
const programModel = require("../../models/program.model");
const specializationModel = require("../../models/specelization.model");
const auditLogModel = require("../../models/auditlog.model");

const createSubject = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            schoolId,
            programId,
            specializationId,
            semester,
            credits,
            status
        } = req.body;

        const allowedRoles = ["superAdmin", "schoolAdmin"];

        if (
            !req.user.roles.some(role =>
                allowedRoles.includes(role)
            )
        ) {
            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "UNAUTHORIZED_CREATE_ATTEMPT",
                module: "Subject",
                remarks: "Unauthorized subject creation",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });

            return res.status(403).json({
                message: "Unauthorized"
            });
        }

        if (
            !code ||
            !name ||
            !schoolId ||
            !programId ||
            !semester
        ) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        const school = await schoolModel.findById(schoolId);

        if (!school) {
            return res.status(404).json({
                message: "School not found"
            });
        }

        const program = await programModel.findById(programId);

        if (!program) {
            return res.status(404).json({
                message: "Program not found"
            });
        }

        if (
            program.schoolId.toString() !==
            schoolId.toString()
        ) {
            return res.status(400).json({
                message:
                    "Program does not belong to selected school"
            });
        }

        if (
            req.user.roles.includes("schoolAdmin") &&
            req.user.schoolId.toString() !==
                schoolId.toString()
        ) {
            return res.status(403).json({
                message:
                    "School Admin can only create subjects for their own school"
            });
        }

        if (specializationId) {
            const specialization =
                await specializationModel.findById(
                    specializationId
                );

            if (!specialization) {
                return res.status(404).json({
                    message: "Specialization not found"
                });
            }

            if (
                specialization.programId.toString() !==
                programId.toString()
            ) {
                return res.status(400).json({
                    message:
                        "Specialization does not belong to selected program"
                });
            }
        }

        const existingSubject =
            await subjectModel.findOne({
                code: code.trim().toUpperCase(),
                programId
            });

        if (existingSubject) {
            return res.status(409).json({
                message:
                    "Subject code already exists in this program"
            });
        }

        const subject = await subjectModel.create({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            description,
            schoolId,
            programId,
            specializationId,
            semester,
            credits,
            status,
            createdBy: req.user._id
        });

        await auditLogModel.create({
            performedBy: req.user._id,
            action: "CREATE",
            module: "Subject",
            targetId: subject._id,
            targetName: subject.name,
            remarks: "Subject created successfully",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({
            message: "Subject created successfully",
            subject
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

module.exports = { subjects:createSubject };