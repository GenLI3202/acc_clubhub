# ACC ClubHub — Progress

> Single source of truth for project status. Update after every task.

## Project Overview

- **Created**: 2026-01-01 (revitalized)
- **Tech Stack**: Astro 5 (SSG) · Preact · TypeScript · FastAPI · SQLAlchemy · PostgreSQL (Neon) · Vercel · Sveltia CMS · Resend · Waline
- **Live Site**: [www.accross-cc.de](https://www.accross-cc.de) · **API**: [acc-clubhub-events-ms.vercel.app](https://acc-clubhub-events-ms.vercel.app/docs)
- **Status**: 🟢 Registration + email delivery live — custom domain active

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
- [x] **Layer 2 — Design & Polish**: CSS custom-property design system, responsive layout, typography
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
- [x] **Phase A — Global Style Refresh** (2026-03-29)
  - [x] New Rapha-inspired palette: wine red `#C62828` accent, clean white canvas, full design token system in `variables.css`
  - [x] Removed all skew transforms (`--angle-motion: 0deg`) and hard-edge drop shadows site-wide
  - [x] Transparent → white scroll header: `position: fixed` in transparent mode, smooth backdrop-filter transition
  - [x] Homepage hero: full-viewport photo, dark gradient overlay, club name + tagline + CTA
  - [x] Tokens propagated to Footer, Masonry, FilterComponents, SearchBar, ArticleLayout, EventRegistrationForm
  - [x] Search icon white in transparent header mode
  - [x] Language switcher converted to click-toggle (no more hover-gap dismissal bug)
- [x] **Phase B — Events Three-Layer Redesign** (2026-03-29)
  - [x] `EventHero.astro` — full-width carousel, bare SVG chevron arrows at content edges, dots centred bottom
  - [x] `UpcomingEvents.astro` — card grid for non-featured upcoming non-social-ride events
  - [x] `WeeklyRegulars.astro` — compact list rows for recurring social-ride events
  - [x] `PastEvents.astro` — grayscale archive, colour on hover
  - [x] `eventHelpers.ts` — pure functions: `splitEvents`, `getRegulars`
  - [x] `displaySection: hero|upcoming|regular` added to events schema; replaces `featured` boolean (Issue [#60](https://github.com/GenLI3202/acc_clubhub/issues/60))
  - [x] 4 dummy events added (zh/en/de): spring-classic-2026, stadtpark-social-april, wheel-workshop-may, isar-gravel-june
  - [x] Events `index.astro` rewritten: transparent header, hero slot, drops legacy EventsPage/FilterPanel
  - [x] Events page also uses transparent header with hero preload hint
- [x] **Content Authoring Standards** (2026-03-30) — Issue [#60](https://github.com/GenLI3202/acc_clubhub/issues/60)
  - [x] `displaySection` field replaces `featured` in events schema; all event md files backfilled
  - [x] Past event registration gate: detail page shows "ended" notice instead of form for past events
  - [x] Templates added for all 5 content collections — stored in `docs/content-templates/` (not inside content dirs, to prevent Astro generating fake pages)
  - [x] `getTodayAtMidnight()` extracted to `eventHelpers.ts`; removes duplicate date logic in `[slug].astro`
  - [x] `MAINTENANCE.md` Section 10 added: content authoring guide with template reference table
- [x] **Production Domain + Email Infrastructure** (2026-03-28)
  - [x] Registered `accross-cc.de` via IONOS (Domain-only plan)
  - [x] Custom domain live: `www.accross-cc.de` → Vercel frontend (DNS: A `216.198.79.1`, CNAME `www`)
  - [x] Resend sending domain `events.accross-cc.de` verified (EU Frankfurt); IONOS DNS: DKIM TXT, SPF MX, SPF TXT
  - [x] Fixed `database.py`: strip libpq URL params (`sslmode`, `channel_binding`); use `ssl_context` via `connect_args` — resolves pg8000 TypeError on Neon connection
  - [x] Updated `email.py` from address: `noreply@events.accross-cc.de`
  - [x] Confirmation emails fixed to English-only regardless of UI language (Issue [#52](https://github.com/GenLI3202/acc_clubhub/issues/52))
  - [x] Success message shows submitted email address
  - [x] Fixed privacy policy page: markdown now rendered as HTML via `marked`
- [x] **Phase 4.3.3 — CMS-Driven Event Registration** (2026-03-27)
  - [x] Events schema extended: `maxParticipants`, `registrationDeadline`, `registrationLink` fields in frontmatter
  - [x] `POST /api/rsvp` endpoint — slug-based, auto-creates DB event record on first RSVP
  - [x] Frontend passes markdown metadata as `data-*` attributes; form hydrates without any API fetch
  - [x] Deadline check moved to frontend (no backend round-trip needed)
  - [x] Deleted `populate_events_via_api.py` and `sync_events.py` — zero manual DB work per new event
  - [x] Old `POST /api/events/{event_id}/rsvp` kept intact (no breaking change)
- [x] **Homepage UI Polish** (2026-03-30)
  - [x] Fixed scattered `export const prerender = true;` raw text rendering on 13 pages
  - [x] Removed header logo and added full-width background logo watermark using `clip-path` in `index.astro`

## In Progress

- [ ] **E2E Testing**
  - [ ] E2E functional testing for registration flow (8 test scenarios)
  - [ ] Email delivery monitoring

## Planned

- [ ] **Phase 4.3.4 — Subscriber Broadcast** (Issue [#51](https://github.com/GenLI3202/acc_clubhub/issues/51))
  - [ ] `POST /api/admin/broadcast/{event_slug}` endpoint
  - [ ] Sends multilingual announcement to all active subscribers
  - [ ] Unsubscribe link in every broadcast email
  - [ ] Protected by admin token

- [ ] **Phase 4.3.5 — Admin Dashboard** (Issue [#53](https://github.com/GenLI3202/acc_clubhub/issues/53))
  - [ ] View registrations per event (confirmed / waitlist / spots remaining)
  - [ ] Manage email subscriber list (view, export, unsubscribe)
  - [ ] Simple read-only web UI — no SQL editor required
  - [ ] Protected by admin token

- [ ] **Phase 4.4 — Authentication** (future)
- [ ] **Phase 4.2.2 — WeChat Integration** (`docs/rebuild_plan/future_add_on/phase_4_2_2_wechat_plan.md`)

## Known Issues

<!-- Track bugs and tech debt as they arise. -->
<!-- Format: - [ ] Issue — severity (low/med/high) -->
<!-- Full triage with agent work order: docs/issues_sorted_for_agents.md -->

> Full issue triage (priority tiers + agent work order): **[docs/issues_sorted_for_agents.md](docs/issues_sorted_for_agents.md)**

- [ ] E2E tests not yet written for registration flow — med
- [ ] Android frame drops on Mechanical Knowledge section — high (Issue [#19](https://github.com/GenLI3202/acc_clubhub/issues/19))
- [ ] HEIC image upload not supported — med (Issue [#13](https://github.com/GenLI3202/acc_clubhub/issues/13))
- [ ] Dark mode (`prefers-color-scheme: dark`) not implemented — low (Issue [#55](https://github.com/GenLI3202/acc_clubhub/issues/55))

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
| Resend subdomain `events.accross-cc.de` for transactional email (AD #11) | Subdomain isolates email reputation from root domain; verified via IONOS DNS; pg8000 SSL fixed by stripping libpq URL params and using `connect_args={"ssl_context": ...}` | 2026-03-28 |
| English-only confirmation emails (AD #12) | Single language avoids partial-translation issues; English works across all user locales; UI language does not affect email language | 2026-03-28 |
| Hand-rolled CSS over Tailwind (AD #13) | Full control over design tokens; no purge/JIT edge cases; CSS custom properties shared across Astro + Preact components without extra tooling | 2026-03-29 |
| Events carousel: `featured` flag in frontmatter (AD #14) | CMS editors control which events appear in the hero carousel via a boolean field; no code change needed to promote/demote an event | 2026-03-29 |
