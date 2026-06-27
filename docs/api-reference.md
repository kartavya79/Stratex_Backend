# API Reference

Base URL:

```txt
{{baseUrl}}/api
```

Use credentials/cookies for protected routes.

## Auth

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| `POST` | `/auth/login` | No | `{ "email": "...", "password": "..." }` |
| `POST` | `/auth/logout` | No | none |
| `GET` | `/auth/me` | Yes | none |
| `POST` | `/auth/setup-password` | No | `{ "token": "...", "password": "..." }` |
| `POST` | `/auth/register` | Yes | user object or array |

## Users

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/users` | Yes | List users |
| `GET` | `/users/:id` | Yes | Get user |
| `POST` | `/users` | Yes | Create users |
| `PUT` | `/users/:id` | Yes | Update basic user fields |
| `DELETE` | `/users/:id` | Yes | Soft deactivate user |

Query: `page`, `limit`, `search`, `role`, `schoolId`, `programId`, `specializationId`, `semesterId`, `status`, `sortBy`, `order`.

## Schools

| Method | Endpoint |
|---|---|
| `GET` | `/schools` |
| `GET` | `/schools/:id` |
| `POST` | `/schools` |
| `PUT` | `/schools/:id` |
| `DELETE` | `/schools/:id` |

Create body:

```json
{
  "name": "School of Engineering",
  "slug": "engineering",
  "description": "Engineering school",
  "status": "active"
}
```

## Programs

| Method | Endpoint |
|---|---|
| `GET` | `/programs` |
| `GET` | `/programs/:id` |
| `POST` | `/programs` |
| `PUT` | `/programs/:id` |
| `DELETE` | `/programs/:id` |

Create body:

```json
{
  "name": "B.Tech CSE",
  "schoolId": "64f000000000000000000001",
  "description": "Computer Science Engineering",
  "duration": 4,
  "degreeType": "UG",
  "status": "active"
}
```

Side effect: creates semesters `1` through `duration * 2`.

## Specializations

| Method | Endpoint |
|---|---|
| `GET` | `/specializations` |
| `GET` | `/specializations/:id` |
| `POST` | `/specializations` |
| `PUT` | `/specializations/:id` |
| `DELETE` | `/specializations/:id` |

Create body:

```json
{
  "programId": "64f000000000000000000002",
  "name": "Artificial Intelligence",
  "description": "AI specialization",
  "status": "active"
}
```

Specialization creation does not generate semesters.

## Subjects

| Method | Endpoint |
|---|---|
| `GET` | `/subjects` |
| `GET` | `/subjects/:id` |
| `POST` | `/subjects` |
| `PUT` | `/subjects/:id` |
| `DELETE` | `/subjects/:id` |

Create common subject:

```json
{
  "code": "MATH101",
  "name": "Mathematics I",
  "schoolId": "64f000000000000000000001",
  "programId": "64f000000000000000000002",
  "semesterId": "64f000000000000000000003",
  "credits": 4
}
```

Create specialization subject:

```json
{
  "code": "AI501",
  "name": "Artificial Intelligence",
  "schoolId": "64f000000000000000000001",
  "programId": "64f000000000000000000002",
  "specializationId": "64f000000000000000000004",
  "semesterId": "64f000000000000000000003",
  "credits": 4
}
```

## Notices

| Method | Endpoint |
|---|---|
| `GET` | `/notices` |
| `GET` | `/notices/:id` |
| `POST` | `/notices` |
| `PUT` | `/notices/:id` |
| `DELETE` | `/notices/:id` |

## Events

| Method | Endpoint |
|---|---|
| `GET` | `/events` |
| `GET` | `/events/:id` |
| `POST` | `/events` |
| `PUT` | `/events/:id` |
| `DELETE` | `/events/:id` |

## Dashboard

| Method | Endpoint |
|---|---|
| `GET` | `/dashboard/stats` |
| `GET` | `/dashboard/recent-users` |
| `GET` | `/dashboard/recent-activities` |
| `GET` | `/dashboard/recent-notices` |
| `GET` | `/dashboard/upcoming-events` |

## Notifications

| Method | Endpoint |
|---|---|
| `GET` | `/notifications` |
| `GET` | `/notifications/unread-count` |
| `GET` | `/notifications/analytics` |
| `POST` | `/notifications` |
| `PATCH` | `/notifications/read-many` |
| `PATCH` | `/notifications/read-all` |
| `PATCH` | `/notifications/:id/read` |
| `PATCH` | `/notifications/:id/pin` |
| `PATCH` | `/notifications/:id/unpin` |
| `DELETE` | `/notifications/:id` |
| `PATCH` | `/notifications/:id/restore` |

