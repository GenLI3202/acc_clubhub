# Sub-Plan: Admin Portal

> Part of #53 — Admin Dashboard MVP
> Status: ⚠️ BLOCKED — All code implemented & deployed; blocked by Issue [#67](https://github.com/GenLI3202/acc_clubhub/issues/67) (`/dashboard/login` returns 404)

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

### Phase A: Shared Auth Infrastructure ✅ Complete

**1. Switch Astro to server mode** ✅

`frontend/astro.config.mjs` — `output: 'server'` (note: 'hybrid' was deprecated; using 'server' with per-page `prerender = true` for static pages)

**2. Register GitHub OAuth App env vars** ✅

In Vercel dashboard (frontend project):
```
ADMIN_SESSION_SECRET=<random 64-char hex string>
GITHUB_CLIENT_ID=<from OAuth App>
GITHUB_CLIENT_SECRET=<from OAuth App>
```

**3. Create new GitHub OAuth App** ✅

Registered. Callback URL: `https://www.accross-cc.de/auth/callback`

**4. Create Vercel rewrite for API proxy** ✅

`frontend/vercel.json` — rewrites for `/api/admin/:path*` and `/auth/:path*` → backend

---

### Phase B: Backend Auth Routes ✅ Complete

**5. `backend/routes/auth.py`** ✅

Implemented & deployed. Fixes applied: `|` separator for state token, `PUBLIC_FRONTEND_URL` for redirect_uri, `repo` OAuth scope, logout changed to GET.

Endpoints: `GET /auth/login`, `GET /auth/callback`, `GET /auth/me`, `GET /auth/logout`

---

### Phase C: Backend Admin API Routes ✅ Complete

**6. `backend/routes/admin.py`** ✅

Implemented & deployed. All 4 endpoints active. Fix applied: `Depends()` used directly as default arg (broken helper wrapper removed).

---

### Phase D: Frontend Admin Pages ✅ Complete

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

| # | Test | Status |
|---|------|--------|
| 1 | Visit `/dashboard/login` → see login page | ❌ Returns 404 — Issue [#67](https://github.com/GenLI3202/acc_clubhub/issues/67) |
| 2 | Click GitHub login → OAuth → redirected to `/dashboard/events` | ✅ OAuth flow works (confirmed manually) |
| 3 | Non-collaborator GitHub account → 403 | Not tested |
| 4 | Click event → see RSVP list | ✅ Works (after DB migration fixed view_token columns) |
| 5 | Cancel RSVP → status changes | Not tested end-to-end |
| 6 | Export CSV → downloads file | Not tested end-to-end |
| 7 | Logout → session cleared | ✅ Works |
| 8 | `/admin/` → Sveltia CMS loads (no collision) | ✅ Works |
| 9 | Spot counts match between dashboard and event page | ❌ Issue [#66](https://github.com/GenLI3202/acc_clubhub/issues/66) |
