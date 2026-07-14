const programModel = require("../../models/program.model");
const auditLogModel = require("../../models/auditlog.model");
const schoolModel = require("../../models/school.model");
const mongoose = require("mongoose");
const {
    assertDurationCanChange,
    assertProgramCanBeDeleted,
    generateMissingProgramSemesters,
    generateProgramSemesters
} = require("../../services/academic/semesterGeneration.service");
const { sendError, sendSuccess } = require("../../utils/apiResponse");
const { parseCsvBuffer } = require("../../utils/csvParser");

const normalizeProgramCode = (code) =>
    code
        ? String(code)
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
        : "";

const buildNameAcronym = (name) => {
    const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const acronym = words
        .filter((word) => !["of", "and", "the", "in", "for"].includes(word.toLowerCase()))
        .map((word) => word[0])
        .join("")
        .slice(0, 8)
        .toUpperCase();

    return acronym || "PROGRAM";
};

const getSchoolCode = (school) =>
    normalizeProgramCode(school?.code || school?.slug || school?.name || "SCH");

const generateUniqueProgramCode = async ({
    school,
    schoolId,
    name,
    excludeProgramId
}) => {
    const baseCode = normalizeProgramCode(`${getSchoolCode(school)}-${buildNameAcronym(name)}`);
    let candidate = baseCode;
    let counter = 2;

    while (
        await programModel.exists({
            schoolId,
            code: candidate,
            ...(excludeProgramId ? { _id: { $ne: excludeProgramId } } : {})
        })
    ) {
        candidate = `${baseCode}-${counter}`;
        counter += 1;
    }

    return candidate;
};

const assertProgramCodeAvailable = async ({
    code,
    schoolId,
    excludeProgramId
}) => {
    if (!code) return;

    const existingProgram = await programModel.exists({
        schoolId,
        code,
        ...(excludeProgramId ? { _id: { $ne: excludeProgramId } } : {})
    });

    if (existingProgram) {
        const error = new Error("Program code already exists in this school");
        error.statusCode = 409;
        throw error;
    }
};

const createProgram = async (req, res) => {
    try {
        const {
            name,
            code,
            schoolId,
            description,
            status,
            duration,
            degreeType
        } = req.body;

        // Authorization
        const allowedRoles = ["superAdmin", "schoolAdmin"];

        if (
            !req.user.roles.some(role =>
                allowedRoles.includes(role)
            )
        ) {
            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "UNAUTHORIZED_CREATE_ATTEMPT",
                module: "Program",
                remarks: "Unauthorized Program Creation",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });

            return res.status(403).json({
                message: "Unauthorized"
            });
        }

        // Required fields
        if (
            !name ||
            !schoolId  ||
            !duration ||
            !degreeType
        ) {
            return res.status(400).json({
                message: "All required fields are required"
            });
        }

        const normalizedName = name.trim();
        const normalizedCode = normalizeProgramCode(code);
        const normalizedDescription = description?description.trim():null;

        const parsedDuration = Number(duration);

        if (
            !Number.isInteger(parsedDuration) ||
            parsedDuration <= 0
        ) {
            return res.status(400).json({
                message: "Duration must be a positive integer"
            });
        }

        const allowedDegreeTypes = [
            "UG",
            "PG",
            "Diploma",
            "PhD"
        ];

        if (!allowedDegreeTypes.includes(degreeType)) {
            return res.status(400).json({
                message: "Invalid degree type"
            });
        }




        const allowedStatus = ["active", "inactive"];

        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({
                message: "Invalid school ID"
            });
        }
        const school = await schoolModel.findById(schoolId);

        if (!school) {
            return res.status(404).json({
                message: "School not found"
            });
        }

        // School Admin can only create programs in their own school
        if (
            req.user.roles.includes("schoolAdmin") &&
            req.user.schoolId.toString() !== schoolId.toString()
        ) {
            return res.status(403).json({
                message:
                    "School Admin can only create programs in their own school"
            });
        }

        // Duplicate check inside same school
        const existingProgram =
            await programModel.findOne({
                name: normalizedName,
                schoolId
            });

        if (existingProgram) {
            return res.status(409).json({
                message:
                    "Program already exists in this school"
            });
        }

        await assertProgramCodeAvailable({
            code: normalizedCode,
            schoolId
        });

        const programCode = normalizedCode || await generateUniqueProgramCode({
            school,
            schoolId,
            name: normalizedName
        });

        const session = await mongoose.startSession();
        let program;

        try {
            session.startTransaction();

            [program] = await programModel.create([{
                name: normalizedName,
                code: programCode,
                schoolId,
                description: normalizedDescription,
                status: status || "active",
                duration: parsedDuration,
                degreeType,
                createdBy: req.user._id
            }], { session, ordered: true });

            const semesterResult = await generateProgramSemesters({
                programId: program._id,
                duration: parsedDuration,
                userId: req.user._id,
                session
            });

            await auditLogModel.create([{
                performedBy: req.user._id,
                action: "CREATE",
                module: "Program",
                targetId: program._id,
                targetName: program.name,
                remarks: "Program created successfully",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            }, {
                performedBy: req.user._id,
                action: "SEMESTER_AUTO_GENERATED",
                module: "Semester",
                targetId: program._id,
                targetName: program.name,
                newData: {
                    programId: program._id,
                    generatedCount: semesterResult.upsertedCount || 0,
                    duration: parsedDuration
                },
                remarks: "Semesters automatically generated for program",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            }], { session, ordered: true });

            await session.commitTransaction();
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            await session.endSession();
        }

        return res.status(201).json({
            message: "Program created successfully",
            program
        });

    } catch (err) {
        console.error(err);

        try {
            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "PROGRAM_CREATION_FAILED",
                module: "Program",
                targetName: req.body?.name,
                remarks: err.message,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });
        } catch (auditErr) {
            console.error("Audit Log Error:", auditErr);
        }

        return res.status(err.statusCode || 500).json({
            message: err.statusCode ? err.message : "Internal Server Error"
        });
    }
};

