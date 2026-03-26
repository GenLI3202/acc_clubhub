# Environment Variables

> Generated from `backend/.env.example` and `frontend/.env.example`.

<!-- AUTO-GENERATED -->

## Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill in your values. Never commit `.env`.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon / Vercel Postgres) | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `RESEND_API_KEY` | Yes | Resend email service API key | `re_xxxxxxxxxxxxx` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins | `http://localhost:4321,https://acc-clubhub.vercel.app` |
| `APP_NAME` | No | Application display name (default: `ACC ClubHub API`) | `ACC ClubHub API` |
| `DEBUG` | No | Enable debug mode (default: `false`) | `true`, `false` |

### Obtaining credentials

- **DATABASE_URL**: Vercel Dashboard → Storage → your Postgres instance → `.env` tab
- **RESEND_API_KEY**: [resend.com/api-keys](https://resend.com/api-keys)

## Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env` and fill in your values.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PUBLIC_WALINE_SERVER_URL` | Yes | Waline comment system server URL | `https://your-waline.vercel.app` |
| `PUBLIC_API_URL` | Yes | Backend API base URL | `https://acc-clubhub-events-ms.vercel.app` |

### Notes

- Variables prefixed with `PUBLIC_` are exposed to the browser.
- For local development, set `PUBLIC_API_URL=http://localhost:8000`.
- Vercel environment variables are configured in the Vercel Dashboard — they do not need a `.env` file in production.

<!-- END AUTO-GENERATED -->
