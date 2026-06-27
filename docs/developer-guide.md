# Developer Guide

## Adding an API

1. Add or reuse a model in `models/`.
2. Add business logic in `services/` if the logic is reusable or non-trivial.
3. Add a controller in `controllers/`.
4. Add route definitions in `routes/`.
5. Mount the router in `app.js`.
6. Add validation with `validate.middleware.js` or a domain service.
7. Add audit logs for important mutations.
8. Add docs and Postman examples.

## Coding Conventions

- Keep controllers thin where possible.
- Reuse `sendSuccess` and `sendError` for new APIs.
- Use `validate.objectIdParam("id")` for `:id` routes.
- Use service-level validation for cross-document business rules.
- Use `lean()` for read-only queries when document methods are not needed.
- Batch query related documents instead of calling `findById()` in loops.
- Preserve existing route names for frontend compatibility.

## Adding Audit Logs

Use `auditLogModel.create()` with:

- `performedBy`
- `action`
- `module`
- `targetId`
- `targetName`
- `oldData` / `newData` when useful
- `remarks`
- `ipAddress`
- `userAgent`

If adding a new action or module, update enum lists in `auditlog.model.js`.

## Adding Validation

For simple request shape validation, use `validate.middleware.js`.

For business validation:

- Put role logic in `services/user/validateRole.service.js`.
- Put permission logic in `services/user/permission.service.js`.
- Put academic relationship checks in `services/user/validateAcademicAssignment.service.js`.
- Put notification validation in `services/notification/notificationValidation.service.js`.

