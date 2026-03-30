# Plan: #53 Admin Dashboard — Master Plan

> Status: PLANNING

## Overview

Two independent features under one issue:

1. **Admin Portal** — GitHub OAuth protected admin UI for managing registrations and subscribers
2. **Participant Portal** — Token-based participant list view for event attendees

Both can be implemented independently after shared infrastructure (JWT auth, Astro hybrid mode) is in place.

---

## Shared Infrastructure

Both features require:

1. **Astro `output: 'hybrid'`** — Switch from `static` to `hybrid` so admin pages and event detail page can be SSR
2. **JWT Session System** — `ADMIN_SESSION_SECRET` env var, httpOnly JWT cookie
3. **GitHub OAuth App** (for Admin only) — New OAuth App registration in GitHub Developer Settings

### Shared Env Vars

```
# Astro (frontend/.env or Vercel)
ADMIN_SESSION_SECRET=   # random 64-char string
GITHUB_CLIENT_ID=       # from new OAuth App
GITHUB_CLIENT_SECRET=  # from new OAuth App
```

---

## Feature 1: Admin Portal

**Tracker**: `docs/admin_portal_subplan.md`

Scope:

- GitHub OAuth login flow (new dedicated OAuth App)
- JWT session management (24h, httpOnly cookie)
- Admin dashboard: event list with stats
- Admin event detail: full RSVPs with email + cancel action
- CSV export for event RSVPs
- Optionally: subscriber list management

---

## Feature 2: Participant Portal

**Tracker**: `docs/participant_portal_subplan.md`

Scope:

- Add `view_token` to RSVP model
- Generate token on RSVP creation
- New `/api/events/{id}/participant?token=xxx` endpoint
- Email confirmation includes portal link
- Event detail page shows participant list when token is valid

---

## Architecture Decision: Deployment

**Current**: Frontend (Astro static) + Backend (FastAPI) as two separate Vercel deployments
**MVP Decision**: Keep deployments separate; use Vercel rewrite rules to proxy admin API calls

```
www.accross-cc.de/admin/*     → Astro SSR pages
www.accross-cc.de/api/admin/* → rewrite → acc-clubhub-events-ms.vercel.app/api/admin/*
```

### Why not merge now?

- Zero refactoring — no code changes to backend routes, models, or database layer
- Vercel rewrite handles CORS transparently for SSR → API calls
- Simpler deployment: two independently deployable units
- Risk: if backend deployment is down, admin API breaks (acceptable for MVP)

### Future: Merged Deployment (Issue #55)

If the project scales (e.g., Phase 4.3.4 broadcast feature adds more API endpoints, or team grows), consider merging backend into Astro SSR API routes:

**Scope of merge:**

- `backend/routes/rsvp.py` (~460 lines) → `frontend/src/pages/api/`
- `backend/models.py` → keep SQLAlchemy (compatible with Astro env)
- `backend/services/email.py` → move to `frontend/src/lib/`
- `backend/database.py` → keep as-is, adjust connection handling for Astro serverless
- `backend/app.py` → register routes on Astro adapter instead
- `backend/config.py` → move to `frontend/.env`

**Benefits of merge:**

- Single deployment unit
- No CORS or proxy rewrite complexity
- Shared environment variables
- Consistent authentication (cookie works across all routes)

**Tracking**: See Issue #55 for the merge task (to be created).

---

## Sub-Plans

- [Admin Portal Sub-Plan](admin_portal_subplan.md)
- [Participant Portal Sub-Plan](participant_portal_subplan.md)
