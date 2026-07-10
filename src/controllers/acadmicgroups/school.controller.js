const schoolModel = require("../../models/school.model")
const { schoolImg } = require("../../services/storage.service")
const auditLogModel = require("../../models/auditlog.model")

const getTrimmedValue = (value) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed || null;
};

const createSchool = async (req, res) => {
    try {
        const {
            name,
            description,
            status,
            slug,
            email,
            website,
            code,
            vision,
            mission
        } = req.body;

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
            !slug 
            
        ) {
            return res.status(400).json({
                message: "All required fields are required"
            });
        }


        const slugRegex = /^[a-z0-9-]+$/;

        if (!slugRegex.test(slug)) {
            return res.status(400).json({
                message: "Invalid slug format"
            });
        }

        const normalizedName = name.trim();
        const normalizedSlug = slug.trim();
        const normalizedDescription = description?description.trim():null;


        if (normalizedName.length < 3) {
            return res.status(400).json({
                message: "School name must be at least 3 characters"
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
                { name: normalizedName },
                { slug: normalizedSlug }
            ]
        });

        if (isSchool) {
            await auditLogModel.create({
                performedBy: req.user._id,
                action: "SCHOOL_CREATION_FAILED",
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
                    normalizedSlug,
                    "logo"
                );
            }

            if (banner) {
                schoolBanner = await schoolImg(
                    banner.buffer,
                    banner.originalname,
                    normalizedSlug,
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
            name: normalizedName,
            description: description ? description : null,
            email: email ? email.trim() : null,
            website: website ? website.trim() : null,
            code: code ? code.trim() : null,
            vision: vision ? vision.trim() : null,
            mission: mission ? mission.trim() : null,
            logo: schoolLogo ? schoolLogo.url : null,
            banner: schoolBanner ? schoolBanner.url : null,
            status: status ? status : "active",
            createdBy: req.user._id,
            slug: normalizedSlug
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
            school
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

const updateSchool = async (req, res) => {
    try {
        const school = await schoolModel.findById(req.params.id);

        if (!school) {
            return res.status(404).json({
                message: "School not found"
            });
        }

        const {
            name,
            description,
            status,
            slug,
            email,
            website,
            code,
            vision,
            mission
        } = req.body;

        const update = {
            updatedBy: req.user._id
        };

        if (name !== undefined) update.name = getTrimmedValue(name);
        if (description !== undefined) update.description = getTrimmedValue(description);
        if (email !== undefined) update.email = getTrimmedValue(email);
        if (website !== undefined) update.website = getTrimmedValue(website);
        if (code !== undefined) update.code = getTrimmedValue(code);
        if (vision !== undefined) update.vision = getTrimmedValue(vision);
        if (mission !== undefined) update.mission = getTrimmedValue(mission);

        if (slug !== undefined) {
            const normalizedSlug = slug.trim();
            const slugRegex = /^[a-z0-9-]+$/;

            if (!slugRegex.test(normalizedSlug)) {
                return res.status(400).json({
                    message: "Invalid slug format"
                });
            }

            update.slug = normalizedSlug;
        }

        if (status !== undefined) {
            const allowedStatus = ["active", "inactive"];

            if (!allowedStatus.includes(status)) {
                return res.status(400).json({
                    message: "Invalid status"
                });
            }

            update.status = status;
        }

        if (update.name && update.name.length < 3) {
            return res.status(400).json({
                message: "School name must be at least 3 characters"
            });
        }

        const uploadSlug = update.slug || school.slug;

        try {
            const logo = req.files?.logo?.[0];
            const banner = req.files?.banner?.[0];

            if (logo) {
                const schoolLogo = await schoolImg(
                    logo.buffer,
                    logo.originalname,
                    uploadSlug,
                    "logo"
                );
                update.logo = schoolLogo.url;
            }

            if (banner) {
                const schoolBanner = await schoolImg(
                    banner.buffer,
                    banner.originalname,
                    uploadSlug,
                    "banner"
                );
                update.banner = schoolBanner.url;
            }
        } catch (uploadError) {
            console.error(uploadError);

            return res.status(500).json({
                message: "Image upload failed"
            });
        }

        const updatedSchool = await schoolModel.findByIdAndUpdate(
            req.params.id,
            update,
            {
                new: true,
                runValidators: true
            }
        );

        await auditLogModel.create({
            performedBy: req.user._id,
            action: "UPDATE",
            module: "School",
            targetId: updatedSchool._id,
            targetName: updatedSchool.name,
            remarks: "School updated successfully",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "School updated successfully",
            school: updatedSchool
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

module.exports = { schools: createSchool, updateSchool }
