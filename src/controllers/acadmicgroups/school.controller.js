const mongoose = require("mongoose");
const schoolModel = require("../../models/school.model")
const { schoolImg } = require("../../services/storage.service")
const auditLogModel = require("../../models/auditlog.model")
const { parseCsvBuffer } = require("../../utils/csvParser");

const getTrimmedValue = (value) => {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed || null;
};

const normalizeSlug = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/(^-|-$)/g, "");

const isValidEmail = (value) =>
    !!String(value || "").trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

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

        // Auto-generate website from base URL and slug when not provided
        const baseUrl = process.env.SCHOOL_BASE_URL ? String(process.env.SCHOOL_BASE_URL).trim() : null;
        const websiteValue = website && String(website).trim()
            ? String(website).trim()
            : baseUrl
                ? `${baseUrl.replace(/\/$/, "")}/${normalizedSlug}`
                : null;

        const school = await schoolModel.create({
            name: normalizedName,
            description: description ? description : null,
            email: email ? email.trim() : null,
            website: websiteValue,
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

const createBulkSchools = async (req, res) => {
    try {
        const allowedRoles = ["superAdmin"];

        if (!req.user.roles.some((role) => allowedRoles.includes(role))) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: "CSV file is required" });
        }

        const { rows, errors: parseErrors } = parseCsvBuffer(req.file.buffer);

        if (parseErrors.length) {
            return res.status(400).json({ message: "Invalid CSV data", errors: parseErrors });
        }

        const FAILURE_THRESHOLD_PERCENT = Number(process.env.BULK_FAILURE_THRESHOLD_PERCENT || 10);

        const totalRows = rows.length;
        const validationErrors = [];
        const toCreate = [];

        // First pass: validate all rows without creating anything
        for (let index = 0; index < rows.length; index += 1) {
            const rowNumber = index + 2;
            const row = rows[index];
            const name = String(row.name || "").trim();
            const slugValue = String(row.slug || "").trim();
            const slug = normalizeSlug(slugValue || name);
            const description = row.description ? String(row.description).trim() : null;
            const email = row.email ? String(row.email).trim() : null;
            const website = row.website ? String(row.website).trim() : null;
            const code = row.code ? String(row.code).trim() : null;
            const vision = row.vision ? String(row.vision).trim() : null;
            const mission = row.mission ? String(row.mission).trim() : null;
            const status = String(row.status || "active").trim().toLowerCase();

            if (!name) {
                validationErrors.push(`Row ${rowNumber}: School name is required`);
                continue;
            }

            if (!slug) {
                validationErrors.push(`Row ${rowNumber}: Valid slug is required`);
                continue;
            }

            if (!/^[a-z0-9-]+$/.test(slug)) {
                validationErrors.push(`Row ${rowNumber}: School slug must contain only lowercase letters, numbers and hyphens`);
                continue;
            }

            if (email && !isValidEmail(email)) {
                validationErrors.push(`Row ${rowNumber}: Invalid email address`);
                continue;
            }

            if (!["active", "inactive"].includes(status)) {
                validationErrors.push(`Row ${rowNumber}: Status must be either active or inactive`);
                continue;
            }

            const existingSchool = await schoolModel.findOne({
                $or: [
                    { name },
                    { slug }
                ]
            });

            if (existingSchool) {
                validationErrors.push(`Row ${rowNumber}: School with same name or slug already exists`);
                continue;
            }

            toCreate.push({ name, slug, description, email, website, code, vision, mission, status });
        }

        const failingCount = validationErrors.length;
        const failingPercent = totalRows === 0 ? 0 : (failingCount / totalRows) * 100;

        if (failingPercent > FAILURE_THRESHOLD_PERCENT) {
            return res.status(400).json({ message: `Bulk import rejected: ${failingPercent.toFixed(2)}% rows failed validation which exceeds threshold of ${FAILURE_THRESHOLD_PERCENT}%`, errors: validationErrors });
        }

        // Second pass: create records for validated rows
        const createdSchools = [];
        const errors = [];

        for (let i = 0; i < toCreate.length; i += 1) {
            const rowNum = i + 2; // approximate row number (not exact if some rows were invalid)
            const item = toCreate[i];

            try {
                // Auto-generate website from base URL and slug when not provided
                const baseUrl = process.env.SCHOOL_BASE_URL ? String(process.env.SCHOOL_BASE_URL).trim() : null;
                const websiteValue = item.website && String(item.website).trim()
                    ? String(item.website).trim()
                    : baseUrl
                        ? `${baseUrl.replace(/\/$/, "")}/${item.slug}`
                        : null;

                const school = await schoolModel.create({
                    name: item.name,
                    slug: item.slug,
                    description: item.description,
                    email: item.email,
                    website: websiteValue,
                    code: item.code,
                    vision: item.vision,
                    mission: item.mission,
                    status: item.status,
                    createdBy: req.user._id
                });

                createdSchools.push(school);

                await auditLogModel.create({
                    performedBy: req.user._id,
                    action: "BULK_CREATE",
                    module: "School",
                    targetId: school._id,
                    targetName: school.name,
                    remarks: "School created through bulk import",
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"]
                });
            } catch (rowError) {
                console.error(rowError);
                if (rowError.code === 11000) {
                    errors.push(`Row ${rowNum}: Duplicate school detected`);
                } else {
                    errors.push(`Row ${rowNum}: ${rowError.message}`);
                }
            }
        }

        // combine pre-validation errors and any runtime creation errors for reporting
        const allErrors = [...validationErrors, ...errors];

        return res.status(201).json({
            message: "Bulk school import completed",
            createdCount: createdSchools.length,
            errors: allErrors
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Unable to import bulk schools" });
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

module.exports = { schools: createSchool, bulkSchools: createBulkSchools, updateSchool }
