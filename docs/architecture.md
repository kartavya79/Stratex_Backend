# Architecture

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| HTTP | Express 5 |
| Database | MongoDB with Mongoose |
| Auth | JWT in HTTP-only cookie |
| File upload | Multer, ImageKit storage service |
| Email | Nodemailer |
| Validation | Custom `validate.middleware.js` plus service-level validation |
| Audit | Mongoose `AuditLog` model plus audit middleware/manual audit writes |

## High-Level Domain

```mermaid
erDiagram
  SCHOOL ||--o{ PROGRAM : owns
  PROGRAM ||--o{ SPECIALIZATION : has
  PROGRAM ||--o{ SEMESTER : generates
  PROGRAM ||--o{ SUBJECT : owns
  SEMESTER ||--o{ SUBJECT : groups
  SPECIALIZATION ||--o{ SUBJECT : optional
  SCHOOL ||--o{ USER : contains
  USER ||--o{ USER_NOTIFICATION : receives
  NOTIFICATION ||--o{ USER_NOTIFICATION : delivered_as
```

## Academic Flow

```mermaid
flowchart TD
  School[Create School] --> Program[Create Program]
  Program --> Semesters[Backend generates duration x 2 semesters]
  Program --> Specialization[Create Specialization, no semesters generated]
  Semesters --> Subject[Create Common or Specialization Subject]
  Specialization --> Subject
  Subject --> Users[Register Students / Faculty / Coordinators]
```

## Important Services

| Service | Purpose |
|---|---|
| `services/auth/register.service.js` | User registration orchestration, transaction, setup email, audit |
| `services/user/validateAcademicAssignment.service.js` | Program/semester/specialization/subject validation for user academic assignments |
| `services/user/permission.service.js` | Role and school-admin creation restrictions |
| `services/user/duplicateUser.service.js` | Payload and database duplicate checks |
| `services/academic/semesterGeneration.service.js` | Program semester generation and program deletion/duration safety checks |
| `services/notification/audience.service.js` | Resolves notification recipients from user filters |
| `services/notification/notificationQuery.service.js` | Notification feed, pagination, filtering, unread count |
| `services/notification/notificationCleanup.service.js` | Scheduled soft-expiry of expired notifications |

## Response Format

Some controllers use direct JSON responses and some use `utils/apiResponse.js`.

Standard helper success:

```json
{
  "success": true,
  "message": "Fetched successfully",
  "data": {},
  "pagination": {}
}
```

Standard helper error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

Older controllers may return `{ "message": "..." }` directly. Frontend code should handle both.

