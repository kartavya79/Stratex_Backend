const schoolModel = require("../models/school.model");
const programModel = require("../models/program.model");
const semesterModel = require("../models/semester.model");

// GET /api/import/references
// Returns a CSV attachment that contains combined reference rows for schools/programs/semesters
const exportImportReferences = async (req, res) => {
  try {
    const allowedRoles = ["superAdmin", "schoolAdmin"];
    if (!req.user || !req.user.roles || !req.user.roles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // If schoolAdmin, restrict to their school only
    const schoolFilter = req.user.roles.includes("schoolAdmin") && req.user.schoolId
      ? { _id: req.user.schoolId }
      : {};

    const schools = await schoolModel.find(schoolFilter).select("_id name slug code").lean();

    // Build CSV rows: header then rows for each semester record
    // Header: schoolId,schoolSlug,schoolName,programId,programCode,programName,semesterId,semesterNumber
    const rows = [];
    rows.push(["schoolId", "schoolSlug", "schoolName", "programId", "programCode", "programName", "semesterId", "semesterNumber"]);

    for (const s of schools) {
      const programs = await programModel.find({ schoolId: s._id }).select("_id code name").lean();
      if (!programs || !programs.length) {
        // include a row with empty program/semester to surface the school
        rows.push([String(s._id), s.slug || "", s.name || "", "", "", "", "", ""]);
        continue;
      }

      for (const p of programs) {
        const semesters = await semesterModel.find({ programId: p._id }).select("_id semesterNumber").lean();
        if (!semesters || !semesters.length) {
          rows.push([String(s._id), s.slug || "", s.name || "", String(p._id), p.code || "", p.name || "", "", ""]);
          continue;
        }

        for (const sem of semesters) {
          rows.push([String(s._id), s.slug || "", s.name || "", String(p._id), p.code || "", p.name || "", String(sem._id), String(sem.semesterNumber)]);
        }
      }
    }

    // convert to CSV string
    const contents = rows.map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\r\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="import-references.csv"`);
    return res.send(contents);
  } catch (err) {
    console.error("exportImportReferences error:", err);
    return res.status(500).json({ message: "Unable to generate references" });
  }
};

module.exports = { exportImportReferences };