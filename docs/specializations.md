# Specializations

Specializations belong to programs. They do not own semesters.

## Implementation

| Type | File |
|---|---|
| Route | `backend/src/routes/specialization.routes.js` |
| Controller | `backend/src/controllers/acadmicgroups/specialization.controller.js` |
| Model | `backend/src/models/specelization.model.js` |
| Compatibility alias | `backend/src/models/specialization.model.js` |

## Model

Fields: `programId`, `name`, `description`, `status`, `createdBy`, `updatedBy`.

Unique index:

- `programId + name`

## Business Rules

- Creating a specialization does not generate semesters.
- Subjects can optionally reference a specialization.
- Delete is blocked when subjects, users, or notifications depend on the specialization.

## Endpoints

- `GET /api/specializations`
- `GET /api/specializations/:id`
- `POST /api/specializations`
- `PUT /api/specializations/:id`
- `DELETE /api/specializations/:id`

See also: [Academic Modules](./academic.md), [API Reference](./api-reference.md).

