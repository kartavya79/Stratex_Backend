# Audit Logs

## Files

- Model: `backend/src/models/auditlog.model.js`
- Middleware: `backend/src/middlewares/audit.middleware.js`
- Manual audit writes exist in controllers/services.

## Audit Model

Key fields:

| Field | Purpose |
|---|---|
| `performedBy` | User who performed action |
| `action` | Enum action |
| `module` | Affected module |
| `targetId` | Affected document ID |
| `targetName` | Human-readable target |
| `oldData` | Previous state |
| `newData` | New state |
| `changes` | Changed fields |
| `remarks` | Human-readable explanation |
| `ipAddress` | Request IP |
| `userAgent` | Request user agent |

## Modules

`User`, `School`, `Program`, `Specialization`, `Notice`, `Event`, `Resource`, `Subject`, `Auth`, `Semester`, `Dashboard`, `Notification`.

## Common Actions

- `CREATE`, `BULK_CREATE`, `UPDATE`, `DELETE`
- `LOGIN`, `LOGOUT`, `LOGIN_FAILED`
- `SETUP_PASSWORD`
- `SEMESTER_AUTO_GENERATED`, `SEMESTER_REGENERATED`, `PROGRAM_DURATION_CHANGE`
- Notification-specific read/delete/pin/cache/duplicate actions

## Middleware Behavior

`audit.middleware.js` is mounted at `/api`. It currently logs completed `GET` requests for known modules.

Controllers and services also write explicit audit records for important mutations.

