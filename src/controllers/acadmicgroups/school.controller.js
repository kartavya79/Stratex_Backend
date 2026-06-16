const schoolModel = require("../../models/school.model")
const { schoolImg } = require("../../services/storage.service")
const auditLogModel = require("../../models/auditlog.model")

const createSchool = async (req, res) => {
    try {
        const { name, description, status, slug } = req.body;

        // Authorization
        const allowedRoles = ["superAdmin"];

        if (
            !req.user.roles.some(role =>
                allowedRoles.includes(role)
            )
        ) {
            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "UNAUTHORIZED_CREATE_ATTEMPT",
                module: "School",
                remarks: "Unauthorized School Creation",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });

            return res.status(403).json({
                message: "Unauthorized"
            });
        }

        if (
            !name ||
            !slug ||
            !description
        ) {
            return res.status(400).json({
                message: "All required fields are required"
            });
        }

        const allowedStatus = ["active", "inactive"];

        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const isSchool = await schoolModel.findOne({
            $or: [
                { name: name.trim() },
                { slug: slug.trim() }
            ]
        });

        if (isSchool) {
            await auditLogModel.create({
                performedBy: req.user._id,
                action: "REJECT",
                module: "School",
                targetId: isSchool._id,
                targetName: isSchool.name,
                remarks: "School with same name or slug already exists",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });

            return res.status(409).json({
                message: "School with same name or slug already exists",
                school: isSchool._id
            });
        }

        let schoolLogo;
        let schoolBanner;

        try {
            const logo = req.files?.logo?.[0];
            const banner = req.files?.banner?.[0];

            if (logo) {
                schoolLogo = await schoolImg(
                    logo.buffer,
                    logo.originalname,
                    slug,
                    "logo"
                );
            }

            if (banner) {
                schoolBanner = await schoolImg(
                    banner.buffer,
                    banner.originalname,
                    slug,
                    "banner"
                );
            }
        } catch (uploadError) {
            console.error(uploadError);

            return res.status(500).json({
                message: "Image upload failed"
            });
        }

        const school = await schoolModel.create({
            name,
            description: description ? description : null,
            logo: schoolLogo ? schoolLogo.url : null,
            banner: schoolBanner ? schoolBanner.url : null,
            status: status ? status : "active",
            createdBy: req.user._id,
            slug
        });


        await auditLogModel.create({
            performedBy: req.user._id,
            action: "CREATE",
            module: "School",
            targetId: school._id,
            targetName: school.name,
            remarks: "School created successfully",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({
            message: "School created successfully",
            school:school._id
        });

    }
    catch (err) {
        console.error(err);
        try {
            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "REJECT",
                module: "School",
                targetName: req.body?.name,
                remarks: err.message,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });
        } catch (auditErr) {
            console.error(auditErr);
        }
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}


module.exports = { schools: createSchool }