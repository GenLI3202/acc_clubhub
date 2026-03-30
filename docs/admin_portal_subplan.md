# Sub-Plan: Admin Portal

> Part of #53 — Admin Dashboard MVP
> Status: IN PROGRESS — Backend complete, frontend complete, diagnosis fixes applied

## Scope

GitHub OAuth protected admin UI for managing event registrations. MVP includes:
- Event list with registration stats
- Event RSVPs detail (name, email, status, notes)
- Cancel RSVP action
- CSV export

Deferred: Subscriber management (Phase 4.3.4)

## Route Change (2026-03-30)

**All `/admin/` paths moved to `/dashboard/`** to avoid collision with Sveltia CMS.
- `/dashboard/login` — GitHub OAuth login
- `/dashboard/` — Admin hub
- `/dashboard/events` — Event list
- `/dashboard/events/[id]` — RSVP detail

---

## Implementation Steps

### Phase A: Shared Auth Infrastructure

**1. Switch Astro to hybrid mode**

File: `frontend/astro.config.mjs`
```js
// Change output: 'static' → 'hybrid'
export default defineConfig({
  output: 'hybrid',  // was 'static'
  adapter: vercel(),
})
```

**2. Register GitHub OAuth App env vars**

In Vercel dashboard (frontend project):
```
ADMIN_SESSION_SECRET=<random 64-char hex string>
GITHUB_CLIENT_ID=<from OAuth App>
GITHUB_CLIENT_SECRET=<from OAuth App>
```

**3. Create new GitHub OAuth App**

Go to: GitHub Settings > Developer settings > OAuth Apps > New OAuth App

- Application name: `ACC ClubHub Admin`
- Homepage URL: `https://www.accross-cc.de`
- Authorization callback URL: `https://www.accross-cc.de/auth/callback`

Copy Client ID and Secret → add to Vercel env vars.

**4. Create Vercel rewrite for API proxy**

File: `frontend/vercel.json` (create if not exists)
```json
{
  "rewrites": [
    { "source": "/api/admin/:path*", "destination": "https://acc-clubhub-events-ms.vercel.app/api/admin/:path*" }
  ]
}
```

This avoids CORS when Astro SSR pages call the backend API.

---

### Phase B: Backend Auth Routes

**5. Create `backend/routes/auth.py`**

Contains:
- `get_github_auth_url()` — builds GitHub OAuth URL with signed state param
- `get_access_token(code)` — exchanges code for GitHub access token
- `check_collaborator(github_token, username)` — calls GitHub API to verify collaborator
- `create_jwt_session(github_login, github_user_id)` — creates JWT with 24h expiry
- `verify_jwt_session(token)` — verifies and returns payload
- `get_current_admin(request)` — FastAPI dependency

Endpoints:
```
GET  /auth/login         → redirect to GitHub
GET  /auth/callback      → exchange code, verify collaborator, set cookie
GET  /auth/me            → return current user or 401
POST /auth/logout        → clear cookie
```

JWT payload: `{github_login, github_user_id, exp}`
Cookie: `admin_session`, httpOnly, sameSite=lax, secure, 24h

---

### Phase C: Backend Admin API Routes

**6. Create `backend/routes/admin.py`**

Requires: valid `admin_session` JWT cookie (via `get_current_admin` dependency)

```
GET  /api/admin/events
     → Returns: [{id, title, event_date, location, max_participants,
                  confirmed_count, waitlist_count, spots_remaining}]

GET  /api/admin/events/{id}/rsvps
     → Returns: {event: {id, title, slug},
                 rsvps: [{id, name, email, status, notes, created_at}]}

POST /api/admin/events/{id}/rsvp/cancel
     Body: {rsvp_id: int}
     → Sets RSVP status='cancelled' (DB trigger updates current_participants)

GET  /api/admin/events/{id}/rsvps.csv
     → Returns CSV download: name,email,status,notes,created_at
```

---

### Phase D: Frontend Admin Pages

**7. `frontend/src/pages/dashboard/login.astro`** ✅ Implemented

SSR page with GitHub OAuth button. Redirects authenticated users to `/dashboard/events`.

**8. `frontend/src/pages/dashboard/index.astro`** ✅ Implemented

Protected landing page. Checks `/auth/me` — redirects to `/dashboard/login` if 401.
Shows welcome message and navigation grid.

**9. `frontend/src/pages/dashboard/events/index.astro`** ✅ Implemented

Protected SSR page. Fetches `/api/admin/events`. Shows event table with stats.

**10. `frontend/src/pages/dashboard/events/[id].astro`** ✅ Implemented

Protected SSR page. Full RSVP table with cancel action (via data-attributes + event delegation) and CSV export.

---

## File Changes Summary

**New files:**
- `backend/routes/auth.py`
- `backend/routes/admin.py`
- `frontend/vercel.json`
- `frontend/src/pages/dashboard/login.astro`
- `frontend/src/pages/dashboard/index.astro`
- `frontend/src/pages/dashboard/events/index.astro`
- `frontend/src/pages/dashboard/events/[id].astro`

**Modified files:**
- `frontend/astro.config.mjs` — `output: 'static'` → `'hybrid'`
- `backend/app.py` — register `/auth` and `/api/admin` routers
- `backend/config.py` — add 3 new env vars

---

## Verification

1. Visit `/dashboard/login` → GitHub OAuth page → approve → redirected to `/dashboard/events` → see event table
2. Non-collaborator GitHub account → 403 error page
3. Click event → see full RSVP list with emails
4. Cancel an RSVP → disappears from confirmed, `current_participants` decrements
5. Export CSV → downloads valid CSV file
6. Logout → session cleared, `/dashboard/*` returns 401
7. Visit `/admin/` → Sveltia CMS loads (no collision)
