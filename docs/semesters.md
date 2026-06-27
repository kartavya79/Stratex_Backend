# Semesters

Semesters are program-level academic periods.

## Implementation

| Type | File |
|---|---|
| Model | `backend/src/models/semester.model.js` |
| Manual creation controller | `backend/src/controllers/acadmicgroups/semester.controller.js` |
| Auto generation service | `backend/src/services/academic/semesterGeneration.service.js` |

## Model

Fields: `programId`, `specializationId`, `semesterNumber`, `status`, `createdBy`, `updatedBy`.

`specializationId` remains in the schema for backward compatibility, but current code writes new semesters with `specializationId: null`.

Unique index:

- `programId + specializationId + semesterNumber`

## Business Rules

- Program owns semesters.
- Program creation generates `duration * 2` semesters.
- Specializations share program semesters.
- Subject validation checks `semester.programId === subject.programId`.

See also: [Academic Modules](./academic.md), [Programs](./programs.md).