const createBulkPrograms = async (req, res) => {
        try {
            const allowedRoles = ["superAdmin", "schoolAdmin"];

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

            // validation pass
            for (let index = 0; index < rows.length; index += 1) {
                const rowNumber = index + 2;
                const row = rows[index];
                const name = String(row.name || "").trim();
                const code = String(row.code || "").trim();
                const schoolIdRaw = String(row.schoolid || "").trim();
                const schoolSlug = String(row.schoolslug || "").trim().toLowerCase();
                const description = row.description ? String(row.description).trim() : null;
                const duration = Number(row.duration);
                const degreeType = String(row.degreetype || "").trim().toUpperCase();
                const status = String(row.status || "active").trim().toLowerCase();

                if (!name) {
                    validationErrors.push(`Row ${rowNumber}: Program name is required`);
                    continue;
                }

                if (!schoolIdRaw && !schoolSlug) {
                    validationErrors.push(`Row ${rowNumber}: schoolId or schoolSlug is required`);
                    continue;
                }

                if (!Number.isInteger(duration) || duration <= 0) {
                    validationErrors.push(`Row ${rowNumber}: Duration must be a positive integer`);
                    continue;
                }

                const allowedDegreeTypes = ["UG", "PG", "DIPLOMA", "PHD"];
                if (!allowedDegreeTypes.includes(degreeType)) {
                    validationErrors.push(`Row ${rowNumber}: degreeType must be UG, PG, Diploma or PhD`);
                    continue;
                }

                if (!["active", "inactive"].includes(status)) {
                    validationErrors.push(`Row ${rowNumber}: Status must be either active or inactive`);
                    continue;
                }

                let school = null;
                if (schoolIdRaw && mongoose.Types.ObjectId.isValid(schoolIdRaw)) {
                    school = await schoolModel.findById(schoolIdRaw);
                }
                if (!school && schoolSlug) {
                    school = await schoolModel.findOne({ slug: schoolSlug });
                }

                if (!school) {
                    validationErrors.push(`Row ${rowNumber}: School not found using schoolId or schoolSlug`);
                    continue;
                }

                if (req.user.roles.includes("schoolAdmin") && req.user.schoolId.toString() !== school._id.toString()) {
                    validationErrors.push(`Row ${rowNumber}: School Admin can only import programs for their own school`);
                    continue;
                }

                const normalizedCode = code ? normalizeProgramCode(code) : "";

                try {
                    const existingProgram = await programModel.findOne({
                        schoolId: school._id,
                        $or: [{ name }, { code: normalizedCode || undefined }].filter(Boolean)
                    });

                    if (existingProgram) {
                        validationErrors.push(`Row ${rowNumber}: Program already exists in this school`);
                        continue;
                    }
                } catch (lookupError) {
                    validationErrors.push(`Row ${rowNumber}: ${lookupError.message}`);
                    continue;
                }

                let programCode = normalizedCode;
                try {
                    if (programCode) {
                        await assertProgramCodeAvailable({ code: programCode, schoolId: school._id });
                    } else {
                        programCode = await generateUniqueProgramCode({ school, schoolId: school._id, name });
                    }
                } catch (error) {
                    validationErrors.push(`Row ${rowNumber}: ${error.message}`);
                    continue;
                }

                toCreate.push({ name, code: programCode, schoolId: school._id, description, status, duration, degreeType });
            }

            const failingCount = validationErrors.length;
            const failingPercent = totalRows === 0 ? 0 : (failingCount / totalRows) * 100;

            if (failingPercent > FAILURE_THRESHOLD_PERCENT) {
                return res.status(400).json({ message: `Bulk import rejected: ${failingPercent.toFixed(2)}% rows failed validation which exceeds threshold of ${FAILURE_THRESHOLD_PERCENT}%`, errors: validationErrors });
            }

            // creation pass
            const createdPrograms = [];
            const errors = [];

            for (let i = 0; i < toCreate.length; i += 1) {
                const item = toCreate[i];
                const session = await mongoose.startSession();

                try {
                    session.startTransaction();

                    const [program] = await programModel.create([
                        {
                            name: item.name,
                            code: item.code,
                            schoolId: item.schoolId,
                            description: item.description,
                            status: item.status,
                            duration: item.duration,
                            degreeType: item.degreeType,
                            createdBy: req.user._id
                        }
                    ], { session, ordered: true });

                    await generateProgramSemesters({
                        programId: program._id,
                        duration: item.duration,
                        userId: req.user._id,
                        session
                    });

                    await auditLogModel.create([
                        {
                            performedBy: req.user._id,
                            action: "BULK_CREATE",
                            module: "Program",
                            targetId: program._id,
                            targetName: program.name,
                            remarks: "Program created through bulk import",
                            ipAddress: req.ip,
                            userAgent: req.headers["user-agent"]
                        }
                    ], { session, ordered: true });

                    await session.commitTransaction();
                    createdPrograms.push(program);
                } catch (rowError) {
                    await session.abortTransaction();
                    console.error(rowError);
                    if (rowError.code === 11000) {
                        errors.push(`Row ${i + 2}: Duplicate program or code detected`);
                    } else {
                        errors.push(`Row ${i + 2}: ${rowError.message}`);
                    }
                } finally {
                    await session.endSession();
                }
            }

            const allErrors = [...validationErrors, ...errors];

            return res.status(201).json({
                message: "Bulk program import completed",
                createdCount: createdPrograms.length,
                errors: allErrors
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Unable to import bulk programs" });
        }
};

const updateProgram = async (req, res) => {
    try {
        const allowedRoles = ["superAdmin", "schoolAdmin"];

        if (!req.user.roles.some(role => allowedRoles.includes(role))) {
            return sendError(res, 403, "Unauthorized");
        }

        const program = await programModel.findById(req.params.id);

        if (!program) {
            return sendError(res, 404, "Program not found");
        }

        if (
            req.user.roles.includes("schoolAdmin") &&
            req.user.schoolId.toString() !== program.schoolId.toString()
        ) {
            return sendError(res, 403, "School Admin can only update programs in their own school");
        }

        const nextDuration = req.body.duration !== undefined
            ? Number(req.body.duration)
            : program.duration;

        if (!Number.isInteger(nextDuration) || nextDuration <= 0) {
            return sendError(res, 400, "Duration must be a positive integer");
        }

        await assertDurationCanChange({
            programId: program._id,
            currentDuration: program.duration,
            nextDuration
        });

        const oldDuration = program.duration;
        const nextSchoolId = req.body.schoolId || program.schoolId;
        const nextName = req.body.name ? req.body.name.trim() : program.name;
        const nextSchool = req.body.schoolId
            ? await schoolModel.findById(req.body.schoolId)
            : await schoolModel.findById(program.schoolId);

        if (!nextSchool) {
            return sendError(res, 404, "School not found");
        }

        let nextCode;

        if (req.body.code !== undefined) {
            nextCode = normalizeProgramCode(req.body.code);
            if (!nextCode) {
                nextCode = await generateUniqueProgramCode({
                    school: nextSchool,
                    schoolId: nextSchoolId,
                    name: nextName,
                    excludeProgramId: program._id
                });
            } else {
                await assertProgramCodeAvailable({
                    code: nextCode,
                    schoolId: nextSchoolId,
                    excludeProgramId: program._id
                });
            }
        }

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const update = {
                ...req.body,
                ...(nextCode !== undefined ? { code: nextCode } : {}),
                duration: nextDuration,
                updatedBy: req.user._id
            };

            const updatedProgram = await programModel.findByIdAndUpdate(
                req.params.id,
                update,
                {
                    new: true,
                    runValidators: true,
                    session
                }
            );

            if (nextDuration > oldDuration) {
                await generateMissingProgramSemesters({
                    programId: updatedProgram._id,
                    duration: nextDuration,
                    userId: req.user._id,
                    session
                });

                await auditLogModel.create([{
                    performedBy: req.user._id,
                    action: "SEMESTER_REGENERATED",
                    module: "Semester",
                    targetId: updatedProgram._id,
                    targetName: updatedProgram.name,
                    oldData: { duration: oldDuration },
                    newData: { duration: nextDuration },
                    remarks: "Missing semesters generated after program duration increase",
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"]
                }, {
                    performedBy: req.user._id,
                    action: "PROGRAM_DURATION_CHANGE",
                    module: "Program",
                    targetId: updatedProgram._id,
                    targetName: updatedProgram.name,
                    oldData: { duration: oldDuration },
                    newData: { duration: nextDuration },
                    remarks: "Program duration updated",
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"]
                }], { session, ordered: true });
            }

            await session.commitTransaction();

            return sendSuccess(res, 200, "Program updated successfully", updatedProgram);
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            await session.endSession();
        }
    } catch (err) {
        console.error(err);
        return sendError(res, err.statusCode || 500, err.statusCode ? err.message : "Internal Server Error", err.details || []);
    }
};

const deleteProgram = async (req, res) => {
    try {
        const allowedRoles = ["superAdmin", "schoolAdmin"];

        if (!req.user.roles.some(role => allowedRoles.includes(role))) {
            return sendError(res, 403, "Unauthorized");
        }

        const program = await programModel.findById(req.params.id);

        if (!program) {
            return sendError(res, 404, "Program not found");
        }

        if (
            req.user.roles.includes("schoolAdmin") &&
            req.user.schoolId.toString() !== program.schoolId.toString()
        ) {
            return sendError(res, 403, "School Admin can only delete programs in their own school");
        }

        await assertProgramCanBeDeleted(program._id);

        program.status = "inactive";
        program.updatedBy = req.user._id;
        await program.save();

        await auditLogModel.create({
            performedBy: req.user._id,
            action: "DELETE",
            module: "Program",
            targetId: program._id,
            targetName: program.name,
            remarks: "Program deleted successfully",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return sendSuccess(res, 200, "Program deleted successfully");
    } catch (err) {
        console.error(err);
        return sendError(res, err.statusCode || 500, err.statusCode ? err.message : "Internal Server Error", err.details || []);
    }
};

module.exports = {
    programs: createProgram,
    bulkPrograms: createBulkPrograms,
    updateProgram,
    deleteProgram
};
