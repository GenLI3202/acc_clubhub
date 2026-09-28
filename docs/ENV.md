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
| `ADMIN_EMAIL_ALLOWLIST` | Yes | Comma-separated emails allowed to access `/dashboard` by email login. For the current setup, configure only the shared ride leader admin account in Vercel. | `admin@example.com` |
| `ADMIN_MAGIC_LINK_PASSWORD` | Yes | Shared password required before direct dashboard email login | `replace-with-dashboard-password` |
| `PUBLIC_FRONTEND_URL` | Yes | Trusted HTTPS website origin for published event verification and registration links | `https://www.across-cc.de` |
| `ADMIN_GITHUB_ALLOWLIST` | No | Optional fallback GitHub usernames allowed to access `/dashboard` | `genli3202,rideleader1` |
| `GITHUB_CLIENT_ID` | No | Optional fallback GitHub OAuth App client ID | `Ov23lixxxxxxxxxxxxxx` |
| `GITHUB_CLIENT_SECRET` | No | Optional fallback GitHub OAuth App client secret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `APP_NAME` | No | Application display name (default: `ACC ClubHub API`) | `ACC ClubHub API` |
| `DEBUG` | No | Enable debug mode (default: `false`) | `true`, `false` |

### Obtaining credentials

- **DATABASE_URL**: Vercel Dashboard → Storage → your Postgres instance → `.env` tab
- **RESEND_API_KEY**: [resend.com/api-keys](https://resend.com/api-keys)
- **Dashboard email login**: configure `ADMIN_EMAIL_ALLOWLIST` in the
  backend Vercel project with only the shared ride leader admin account.
  Configure `ADMIN_MAGIC_LINK_PASSWORD` in the same backend project.
- **Published events**: deploy the website's
  `/api/registration-events/{slug}.json` and
  `/api/registration-events/index.json` endpoints before updating the backend.
  Point `PUBLIC_FRONTEND_URL` to that exact website origin. Public RSVP fails
  closed if the website is unavailable or the slug is unpublished.
- **GitHub OAuth**: GitHub Developer settings → OAuth Apps. Callback URL:
  `https://www.across-cc.de/auth/callback`

## Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env` and fill in your values.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PUBLIC_WALINE_SERVER_URL` | Yes | Waline comment system server URL | `https://your-waline.vercel.app` |
| `PUBLIC_API_URL` | Yes | Backend API base URL | `https://acc-clubhub-events-ms.vercel.app` |
| `PUBLIC_SITE_URL` | No | Canonical site URL embedded in generated mobile content | `https://www.across-cc.de` |
| `MOBILE_MINIMUM_APP_VERSION` | No | Oldest app version accepted by the generated mobile feed | `0.1.0` |

## Mobile (`mobile/.env.local`)

The production defaults are built in. Copy `mobile/.env.example` to
`mobile/.env.local` only when testing alternate endpoints.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | No | FastAPI base URL used for live event status and registration | `https://acc-clubhub-events-ms.vercel.app` |
| `VITE_CONTENT_BASE_URL` | No | Base URL for live, localized mobile content feeds | `https://www.across-cc.de/mobile-content/live/v1` |
| `VITE_SITE_URL` | No | Trusted website origin used for links and deep links | `https://www.across-cc.de` |
| `VITE_APP_ENV` | No | `production` or `staging`; staging requires explicit non-production endpoints | `production` |

The signed Android staging pilot uses `ACC_PILOT_API_URL`,
`ACC_PILOT_CONTENT_BASE_URL`, and `ACC_PILOT_SITE_URL` instead of production
defaults. Its `ACC_PILOT_KEYSTORE`, `ACC_PILOT_STORE_PASSWORD`,
`ACC_PILOT_KEY_ALIAS`, `ACC_PILOT_KEY_PASSWORD`, and
`ACC_PILOT_SIGNING_OWNER` inputs are consumed only by the local build script;
do not add them to `VITE_` variables or commit them. See `docs/ANDROID_PILOT.md`.

### Notes

- Variables prefixed with `PUBLIC_` are exposed to the browser.
- Variables prefixed with `VITE_` are embedded in the mobile application.
- For local development, set `PUBLIC_API_URL=http://localhost:8000`.
- Vercel environment variables are configured in the Vercel Dashboard — they do not need a `.env` file in production.

<!-- END AUTO-GENERATED -->

## iOS release environment

Set these in the shell when running `npm run ios:check` or `npm run ios:release`
from `mobile/`. They are build inputs, not `VITE_` runtime configuration, and
are not automatically loaded from `.env.local`.

- `IOS_TEAM_ID`: 10-character Apple Developer Team ID. Configure the associated
  account in Xcode Settings before building. Never put Apple account passwords here.
- `IOS_BUILD_NUMBER`: unused positive integer, up to 9 digits. Passed as
  `CURRENT_PROJECT_VERSION` without modifying the committed project.
- `DEVELOPER_DIR`: optional full Xcode developer path, for example
  `/Applications/Xcode.app/Contents/Developer`, when the selected tools differ.
