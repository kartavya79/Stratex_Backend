# Folder Structure

Backend source is under `backend/src`.

| Path | Purpose |
|---|---|
| `app.js` | Express app setup, middleware registration, route mounts, notification cleanup scheduler |
| `controllers/` | HTTP controller functions. Controllers validate request-specific behavior and call models/services. |
| `controllers/acadmicgroups/` | School, program, specialization, semester, and subject creation controllers. Folder name is currently misspelled in code and kept for compatibility. |
| `controllers/get/` | Read controllers for users and subjects. |
| `controllers/update/` | Update controllers for user and subject. |
| `controllers/remove/` | Soft-delete and assignment-removal controllers. |
| `controllers/assigne/` | Faculty/coordinator assignment controllers. Folder name is currently misspelled and kept for compatibility. |
| `controllers/notification/` | Notification create, feed, read, delete, restore, pin, and analytics controllers. |
| `models/` | Mongoose schemas and indexes. |
| `routes/` | Express routers mounted by `app.js`. |
| `middlewares/` | Auth, audit, and request validation middleware. |
| `services/` | Reusable business services for auth, users, academic generation, notification, email, and storage. |
| `utils/` | Shared response and query helper functions. |
| `db/` | MongoDB connection helper. |
| `scripts/` | Operational scripts, currently super admin creation. |

## Route Mounts

Defined in `backend/src/app.js`:

| Mount | Router |
|---|---|
| `/api/auth` | `auth.routes.js` |
| `/api/users` | `user.routes.js` |
| `/api/schools` | `school.routes.js` |
| `/api/programs` | `program.routes.js` |
| `/api/specializations` | `specialization.routes.js` |
| `/api/subjects` | `subject.routes.js` |
| `/api/notices` | `notice.routes.js` |
| `/api/events` | `event.routes.js` |
| `/api/dashboard` | `dashboard.routes.js` |
| `/api/notifications` | `notification.routes.js` |

