# ACC ClubHub — Progress

> Single source of truth for project status. Update after every task.

## Project Overview

- **Created**: 2026-01-01 (revitalized)
- **Tech Stack**: Astro 5 (SSG) · Preact · TypeScript · FastAPI · SQLAlchemy · PostgreSQL (Neon) · Vercel · Sveltia CMS · Resend · Waline
- **Status**: 🟢 Phase 4.3.3 complete — CMS-driven registration live

## Current Architecture

| Layer | Responsibility | Key Files |
|-------|---------------|-----------|
| **Frontend (Astro)** | Static site generation, i18n routing, content collections | `frontend/src/pages/`, `frontend/src/content/` |
| **CMS (Sveltia)** | Git-based content management via `/admin` | `frontend/public/admin/` |
| **Backend (FastAPI)** | Event registration API, email notifications | `backend/app.py`, `backend/routes/` |
| **Database (Neon/Postgres)** | Events, RSVPs, subscribers | `backend/models.py`, `backend/database.py` |
| **Email (Resend)** | Multilingual registration confirmations (zh/en/de) | `backend/services/email.py` |
| **Comments (Waline)** | Community discussion on articles | External Waline deployment |

## Completed Features

- [x] **Layer 1 — Base Setup**: Astro project scaffold, basic routing, Vercel deployment
- [x] **Layer 2 — Design & Polish**: TailwindCSS design system, responsive layout, typography
- [x] **Layer 3 — CMS + i18n**
  - [x] Sveltia CMS integration with GitHub OAuth (`/admin`)
  - [x] Content collections: Media, Knowledge (Gear/Training), Routes
  - [x] Dynamic routing from Markdown/MDX content
  - [x] i18n: Chinese (default) / English / German with prefix routing
- [x] **Phase 4.1 — Search & Filter**: Fuse.js fuzzy search, tag/category filtering
- [x] **Phase 4.2 — Comments**: Waline comments system integration
- [x] **Phase 4.3.1 — Basic Event Registration**
  - [x] FastAPI backend deployed to Vercel (`acc-clubhub-events-ms.vercel.app`)
  - [x] Neon Postgres database with event + RSVP schema
  - [x] Email-based registration (Name + Email, no OAuth)
  - [x] Multilingual email notifications via Resend (zh/en/de)
  - [x] Preact registration form component
  - [x] Privacy policy pages (zh/en/de) — GDPR compliant
  - [x] Database triggers for seat management
- [x] **Event Registration Error Handling** (2026-03-26)
  - [x] Global exception handler in FastAPI — ensures CORS headers on all 500 errors
  - [x] Safe JSON parse in frontend form (`EventRegistrationForm.tsx`)
  - [x] Localized error messages: network error, server error, form init failure (zh/en/de)
  - [x] `eventId=0` guard — shows error UI + reload button instead of broken form
  - [x] `lang` passed in RSVP POST body so backend sends emails in correct language
  - [x] German email templates added to `email.py` (confirmation + waitlist)
  - [x] `_ensure_subscriber` now receives `lang` from RSVP flow
- [x] **Phase 4.3.3 — CMS-Driven Event Registration** (2026-03-27)
  - [x] Events schema extended: `maxParticipants`, `registrationDeadline`, `registrationLink` fields in frontmatter
  - [x] `POST /api/rsvp` endpoint — slug-based, auto-creates DB event record on first RSVP
  - [x] Frontend passes markdown metadata as `data-*` attributes; form hydrates without any API fetch
  - [x] Deadline check moved to frontend (no backend round-trip needed)
  - [x] Deleted `populate_events_via_api.py` and `sync_events.py` — zero manual DB work per new event
  - [x] Old `POST /api/events/{event_id}/rsvp` kept intact (no breaking change)

## In Progress

- [ ] **E2E Testing & Deployment**
  - [ ] E2E functional testing (8 test scenarios)
  - [ ] Frontend deployment to production
  - [ ] Email delivery monitoring

## Planned

- [ ] **Phase 4.3.2 — Event UI Redesign** (`docs/rebuild_plan/phase_4_3_2_event_ui.md`)
  - [ ] Featured events hero section
  - [ ] Weekly regulars card grid
  - [ ] Responsive design improvements

- [ ] **Phase 4.4 — Authentication** (future)
- [ ] **Phase 4.2.2 — WeChat Integration** (`docs/rebuild_plan/future_add_on/phase_4_2_2_wechat_plan.md`)

## Known Issues

<!-- Track bugs and tech debt as they arise. -->
<!-- Format: - [ ] Issue — severity (low/med/high) -->

- [ ] E2E tests not yet written for registration flow — med

## Architecture Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Email-based registration (no OAuth) | Lower friction for event sign-ups; GDPR simpler without social login | 2026-01 |
| FastAPI as separate Vercel deployment | Decoupled from static frontend; independent scaling and deployment | 2026-01 |
| Waline over Giscus for comments | Giscus requires GitHub account (friction for Chinese users); Waline self-hosted, no account needed | 2026-01 |
| Neon Postgres (same DB as Waline) | Reuse existing database instance; reduce Vercel storage costs | 2026-01 |
| Sveltia CMS over Decap CMS | Better UX for content editors; same Git-based approach | 2026-01 |
| pg8000 over psycopg2 for backend | Pure Python driver — works on Vercel's serverless runtime without native libs | 2026-01 |
| Applied `fullstack` archetype (AGENTS.md) | Enforces layer separation, API contract sync, and component organization rules for combined frontend + backend repo | 2026-03-26 |
| CMS as single source of truth for events (AD #10) | Markdown frontmatter drives event metadata; DB only stores RSVP interaction data; backend auto-creates event on first registration — eliminates manual SQL per new event | 2026-03-27 |
