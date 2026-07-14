const subjectModel = require("../../models/subject.model");
const schoolModel = require("../../models/school.model");
const programModel = require("../../models/program.model");
const specializationModel = require("../../models/specelization.model");
const auditLogModel = require("../../models/auditlog.model");
const semesterModel = require("../../models/semester.model");
const mongoose = require("mongoose");
const { parseCsvBuffer } = require("../../utils/csvParser");

const normalizeRowValue = (value) => String(value || "").trim();
const normalizeCodeValue = (value) => normalizeRowValue(value).toUpperCase();
const normalizeSlugValue = (value) => normalizeRowValue(value).toLowerCase();

const createSubject = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            schoolId,
            programId,
            specializationId,
            semesterId,
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
            !semesterId
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

        const semester = await semesterModel.findById(semesterId);
        if (!semester) {
            return res.status(404).json({
                message: "Semester not found"
            });
        }

        if (
            semester.programId.toString() !==
            programId.toString()
        ) {
            return res.status(400).json({
                message:
                    "Semester does not belong to selected program"
            });
        }

        const existingSubject =
            await subjectModel.findOne({
                code: code.trim().toUpperCase(),
                programId,
                specializationId: specializationId || null,
                semesterId
            });

        if (existingSubject) {
            return res.status(409).json({
                message:
                    "Subject code already exists in this semester"
            });
        }

        if (
            credits !== undefined &&
            (isNaN(credits) || credits < 0)
        ) {
            return res.status(400).json({
                message: "Invalid credits"
            });
        }

        const allowedStatus = [
            "active",
            "inactive"
        ];

        if (
            status &&
            !allowedStatus.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }
        const subject = await subjectModel.create({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            description: description?.trim(),
            schoolId,
            programId,
            specializationId: specializationId || null,
            semesterId,
            credits: credits || 0,
            status: status || "active",
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
        try {
            await auditLogModel.create({
                performedBy: req.user?._id,
                action: "SUBJECT_CREATION_FAILED",
                module: "Subject",
                targetName: req.body?.name,
                remarks: err.message,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });
        }
        catch(err){
            console.error(err)
        }

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

const createBulkSubjects = async (req, res) => {
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
            const code = normalizeCodeValue(row.code);
            const name = normalizeRowValue(row.name);
            const description = normalizeRowValue(row.description) || null;
            const schoolIdRaw = normalizeRowValue(row.schoolid);
            const schoolSlug = normalizeSlugValue(row.schoolslug);
            const programIdRaw = normalizeRowValue(row.programid);
            const programCode = normalizeCodeValue(row.programcode);
            const semesterIdRaw = normalizeRowValue(row.semesterid);
            const semesterNumber = Number(row.semesternumber);
            const credits = Number(row.credits || 0);
            const specializationIdRaw = normalizeRowValue(row.specializationid);
            const status = (normalizeRowValue(row.status) || "active").toLowerCase();

            if (!code) {
                validationErrors.push(`Row ${rowNumber}: Subject code is required`);
                continue;
            }

            if (!name) {
                validationErrors.push(`Row ${rowNumber}: Subject name is required`);
                continue;
            }

            if (!schoolIdRaw && !schoolSlug) {
                validationErrors.push(`Row ${rowNumber}: schoolId or schoolSlug is required`);
                continue;
            }

            if (!programIdRaw && !programCode) {
                validationErrors.push(`Row ${rowNumber}: programId or programCode is required`);
                continue;
            }

            if (!semesterIdRaw && !Number.isInteger(semesterNumber)) {
                validationErrors.push(`Row ${rowNumber}: semesterId or semesterNumber is required`);
                continue;
            }

            if (credits < 0 || Number.isNaN(credits)) {
                validationErrors.push(`Row ${rowNumber}: credits must be a non-negative number`);
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
                validationErrors.push(`Row ${rowNumber}: School not found`);
                continue;
            }

            if (req.user.roles.includes("schoolAdmin") && req.user.schoolId.toString() !== school._id.toString()) {
                validationErrors.push(`Row ${rowNumber}: School Admin can only import subjects for their own school`);
                continue;
            }

            let program = null;
            if (programIdRaw && mongoose.Types.ObjectId.isValid(programIdRaw)) {
                program = await programModel.findById(programIdRaw);
            }
            if (!program && programCode) {
                program = await programModel.findOne({ schoolId: school._id, code: programCode });
            }

            if (!program) {
                validationErrors.push(`Row ${rowNumber}: Program not found`);
                continue;
            }

            if (program.schoolId.toString() !== school._id.toString()) {
                validationErrors.push(`Row ${rowNumber}: Program does not belong to selected school`);
                continue;
            }

            let semester = null;
            if (semesterIdRaw && mongoose.Types.ObjectId.isValid(semesterIdRaw)) {
                semester = await semesterModel.findById(semesterIdRaw);
            }
            if (!semester && Number.isInteger(semesterNumber)) {
                semester = await semesterModel.findOne({ programId: program._id, semesterNumber: semesterNumber });
            }

            if (!semester) {
                validationErrors.push(`Row ${rowNumber}: Semester not found for the selected program`);
                continue;
            }

            if (semester.programId.toString() !== program._id.toString()) {
                validationErrors.push(`Row ${rowNumber}: Semester does not belong to selected program`);
                continue;
            }

            let specialization = null;
            if (specializationIdRaw) {
                if (!mongoose.Types.ObjectId.isValid(specializationIdRaw)) {
                    validationErrors.push(`Row ${rowNumber}: specializationId is invalid`);
                    continue;
                }

                specialization = await specializationModel.findById(specializationIdRaw);
                if (!specialization) {
                    validationErrors.push(`Row ${rowNumber}: Specialization not found`);
                    continue;
                }

                if (specialization.programId.toString() !== program._id.toString()) {
                    validationErrors.push(`Row ${rowNumber}: Specialization does not belong to selected program`);
                    continue;
                }
            }

            const existingSubject = await subjectModel.findOne({ code, programId: program._id, specializationId: specialization ? specialization._id : null, semesterId: semester._id });

            if (existingSubject) {
                validationErrors.push(`Row ${rowNumber}: Subject code already exists in this semester`);
                continue;
            }

            toCreate.push({ code, name, description, schoolId: school._id, programId: program._id, specializationId: specialization ? specialization._id : null, semesterId: semester._id, credits, status });
        }

        const failingCount = validationErrors.length;
        const failingPercent = totalRows === 0 ? 0 : (failingCount / totalRows) * 100;

        if (failingPercent > FAILURE_THRESHOLD_PERCENT) {
            return res.status(400).json({ message: `Bulk import rejected: ${failingPercent.toFixed(2)}% rows failed validation which exceeds threshold of ${FAILURE_THRESHOLD_PERCENT}%`, errors: validationErrors });
        }

        const createdSubjects = [];
        const errors = [];

        for (let i = 0; i < toCreate.length; i += 1) {
            const item = toCreate[i];
            try {
                const subject = await subjectModel.create({
                    code: item.code,
                    name: item.name,
                    description: item.description,
                    schoolId: item.schoolId,
                    programId: item.programId,
                    specializationId: item.specializationId,
                    semesterId: item.semesterId,
                    credits: item.credits,
                    status: item.status,
                    createdBy: req.user._id
                });

                createdSubjects.push(subject);

                await auditLogModel.create({
                    performedBy: req.user._id,
                    action: "BULK_CREATE",
                    module: "Subject",
                    targetId: subject._id,
                    targetName: subject.name,
                    remarks: "Subject created through bulk import",
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"]
                });
            } catch (rowError) {
                console.error(rowError);
                if (rowError.code === 11000) {
                    errors.push(`Row ${i + 2}: Duplicate subject detected`);
                } else {
                    errors.push(`Row ${i + 2}: ${rowError.message}`);
                }
            }
        }

        const allErrors = [...validationErrors, ...errors];

            const createdMapping = createdSubjects.map((s) => ({ id: s._id, code: s.code, name: s.name, programId: s.programId, semesterId: s.semesterId }));

            return res.status(201).json({ message: "Bulk subject import completed", createdCount: createdSubjects.length, created: createdMapping, errors: allErrors });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Unable to import bulk subjects" });
    }
};

module.exports = { subjects: createSubject, bulkSubjects: createBulkSubjects };
