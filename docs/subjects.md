# Subjects

Subjects are attached to a program and semester, optionally to a specialization.

## Implementation

| Type | File |
|---|---|
| Route | `backend/src/routes/subject.routes.js` |
| Create controller | `backend/src/controllers/acadmicgroups/subject.controller.js` |
| List controller | `backend/src/controllers/get/getSubject/getSubject.controller.js` |
| Model | `backend/src/models/subject.model.js` |

## Model

Fields: `code`, `name`, `description`, `schoolId`, `programId`, `specializationId`, `semesterId`, `credits`, `coordinatorId`, `facultyIds`, `status`, audit fields.

Indexes:

- `semesterId`
- `coordinatorId`
- `facultyIds`
- Unique `code + programId + specializationId + semesterId`

## Business Rules

- Common subjects have `specializationId: null`.
- Specialization subjects have `specializationId`.
- Semester must belong to selected program.
- Specialization, when present, must belong to selected program.
- Students never store subjects. Frontend fetches subjects dynamically.

## Dynamic Fetch

```http
GET /api/subjects?programId=<programId>&semesterId=<semesterId>&specializationId=<specializationId>
```

When `specializationId` is provided, the backend returns common subjects plus matching specialization subjects.

See also: [Academic Modules](./academic.md), [API Reference](./api-reference.md).

