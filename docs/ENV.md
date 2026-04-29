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
| `ADMIN_SESSION_SECRET` | Yes | Secret used to sign admin session cookies | `replace-with-a-long-random-secret` |
| `ADMIN_EMAIL_ALLOWLIST` | Yes | Comma-separated ride leader emails allowed to access `/dashboard` by magic link | `leader1@example.com,leader2@example.com` |
| `ADMIN_GITHUB_ALLOWLIST` | No | Optional fallback GitHub usernames allowed to access `/dashboard` | `genli3202,rideleader1` |
| `GITHUB_CLIENT_ID` | No | Optional fallback GitHub OAuth App client ID | `Ov23lixxxxxxxxxxxxxx` |
| `GITHUB_CLIENT_SECRET` | No | Optional fallback GitHub OAuth App client secret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `APP_NAME` | No | Application display name (default: `ACC ClubHub API`) | `ACC ClubHub API` |
| `DEBUG` | No | Enable debug mode (default: `false`) | `true`, `false` |

### Obtaining credentials

- **DATABASE_URL**: Vercel Dashboard → Storage → your Postgres instance → `.env` tab
- **RESEND_API_KEY**: [resend.com/api-keys](https://resend.com/api-keys)
- **Dashboard magic link auth**: configure `ADMIN_EMAIL_ALLOWLIST` in the
  backend Vercel project with a comma-separated list of ride leader emails.
- **GitHub OAuth**: GitHub Developer settings → OAuth Apps. Callback URL:
  `https://www.across-cc.de/auth/callback`

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
