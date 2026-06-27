# FAQ

## How are semesters generated?

When a program is created, `services/academic/semesterGeneration.service.js` generates `duration * 2` semester documents for the program.

## Does creating a specialization generate semesters?

No. Specializations share the program's semesters. Subjects decide whether they are common or specialization-specific.

## Why do students not store subjects?

Subjects are resolved dynamically from `programId + semesterId + specializationId`. This prevents stale subject lists when subjects change.

## How are common subjects represented?

A common subject has `specializationId: null`.

## How are specialization subjects represented?

A specialization subject has `specializationId` set to that specialization's ObjectId.

## How do coordinators work?

Coordinator is not a separate account type. A coordinator is a faculty user with both roles: `faculty` and `coordinator`.

## How are notifications delivered?

Creating a notification creates one `Notification` document and many `UserNotification` delivery records after resolving the audience.

## What protects dashboard pages?

Frontend should use protected routes. Backend dashboard APIs require `authMiddleware.chkUser`.

## What happens if the auth cookie is deleted?

`GET /api/auth/me` returns `401`; frontend should clear local auth state and redirect to login.

