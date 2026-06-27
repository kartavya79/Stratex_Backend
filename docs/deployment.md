# Deployment

## Backend Environment Variables

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `CLIENT_URL` | Frontend origin for CORS and setup links |
| `NODE_ENV` | Use `production` for secure cookies |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_SECURE` | `true` for secure SMTP |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password |
| `EMAIL_FROM` | Email sender address |
| `EMAIL_FROM_NAME` | Email sender display name |
| `NOTIFICATION_ANALYTICS_CACHE_TTL_MS` | Optional notification analytics cache TTL |
| `NOTIFICATION_DUPLICATE_WINDOW_MS` | Optional duplicate notification window |
| `NOTIFICATION_CLEANUP_INTERVAL_MS` | Optional cleanup scheduler interval |
| `NOTIFICATION_CLEANUP_DISABLED` | Set `true` to disable cleanup scheduler |
| `NOTIFICATION_PIN_LIMIT` | Optional pin limit, default `5` |

## Local Run

```bash
cd backend
npm install
npm run dev
```

## Production Notes

- Use HTTPS so secure cookies work.
- Set `CLIENT_URL` exactly to the frontend origin.
- Use a strong `JWT_SECRET`.
- Use MongoDB replica set or Atlas if transaction-heavy flows are required.
- Configure SMTP before creating users because registration sends setup email during the transaction flow.

