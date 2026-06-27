# Users

## Files

| Concern | File |
|---|---|
| Routes | `backend/src/routes/user.routes.js`, `backend/src/routes/auth.routes.js` |
| Model | `backend/src/models/user.model.js` |
| Register service | `backend/src/services/auth/register.service.js` |
| Academic validation | `backend/src/services/user/validateAcademicAssignment.service.js` |
| Role validation | `backend/src/services/user/validateRole.service.js` |
| Permission validation | `backend/src/services/user/permission.service.js` |
| Duplicate validation | `backend/src/services/user/duplicateUser.service.js` |

## User Model

Key fields:

| Field | Purpose |
|---|---|
| `firstName`, `middleName`, `lastName` | Basic identity |
| `personalEmail` | Optional personal email, unique sparse |
| `universityAccount.universityEmail` | Required except superAdmin, unique |
| `universityAccount.institutionId` | Required except superAdmin, unique |
| `schoolId` | Required except superAdmin |
| `roles` | Role array |
| `status` | `active`, `inactive`, `suspended` |
| `academicAssignments` | Program/semester/specialization mapping |
| `currentSemester` | Fast lookup, set to student assignment semester |
| `password`, `setupToken` | Auth fields hidden by default |

## Academic Assignment

| Field | Meaning |
|---|---|
| `programId` | Required |
| `semesterId` | Required |
| `specializationId` | Optional |
| `assignedSubjects` | Faculty/coordinator only |
| `isCoordinator` | Assignment-level coordinator marker |
| `isPrimary` | Primary assignment marker |
| `status` | `active`, `inactive`, `suspended` |

## Business Rules

- Students must have exactly one academic assignment.
- Students must not store assigned subjects; service normalizes to `[]`.
- Faculty can have multiple academic assignments.
- Faculty/coordinator assigned subjects must belong to the same program, semester, and specialization if present.
- Coordinator must include both `faculty` and `coordinator` roles.
- `examCell`, `schoolAdmin`, and `superAdmin` should not have academic assignments.
- `schoolAdmin` cannot create users outside their school.
- `schoolAdmin` cannot create privileged accounts.

## User Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/users` | Paginated users |
| `GET` | `/api/users/:id` | User by ID |
| `POST` | `/api/users` | Create users, same register logic |
| `PUT` | `/api/users/:id` | Update basic user fields |
| `DELETE` | `/api/users/:id` | Soft deactivate user |
| `POST` | `/api/auth/register` | Create users, same logic |

## Query Parameters for `GET /api/users`

- `page`, `limit`
- `search`
- `role`
- `school`, `schoolId`
- `program`, `programId`
- `specialization`, `specializationId`
- `semesterId`
- `status`
- `sortBy`
- `order`

## Example Student Payload

```json
{
  "firstName": "Aarav",
  "lastName": "Sharma",
  "personalEmail": "aarav@example.com",
  "universityAccount": {
    "universityEmail": "aarav@university.edu",
    "institutionId": "STU001"
  },
  "schoolId": "64f000000000000000000001",
  "roles": ["student"],
  "academicAssignments": [
    {
      "programId": "64f000000000000000000002",
      "semesterId": "64f000000000000000000003",
      "specializationId": null
    }
  ]
}
```

