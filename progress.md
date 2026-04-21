# ACC ClubHub — Progress

> Single source of truth for project status. Update after every task.

## Project Overview

- **Created**: 2026-01-01 (revitalized)
- **Tech Stack**: Astro 5 (SSG) · Preact · TypeScript · FastAPI · SQLAlchemy · PostgreSQL (Neon) · Vercel · Sveltia CMS · Resend · Waline
- **Live Site**: [www.accross-cc.de](https://www.accross-cc.de) · **API**: [acc-clubhub-events-ms.vercel.app](https://acc-clubhub-events-ms.vercel.app/docs)
- **Status**: 🟢 Registration + email delivery live — subscription system complete — custom domain active

## Current Architecture

| Layer                              | Responsibility                                            | Key Files                                          |
| ---------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| **Frontend (Astro)**         | Static site generation, i18n routing, content collections | `frontend/src/pages/`, `frontend/src/content/` |
| **CMS (Sveltia)**            | Git-based content management via `/admin`               | `frontend/public/admin/`                         |
| **Backend (FastAPI)**        | Event registration API, email notifications               | `backend/app.py`, `backend/routes/`            |
| **Database (Neon/Postgres)** | Events, RSVPs, subscribers                                | `backend/models.py`, `backend/database.py`     |
| **Email (Resend)**           | Multilingual registration confirmations (zh/en/de)        | `backend/services/email.py`                      |
| **Comments (Waline)**        | Community discussion on articles                          | External Waline deployment                         |

## Completed Features

- [X] **Layer 1 — Base Setup**: Astro project scaffold, basic routing, Vercel deployment
- [X] **Layer 2 — Design & Polish**: CSS custom-property design system, responsive layout, typography
- [X] **Layer 3 — CMS + i18n**
  - [X] Sveltia CMS integration with GitHub OAuth (`/admin`)
  - [X] Content collections: Media, Knowledge (Gear/Training), Routes
  - [X] Dynamic routing from Markdown/MDX content
  - [X] i18n: Chinese (default) / English / German with prefix routing
- [X] **Phase 4.1 — Search & Filter**: Fuse.js fuzzy search, tag/category filtering
- [X] **Phase 4.2 — Comments**: Waline comments system integration
- [X] **Phase 4.3.1 — Basic Event Registration**
  - [X] FastAPI backend deployed to Vercel (`acc-clubhub-events-ms.vercel.app`)
  - [X] Neon Postgres database with event + RSVP schema
  - [X] Email-based registration (Name + Email, no OAuth)
  - [X] Multilingual email notifications via Resend (zh/en/de)
  - [X] Preact registration form component
  - [X] Privacy policy pages (zh/en/de) — GDPR compliant
  - [X] Database triggers for seat management
- [X] **Event Registration Error Handling** (2026-03-26)
  - [X] Global exception handler in FastAPI — ensures CORS headers on all 500 errors
  - [X] Safe JSON parse in frontend form (`EventRegistrationForm.tsx`)
  - [X] Localized error messages: network error, server error, form init failure (zh/en/de)
  - [X] `eventId=0` guard — shows error UI + reload button instead of broken form
  - [X] `lang` passed in RSVP POST body so backend sends emails in correct language
  - [X] German email templates added to `email.py` (confirmation + waitlist)
  - [X] `_ensure_subscriber` now receives `lang` from RSVP flow
- [X] **Phase A — Global Style Refresh** (2026-03-29)
  - [X] New Rapha-inspired palette: wine red `#C62828` accent, clean white canvas, full design token system in `variables.css`
  - [X] Removed all skew transforms (`--angle-motion: 0deg`) and hard-edge drop shadows site-wide
  - [X] Transparent → white scroll header: `position: fixed` in transparent mode, smooth backdrop-filter transition
  - [X] Homepage hero: full-viewport photo, dark gradient overlay, club name + tagline + CTA
  - [X] Tokens propagated to Footer, Masonry, FilterComponents, SearchBar, ArticleLayout, EventRegistrationForm
  - [X] Search icon white in transparent header mode
  - [X] Language switcher converted to click-toggle (no more hover-gap dismissal bug)
- [X] **Phase B — Events Three-Layer Redesign** (2026-03-29)
  - [X] `EventHero.astro` — full-width carousel, bare SVG chevron arrows at content edges, dots centred bottom
  - [X] `UpcomingEvents.astro` — card grid for non-featured upcoming non-social-ride events
  - [X] `WeeklyRegulars.astro` — compact list rows for recurring social-ride events
  - [X] `PastEvents.astro` — grayscale archive, colour on hover
  - [X] `eventHelpers.ts` — pure functions: `splitEvents`, `getRegulars`
  - [X] `displaySection: hero|upcoming|regular` added to events schema; replaces `featured` boolean (Issue [#60](https://github.com/GenLI3202/acc_clubhub/issues/60))
  - [X] 4 dummy events added (zh/en/de): spring-classic-2026, stadtpark-social-april, wheel-workshop-may, isar-gravel-june
  - [X] Events `index.astro` rewritten: transparent header, hero slot, drops legacy EventsPage/FilterPanel
  - [X] Events page also uses transparent header with hero preload hint
- [X] **Content Authoring Standards** (2026-03-30) — Issue [#60](https://github.com/GenLI3202/acc_clubhub/issues/60)
  - [X] `displaySection` field replaces `featured` in events schema; all event md files backfilled
  - [X] Past event registration gate: detail page shows "ended" notice instead of form for past events
  - [X] Templates added for all 5 content collections — stored in `docs/content-templates/` (not inside content dirs, to prevent Astro generating fake pages)
  - [X] `getTodayAtMidnight()` extracted to `eventHelpers.ts`; removes duplicate date logic in `[slug].astro`
  - [X] `MAINTENANCE.md` Section 10 added: content authoring guide with template reference table
- [X] **Production Domain + Email Infrastructure** (2026-03-28)
  - [X] Registered `accross-cc.de` via IONOS (Domain-only plan)
  - [X] Custom domain live: `www.accross-cc.de` → Vercel frontend (DNS: A `216.198.79.1`, CNAME `www`)
  - [X] Resend sending domain `events.accross-cc.de` verified (EU Frankfurt); IONOS DNS: DKIM TXT, SPF MX, SPF TXT
  - [X] Fixed `database.py`: strip libpq URL params (`sslmode`, `channel_binding`); use `ssl_context` via `connect_args` — resolves pg8000 TypeError on Neon connection
  - [X] Updated `email.py` from address: `noreply@events.accross-cc.de`
  - [X] Confirmation emails fixed to English-only regardless of UI language (Issue [#52](https://github.com/GenLI3202/acc_clubhub/issues/52))
  - [X] Success message shows submitted email address
  - [X] Fixed privacy policy page: markdown now rendered as HTML via `marked`
- [X] **Phase 4.3.3 — CMS-Driven Event Registration** (2026-03-27)
  - [X] Events schema extended: `maxParticipants`, `registrationDeadline`, `registrationLink` fields in frontmatter
  - [X] `POST /api/rsvp` endpoint — slug-based, auto-creates DB event record on first RSVP
  - [X] Frontend passes markdown metadata as `data-*` attributes; form hydrates without any API fetch
  - [X] Deadline check moved to frontend (no backend round-trip needed)
  - [X] Deleted `populate_events_via_api.py` and `sync_events.py` — zero manual DB work per new event
  - [X] Old `POST /api/events/{event_id}/rsvp` kept intact (no breaking change)
- [X] **Homepage UI Polish** (2026-03-30)
  - [X] Fixed scattered `export const prerender = true;` raw text rendering on 13 pages
  - [X] Removed header logo and added full-width background logo watermark using `clip-path` in `index.astro`
- [X] **Phase 4.3.4 — Subscriber Broadcast** (Issue [#51](https://github.com/GenLI3202/acc_clubhub/issues/51)) (2026-04-06)
  - [X] `POST /api/admin/broadcast/{event_slug}` endpoint — sends multilingual announcement to all active subscribers
  - [X] Unsubscribe link included in every broadcast email
  - [X] Protected by admin JWT cookie; Astro SSR proxy at `/dashboard/broadcast`
  - [X] Backend tests: 4 scenarios (broadcast, no subscribers, unknown slug, unauthorized)
- [X] **Phase 4.3.5 — Admin Dashboard** (Issue [#53](https://github.com/GenLI3202/acc_clubhub/issues/53)) (2026-04-06)
  - [X] GitHub OAuth login flow (state token, collaborator check, JWT cookie)
  - [X] Backend: `auth.py` (login / callback / me / logout), `admin.py` (events list, RSVP detail, cancel, CSV)
  - [X] Frontend: `/dashboard/login`, `/dashboard/`, `/dashboard/events`, `/dashboard/events/[id]`
  - [X] Subscriber list dashboard page at `/dashboard/subscribers`
  - [X] Participant Portal: `view_token` in model, `/api/events/{slug}/participant` endpoint, portal link in confirmation emails
  - [X] DB migration: `view_token` + `privacy_accepted` columns added to production Neon DB
- [X] **Bug Fixes — Performance & Media** (2026-04-06)
  - [X] Android frame drops on Mechanical Knowledge section fixed — GPU-composited image transitions + `content-visibility: auto` (Issue [#19](https://github.com/GenLI3202/acc_clubhub/issues/19))
  - [X] HEIC image upload support — dashboard converter tool page using `heic2any` (Issue [#13](https://github.com/GenLI3202/acc_clubhub/issues/13))
  - [X] Comment silent fail + OAuth provider restriction fixed — Waline config updated (Issue [#30](https://github.com/GenLI3202/acc_clubhub/issues/30))
- [X] **Strava Club Section** (PR [#83](https://github.com/GenLI3202/acc_clubhub/pull/83), [#87](https://github.com/GenLI3202/acc_clubhub/pull/87)) (2026-04-13)
  - [X] Floating sidebar Strava widget on homepage (`StravaWidget.astro`)
  - [X] Mobile bottom bar for Strava widget — fixed-position, full-width, Astro CSS scoping fixed
  - [X] Copy rewritten to emphasise community and training enjoyment over leaderboard competition
- [X] **Subscription System Fixes** (PR [#88](https://github.com/GenLI3202/acc_clubhub/pull/88), [#89](https://github.com/GenLI3202/acc_clubhub/pull/89)) (2026-04-13)
  - [X] **#84** — Unsubscribe 404 fixed: Astro SSR proxy page at `/api/unsubscribe/[token]` calls FastAPI server-to-server and renders confirmation UI
  - [X] **#85** — Subscription confirmation email: `_ensure_subscriber()` returns `(subscriber, is_new)`; confirmation email sent only for new subscribers, non-fatal
  - [X] **#86** — Floating subscribe banner (`SubscribeFloatingBanner.astro`): appears on events list page and past event detail pages; X-dismiss is session-only, localStorage only set on successful subscription
- [X] **Layout & Responsive Improvements** (PR #90) (2026-04-14)
  - [X] `--max-width` increased to `clamp(960px, 65vw, 1400px)` — fluid between 960 px and 1400 px
  - [X] Pillar image aspect ratio changed from `3/2` to `16/9`
- [X] **Event Date/Time Sync Improvements** (2026-04-15)
  - [X] Prevented stripping of time components in `content.config.ts` for event dates
  - [X] Replaced custom string parsing with Pydantic's native `datetime` type in the FastAPI backend
  - [X] Made `POST /api/rsvp` sync updated Markdown metadata directly to the PostgreSQL database on every RSVP
  - [X] Fixed 2026 Season Opening event date/time across all languages
- [X] **Dashboard Participant Sync Fix** (2026-04-15)
  - [X] Removed Python-level `current_participants` modification in `admin.py` to prevent trigger double-counting (resolving the 6 confirmed vs 2/35 bug)
  - [X] Updated SQLite-based `test_admin_cancel.py` unit tests to bypass trigger-dependent assertions
- [X] **Phase 8 — About Page Editorial Redesign** (2026-04-19)
  - [X] Branch: `phase-8/about-editorial-redesign`, sourced from Claude Design "Pegboard → Stamp Wall" export
  - [X] Replaced template About page with: hero title block, two-paragraph intro lede, three-stanza "Across" poem (mountains / paths / borders) with sequential IntersectionObserver reveal, "Our Garage" stamp-wall marquee (rAF-driven infinite scroll, wheel nudge, pause on hover, two rows × 3 laps for seamless loop), Featured Riders accordion (`grid-template-rows` 0fr→1fr expand), Contact section with mailto + Strava CTAs
  - [X] Click a stamp → wobble + member-card modal overlay; Escape / click-outside to close
  - [X] 12-rider roster (`src/lib/about/members.ts`): 4 real + 8 placeholders until bios are authored
  - [X] New i18n keys `about.*` across zh / en / de
  - [X] Dark mode: swaps stamp-ring image (red→white), adjusts shadows + edge-fade colors via `:root.dark`
  - [X] Assets: 4 bike cutout PNGs + 2 ACC stamp logos copied to `frontend/public/images/about/`
- [X] **Phase 9 — Media Architecture & Recap Post** (2026-04-20)
  - [X] Restructured `public/images/posts/` into `public/images/media/` to mirror the `src/content/media/` schema.
  - [X] Added type-based storage subdirectories (`group-ride/`, `video/`, `adventure/`, `interview/`) inside `media/`.
  - [X] Replaced the legacy `gallery` type with `group-ride` for semantic accuracy across content configs and schemas.
  - [X] Authored the 2026 Season Opening Recap post, conforming to the new structural governance (`MAINTENANCE.md`).
  - [X] Bulk updated historical media posts to correctly reference images under the new architecture.
- [X] **Knowledge Gear Editorial Redesign** (2026-04-21)
  - [X] Rebuilt `/[lang]/knowledge/gear` with the shared editorial hero, featured shelf, category shelves, and bordered article grid used by the training library page.
  - [X] Added gear `featured` schema support and marked three curated gear articles per locale as featured.
  - [X] Backfilled gear content categories across zh/en/de for bike-build, electronics, apparel, and maintenance shelves.
  - [X] Added gear subtitle and category description i18n keys across zh/en/de.
  - [X] Verified `bun run build` succeeds; `astro check` remains blocked by pre-existing project-wide type errors outside this task.
- [X] **Routes Editorial Redesign** (2026-04-21)
  - [X] Rebuilt `/[lang]/routes` with editorial hero, featured shelf, difficulty shelves, and an all-routes FilterPanel grid.
  - [X] Added data-first `RouteCard` variants for static shelves and interactive filtered results.
  - [X] Added routes `featured` schema support and marked three curated routes per locale as featured.
  - [X] Preserved existing region/difficulty/surface/distance/elevation filtering while replacing masonry cards.
  - [X] Created follow-up Issue [#113](https://github.com/GenLI3202/acc_clubhub/issues/113) for future map data and Komoot-style split view.
  - [X] Verified `bun run build` succeeds; `astro check` remains blocked by pre-existing project-wide type errors outside this task.

## In Progress

- [ ] **Admin Dashboard — Outstanding Issues**
  - [ ] **BLOCKED** — `/dashboard/login` returns 404 (Issue [#67](https://github.com/GenLI3202/acc_clubhub/issues/67))
  - [ ] Registration spot count mismatch in dashboard (Issue [#66](https://github.com/GenLI3202/acc_clubhub/issues/66))
  - [ ] Participant portal not tested end-to-end
- [ ] **E2E Testing**
  - [ ] E2E functional testing for registration flow (8 test scenarios)
  - [ ] Email delivery monitoring

## Planned

- [ ] **Phase 4.4 — Authentication** (future)

## Known Issues

<!-- Track bugs and tech debt as they arise. -->
<!-- Format: - [ ] Issue — severity (low/med/high) -->
<!-- Full triage with agent work order: docs/issues_sorted_for_agents.md -->

> Full issue triage (priority tiers + agent work order): **[docs/issues_sorted_for_agents.md](docs/issues_sorted_for_agents.md)**

- [ ] `/dashboard/login` returns HTTP 404 — high (Issue [#67](https://github.com/GenLI3202/acc_clubhub/issues/67)) — middleware fix deployed, still 404
- [ ] Language switcher non-functional on pages with `client:load` Preact components (gear, routes, media, training) — high (Issue [#68](https://github.com/GenLI3202/acc_clubhub/issues/68))
- [ ] Registration spot count mismatch in dashboard — med (Issue [#66](https://github.com/GenLI3202/acc_clubhub/issues/66))
- [ ] E2E tests not yet written for registration flow — med
- [ ] Dark mode (`prefers-color-scheme: dark`) not implemented — low (Issue [#55](https://github.com/GenLI3202/acc_clubhub/issues/55))
- [ ] Cancelled users cannot re-register via frontend OR be restored by admins, violating DB constraints and sync logic — high

## Architecture Decisions

| Decision                                                                   | Rationale                                                                                                                                                                    | Date       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Email-based registration (no OAuth)                                        | Lower friction for event sign-ups; GDPR simpler without social login                                                                                                         | 2026-01    |
| FastAPI as separate Vercel deployment                                      | Decoupled from static frontend; independent scaling and deployment                                                                                                           | 2026-01    |
| Waline over Giscus for comments                                            | Giscus requires GitHub account (friction for Chinese users); Waline self-hosted, no account needed                                                                           | 2026-01    |
| Neon Postgres (same DB as Waline)                                          | Reuse existing database instance; reduce Vercel storage costs                                                                                                                | 2026-01    |
| Sveltia CMS over Decap CMS                                                 | Better UX for content editors; same Git-based approach                                                                                                                       | 2026-01    |
| pg8000 over psycopg2 for backend                                           | Pure Python driver — works on Vercel's serverless runtime without native libs                                                                                               | 2026-01    |
| Applied `fullstack` archetype (AGENTS.md)                                | Enforces layer separation, API contract sync, and component organization rules for combined frontend + backend repo                                                          | 2026-03-26 |
| CMS as single source of truth for events (AD #10)                          | Markdown frontmatter drives event metadata; DB only stores RSVP interaction data; backend auto-creates event on first registration — eliminates manual SQL per new event    | 2026-03-27 |
| Resend subdomain `events.accross-cc.de` for transactional email (AD #11) | Subdomain isolates email reputation from root domain; verified via IONOS DNS; pg8000 SSL fixed by stripping libpq URL params and using `connect_args={"ssl_context": ...}` | 2026-03-28 |
| Domain migration `accross-cc.de` → `across-cc.de` (AD #15) | Original go-live domain contained a typo (doubled "c"); correct domain registered and migrated 2026-04-20; old domain kept as 308 redirect for 1 year | 2026-04-20 |
| English-only confirmation emails (AD #12)                                  | Single language avoids partial-translation issues; English works across all user locales; UI language does not affect email language                                         | 2026-03-28 |
| Hand-rolled CSS over Tailwind (AD #13)                                     | Full control over design tokens; no purge/JIT edge cases; CSS custom properties shared across Astro + Preact components without extra tooling                                | 2026-03-29 |
| Events carousel:`featured` flag in frontmatter (AD #14)                  | CMS editors control which events appear in the hero carousel via a boolean field; no code change needed to promote/demote an event                                           | 2026-03-29 |
| Media folder type-based subdirectories (AD #16)                            | Moving from a flat `posts/` folder to `media/{type}/` ensures media assets are robustly sorted by their semantic genre (`group-ride`, `video`, etc.)                         | 2026-04-20 |

### 2026-04-20 — Domain migration: accross-cc.de → across-cc.de

- [X] Discovered original domain `accross-cc.de` contained a typo (doubled "c")
- [X] Registered correct domain `across-cc.de` at IONOS
- [X] Added new domain to Vercel frontend project (both apex + www, 307 redirect apex → www)
- [X] Configured IONOS DNS: A `@ → 216.198.79.1`, CNAME `www → dfc7627abbb7145b.vercel-dns-017.com`
- [X] Migrated Resend sending domain from `events.accross-cc.de` to `events.across-cc.de` (EU Frankfurt, re-verified DKIM/SPF)
- [X] Global find/replace `accross-cc` → `across-cc` across 6 runtime files (27 substitutions); historical/archived docs preserved as-is
- [X] Updated Vercel env var `PUBLIC_FRONTEND_URL` → `https://www.across-cc.de`
- [X] Updated GitHub OAuth callback URL to `https://www.across-cc.de/auth/callback`
- [X] Added `across-cc.de` to Sveltia CMS Cloudflare Worker allowed domains
- [X] Configured 308 permanent redirect from `accross-cc.de` + `www.accross-cc.de` → `www.across-cc.de`
- [X] Updated `MAINTENANCE.md` with new URLs and added "Domain History" section
- [X] Full runbook archived at `.private/domain_migration.md` (gitignored)
