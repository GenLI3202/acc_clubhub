# ACC ClubHub — Progress

> Single source of truth for project status. Update after every task.

## Project Overview

- **Created**: 2026-01-01 (revitalized)
- **Tech Stack**: Astro 5 (SSG) · Preact · TypeScript · FastAPI · SQLAlchemy · PostgreSQL (Neon) · Vercel · Sveltia CMS · Resend · Waline
- **Live Site**: [www.accross-cc.de](https://www.accross-cc.de) · **API**: [acc-clubhub-events-ms.vercel.app](https://acc-clubhub-events-ms.vercel.app/docs)
- **Status**: 🟢 Registration + email delivery live — subscription system complete — custom domain active

## Recent Updates

- [X] **About Page Mountain Ridge Background Optimization** (2026-09-03) — branch `phase-9/about-redesign`
  - [X] Re-nested the mountain ridges into a unified `<section class="roads">` container spanning edge-to-edge behind both the ACROSS logo and cards reel.
  - [X] Built a dual-layer alpine terrain system (`roads-ridge--far` and `roads-ridge--near`) sized at `--tile: clamp(300px, 28vw, 400px)`, scaling strokes down by 40% for delicate, fine-line elegance.
  - [X] Anchored the far skyline at the top (`top: clamp(24px, 3.5vw, 48px)`) drifting at 52s, floating misty blue/grey summits behind the ACROSS logo and dissolving before the cards.
  - [X] Anchored the near valley ridges at `bottom: 0` drifting at 34s, keeping text background clear while delivering full concentration (0.88) at the bottom edge.
  - [X] Verified `npx astro check` (0 errors), Vitest (54 passed), and `npm run build` (141 pages generated).

- [X] **Event Cancellation Notifications** (2026-08-25) — branch `phase-4/event-cancellation`
  - [X] Added an Admin Events action with a required cancellation reason and a recipient-count confirmation dialog.
  - [X] Persisted event-wide cancellation state separately from RSVP status and blocked both public registration endpoints after cancellation.
  - [X] Sent an English cancellation email to every confirmed and waitlisted registrant while skipping already-cancelled RSVPs.
  - [X] Updated public zh/en/de event pages from the live operational API without a frontend rebuild, hiding internal and external registration controls and showing the localized reason.
  - [X] Rendered cancellation timestamps in `Europe/Berlin`, including automatic CET/CEST daylight-saving conversion on Vercel SSR.
  - [X] Added migration `013_add_event_cancellation.sql` and schema-health coverage for the cancellation columns.
  - [X] Verified 11 focused backend tests, 54 frontend tests (including summer and winter timezone cases under `TZ=UTC`), `npm run check` (0 errors), `npm run build`, and local SSR output for both Admin controls and a weather-cancelled Chinese event page. The full backend suite remains at 160 passed plus the known historical-alias baseline failure.

- [X] **Eaglet Program Komoot Route Embeds** (2026-08-15)
  - [X] Embedded the Komoot map, elevation profile, and route details for all three Eaglet sessions across zh/en/de event pages.
  - [X] Reused each session's share-token route and the existing Afterwork event embed structure.
  - [X] Verified all nine iframe sources, `npm run check` (0 errors), `npm run test` (48 passed), `npm run build`, and the rendered Chinese Session 1 page (HTTP 200 with the expected embed URL).

- [X] **Komoot Routes in RSVP Confirmation Emails** (2026-08-15)
  - [X] Forwarded optional `routeKomootUrl` metadata through the website RSVP request into confirmation emails without storing it in PostgreSQL.
  - [X] Added localized Komoot links for zh/en/de emails and omitted the section for events without a route.
  - [X] Restricted the public RSVP field to HTTPS Komoot URLs and HTML-escaped the rendered link.
  - [X] Verified 11 focused backend tests, 151 passing full-suite tests plus the known historical-alias baseline failure, frontend `npm run test:all`, and an intercepted browser RSVP containing the exact Session 2 route URL.

- [X] **Eaglet Program Komoot Routes Restored** (2026-08-15)
  - [X] Added the confirmed Komoot route for each of the three Eaglet sessions across zh/en/de event metadata.
  - [X] Used share-token URLs for all three sessions to keep the public route links accessible.
  - [X] Added localized visible route links to all nine event detail tables.
  - [X] Verified all nine route fields and links, `npm run check` (0 errors), `npm run test` (48 passed), `npm run build`, and rendered zh/en/de event pages (HTTP 200 with the expected route links).

- [X] **Ride Leader RSVP Alert Auto-Subscription Fix** (2026-08-12) — branch `phase-4/ride-leader-alert-autoclaim`
  - [X] Automatically enable new-RSVP email alerts when a checked-in RSVP is marked as ride leader.
  - [X] Stop alerts when the leader role or check-in is removed, and require an active leader assignment during recipient selection.
  - [X] Restricted manual alert claims to active ride leaders and clarified the Dashboard workflow copy.
  - [X] Added migration `012_sync_ride_leader_registration_alerts.sql` to enable alerts for existing active ride leaders and clear stale subscriptions.
  - [X] Verified 23 related backend tests, the full backend suite (145 passed plus the known historical-alias baseline failure), Ruff, `npm run test` (48 passed), `npm run check` (0 errors), and `npm run build`.

- [X] **Ride Leader New RSVP Alerts** (2026-08-12) — branch `phase-4/ride-leader-rsvp-alerts`
  - [X] Let a registered Dashboard user claim or stop per-event new-RSVP alerts when the login email matches an active RSVP.
  - [X] Notify every claimed leader after a confirmed or waitlist RSVP commits, while excluding the new participant and cancelled recipients.
  - [X] Keep participant email and notes out of the alert email; include event details, registration status, confirmed capacity, and a Dashboard link.
  - [X] Added migration `011_add_rsvp_registration_alerts.sql` and schema-health coverage for the RSVP alert subscription flag.
  - [X] Verified 8 focused backend tests, `npm run check` (0 errors), `npm run test` (48 passed), `npm run build`, Ruff on new Python files, and a local Dashboard preview (HTTP 200 plus screenshot review).
  - [X] Full backend suite reached 143 passed with one existing historical-alias assertion failure reproduced unchanged on a clean `master` archive.

- [X] **Afterwork Ride Leader WeChat QR Update** (2026-08-12)
  - [X] Replaced the expiring North and South Afterwork group QR codes with the personal WeChat QR codes for ride leaders Dashu (大树) and Ronnie, respectively.
  - [X] Updated zh/en/de event copy to tell participants to add the relevant ride leader, who will invite them to the event group.
  - [X] Preserved the existing email-registration requirement and clarified that adding the ride leader or joining the group does not count as registration.
  - [X] Verified both PNG assets, all six localized recurring-event pages, `npm run check` (0 errors), `npm run test` (48 passed), and `npm run build`.

- [X] **Eaglet Program Meeting Points + Mobile Hero Copy** (2026-08-11) — branch `phase-2/eaglet-mobile-hero`
  - [X] Set confirmed meeting points for all three sessions across zh/en/de event metadata and detail pages.
  - [X] Shortened all nine localized Hero descriptions and removed fee details from Hero copy while retaining fees in the event body.
  - [X] Removed obsolete notices saying meeting points would be announced later.
  - [X] Verified all nine homepage Hero slides at 375 px, `npm run check` (0 errors), `npm test` (48 passed), and `npm run build`.
  - [X] Ran the Markdown-to-database sync locally and verified all three event rows contain the new locations and shortened descriptions.

- [X] **Eaglet Program Content i18n** (2026-08-06) — branch `phase-2/eaglet-i18n`
  - [X] Added complete German and English versions of all three separately registrable Eaglet Program sessions.
  - [X] Added complete German and English versions of the five published training articles.
  - [X] Kept event-to-event and event-to-training links within the selected locale.
  - [X] Removed stale Chinese ACC-specific wording from two event-page references.
  - [X] Verified with `npm run check` (0 errors), `npm test` (48 passed), `npm run build`, and local rendered-page checks for de/en training shelves, legal content, event ordering, links, and images.

- [X] **Group Riding Hand-Signal Illustration Withdrawn** (2026-08-05)
  - [X] Removed the experimental illustration and its article reference after visual review; the published group-riding article remains text-only.

- [X] **North Afterwork Ride Location Display Fix** (2026-06-25)
  - [X] Replaced the raw Google Maps URL in zh/en/de event location metadata with readable meeting-point labels.
  - [X] Converted visible markdown URL text to labeled Google Maps links while preserving the destination.
  - [X] Verified with `npm run build` and local rendered zh event/detail page checks.

- [X] **Starnberg Andechs Raisting Ride Repost** (2026-06-24)
  - [X] Reposted the existing Starnberg / Andechs / Raisting social ride as a new zh/en/de event for 2026-06-27 10:30.
  - [X] Kept the original 2026-05-31 event slug intact so dashboard registrations remain tied to the historical event record.
  - [X] Verified with `npm run build` and local 200 checks for both old and new zh event URLs.

- [X] **Season Planner Fair Random Assignment** (2026-06-04) — branch `issue-149-fair-random-assignment`, Issue [#149](https://github.com/GenLI3202/acc_clubhub/issues/149)
  - [X] Added the 10 active ride leaders dataset for planner ownership assignment
  - [X] Added fair random/load-balanced assignment for unclaimed season slots without overwriting existing owners
  - [X] Added admin preview/confirm auto-assignment and add-week auto-assignment with owner emails
  - [X] Added Chinese-first assignment notification copy with English follow-up text
  - [X] Updated stale e2e selectors to match the current editorial homepage/content UI and language switcher behavior
  - [X] Verified on 2026-06-22 with `PYTHONPYCACHEPREFIX=/tmp/acc-clubhub-pycache python3 -m pytest` (132 passed), `npm run test:all`, and `npm run test:e2e` (84 passed, 2 skipped)

- [X] **Sponsors Bar + Partners Page** (2026-05-27) — branch `phase-sponsors/partners-page-and-strip`
  - [X] Copied 4 sponsor assets to `frontend/public/images/sponsors/`
  - [X] `frontend/src/data/sponsors.ts` — typed `SponsorMain` + `SponsorPartner` records
  - [X] `frontend/src/components/sponsors/PartnerLogo.astro` — typographic logos for 4 "Friends of ACC"
  - [X] Added `partners.*` i18n keys + `nav.partners` across zh/en/de; added `--color-bg-tint` + `--color-border-ink` tokens
  - [X] `frontend/src/components/home/SponsorStrip.astro` — greyscale logo strip for homepage
  - [X] `frontend/src/pages/[lang]/partners.astro` — full Partners page (hero + 2 official cards + 4 friends tiles + CTA)
  - [X] Wired `SponsorStrip` into `[lang]/index.astro` after last PillarSection
  - [X] Partners link in main nav (`getNavLinks`) + footer; `mailto:partners@across-cc.de` CTA; deck button `href="#"` placeholder
  - [X] `npm run build` green; zh/en/de partners pages pre-rendered at build time

- [X] **Season Planner Detail Rewrite Fix** (2026-05-16)
  - [X] Added backend compatibility for detail short paths used by the production frontend rewrite
  - [X] Covered get, save, claim, release, and delete short paths in backend tests
  - [X] Verified with `PYTHONPYCACHEPREFIX=/tmp/acc-clubhub-pycache python3 -m pytest tests/test_season_planner.py` (15 passed)
- [X] **Season Planner Owner Filter** (2026-05-16)
  - [X] Added owner chips based on claimed slots, with `claimed_by` URL filtering
  - [X] Verified with `npm run build` and local authenticated page smoke check
- [X] **Season Planner Production Generate Route Fix** (2026-05-16)
  - [X] Added backend compatibility for `/api/admin/season/generate`, matching the production frontend rewrite path
  - [X] Verified with `PYTHONPYCACHEPREFIX=/tmp/acc-clubhub-pycache python3 -m pytest tests/test_season_planner.py` (14 passed)
- [X] **Season Planner Drag Move Fix** (2026-05-16)
  - [X] Added a backend compatibility route for `/api/admin/season/{id}/move`
  - [X] Kept canonical move behavior at `/api/admin/season/slots/{id}/move`
  - [X] Added transaction-backed Undo for normal moves and overwrite moves
  - [X] Fixed ACC anniversary / holiday empty cells so they open the create-slot dialog
  - [X] Added tests for moving, replacing a target slot, undoing an overwrite, and the dashboard proxy path
  - [X] Verified with `python3 -m pytest tests/test_season_planner.py` (13 passed), `npm run build`, and local Playwright smoke tests
- [X] **Dashboard Single Active Session** (2026-05-16)
  - [X] Added DB-backed active session tracking so a new admin login supersedes the previous login
  - [X] Added migration `009_add_admin_session_state.sql`
  - [X] Verified with `python3 -m pytest tests/test_auth_admin_login.py tests/test_season_planner.py` (19 passed) and `npm run build`
- [X] **Season Planner Convert UI Hidden** (2026-05-16)
  - [X] Previously implemented `convert-to-draft-event`, but the current draft-only flow does not publish Markdown content
  - [X] Hidden the visible convert entry to keep the season planner focused as a simple calendar/planning surface
  - [X] Captured the fuller “planner as event CMS” direction in a GitHub issue for later implementation
- [X] **Season Planner Dashboard — Phase A** (2026-05-15)
  - [X] Drafted implementation plan for issue #143 (活动策划 Dashboard)
  - [X] Saved to `docs/rebuild_plan/future_add_on/season_planner_dashboard_plan.md`
  - [X] Migration 005: `plan_slots` table with indexes and natural unique constraint
  - [X] `PlanSlot` SQLAlchemy model appended to `backend/models.py`
  - [X] `services/season_planner.py` — `generate_slots()` with idempotent regen, special-event overrides
  - [X] `routes/season_planner.py` — POST /generate, GET /slots, GET /slots/grouped (admin-only)
  - [X] 5 pytest tests covering generation, alternation, override, idempotency, claim preservation — all passing (116/116 suite green)
  - [X] `frontend/src/lib/admin/seasonPlanner.ts` — TypeScript types + English label maps (English-only UI, consistent with the rest of the admin dashboard)
  - [X] `frontend/src/pages/dashboard/season-planner/index.astro` — SSR weekly board + Generate Slots modal; server-side Astro proxy at `/api/admin/season/generate` to avoid CORS cookie issues
  - [X] Season Planning tile added to `/dashboard/index.astro`
  - [ ] Phase B (edit/claim/status) — pending fresh session
  - [ ] Phase C (planner-to-published-event CMS workflow) — future issue; draft-only convert UI hidden for now
- [X] **GitHub CI Noise Reduction** (2026-05-14)
  - [X] Replaced the always-red default Astro check gate with frontend unit tests plus build
  - [X] Added backend pytest coverage to the default GitHub Actions CI
  - [X] Limited automatic CI triggers to `master`/PR changes that touch app or workflow files
  - [X] Added concurrency cancellation so superseded CI runs stop burning minutes
  - [X] Removed the obsolete event-sync workflow that called the deleted populate script
- [X] **Ride Leader Dashboard Chart.js Refresh** (2026-05-02)
  - [X] Added Chart.js dependency for the admin ride leader trend chart
  - [X] Replaced the raw single-leader SVG with a multi-leader cumulative trend canvas
  - [X] Kept selected leader summary, annual board, and event history on the same page
- [X] **Dashboard Shared Admin Login Proxy** (2026-05-02)
  - [X] Added same-origin Astro proxies for `/auth/email-login` and `/auth/logout`
  - [X] Documented the shared ride leader admin account setup without committing secrets
  - [X] Kept the shared password out of committed env examples and docs
- [X] **Ride Leader Historical Name Merge** (2026-05-02)
  - [X] Added canonical reporting names for historical ride leader aliases
  - [X] Merged `Gen` / `GenL` into `Gen Li` in annual reports
  - [X] Mapped `Konfuzius` to `Sheng Yuan` and `Shane Shen` to `Zhikuan Shen`
  - [X] Preserved raw RSVP and credit records while merging dashboard statistics

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
  - [X] Simplified route filters by removing surface/sort controls and replacing range controls with ClubHub-styled numeric range sliders.
  - [X] Created follow-up Issue [#113](https://github.com/GenLI3202/acc_clubhub/issues/113) for future map data and Komoot-style split view.
  - [X] Verified `bun run build` succeeds; `astro check` remains blocked by pre-existing project-wide type errors outside this task.
- [X] **Knowledge Subtitle Improvements** (2026-04-21)
  - [X] Replaced generic "ACROSS · KNOWLEDGE" eyebrow with specific "ACROSS · GEAR", "ACROSS · TRAINING", and "ACROSS · ROUTES" tags on their respective index pages.
  - [X] Added new i18n translation keys for all three locales (zh/en/de).
- [X] **Multi-Section Event Display** (Issue [#122](https://github.com/GenLI3202/acc_clubhub/issues/122)) (2026-04-23)
  - [X] Added validated `displaySections` frontmatter support while preserving legacy `displaySection`.
  - [X] Updated events page section filters and regular-event helper to support multi-section membership.
  - [X] Added Vitest coverage for multi-section priority and legacy fallback behavior.
- [X] **Frontend Build Recovery** (2026-04-24)
  - [X] Reproduced the failing remote `master` build in a clean clone and isolated invalid event frontmatter.
  - [X] Removed empty-string `registrationDeadline` values from the `acc-after-work-ride-munchen-sud-2026-04-28` event entries in zh/en/de so Astro content validation passes again.
- [X] **Weekly Regular Event Auto-Rollover** (Issue [#121](https://github.com/GenLI3202/acc_clubhub/issues/121)) (2026-04-23)
  - [X] Added recurring metadata for weekly regular events with Berlin-time rollover support.
  - [X] Events list and detail pages resolve generated occurrence slugs, dates, and registration deadlines.
  - [X] Markdown-to-database sync upserts the current occurrence for RSVP management.
- [X] **Admin Occurrence Sync** (Issue [#128](https://github.com/GenLI3202/acc_clubhub/issues/128)) (2026-04-25)
  - [X] Added authenticated `POST /api/admin/sync-occurrences` upsert endpoint for resolved event occurrences.
  - [X] Dashboard syncs resolved recurring occurrences before fetching RSVP stats.
  - [X] Added backend coverage for auth, insert, update, idempotency, null fields, and participant preservation.
- [X] **Admin Dashboard Cleanup** (2026-04-25)
  - [X] Removed the `/dashboard/tools/heic-convert` HEIC converter tool page from the admin dashboard codebase.
- [X] **Admin Event Check-in** (Issue [#105](https://github.com/GenLI3202/acc_clubhub/issues/105)) (2026-04-25)
  - [X] Added RSVP `checked_in_at` storage and migration for attendance confirmation.
  - [X] Added authenticated Dashboard check-in endpoint for confirmed RSVPs.
  - [X] Dashboard event detail now shows registered vs checked-in attendance separately from RSVP status.
  - [X] Added backend coverage for check-in, idempotency, invalid statuses, and RSVP list summary output.
- [X] **Admin Schema Health Check** (2026-04-25)
  - [X] Added authenticated schema health endpoint for required RSVP columns.
  - [X] Dashboard events page now warns explicitly when required DB columns are missing.
- [X] **Events Admin Dashboard Redesign** (2026-04-25)
  - [X] Replaced category-first event management with workflow views: Upcoming, Needs Attention, Past, and All.
  - [X] Added tested admin event helpers for classification, status derivation, filtering, and sorting.
  - [X] Corrected After Work ride content to use the dedicated `after-work` event type across zh/en/de.
  - [X] Added status badges and compact registration summaries for faster admin scanning.
- [X] **Dashboard Confirmation Modal Fix** (2026-04-25)
  - [X] Replaced native `confirm()` prompts on event detail actions with a stable in-page confirmation dialog.
  - [X] Added local preview fixture for event detail pages to verify Check in, Cancel, Restore, and Notify interactions without auth.
- [X] **Participant Count Reconciliation Fix** (2026-04-25)
  - [X] Reconciled `current_participants` from confirmed RSVP rows after admin cancel/restore and public registration changes.
  - [X] Cleared `checked_in_at` when an RSVP is cancelled so cancelled participants no longer count as checked in.
  - [X] Public event responses now calculate available spots from confirmed RSVPs to avoid stale or negative counters.
- [X] **Membership Insurance Page Update** (2026-04-30)
  - [X] Added a concise Chinese BLSV/ARAG member insurance summary as the first chapter of `/zh/insurance`.
  - [X] Linked relevant BLSV and ARAG source pages and added a legal-reference disclaimer.
- [X] **Membership Charter Page** (2026-04-30)
  - [X] Added the public member charter and liability disclaimer page at `/zh/membership-charter`.
  - [X] Updated membership page charter links to open the full charter page.
- [X] **Membership Hero Photo Refresh** (2026-05-01)
  - [X] Replaced the membership page hero asset with the ACC group ride photo.
- [X] **Membership i18n Completion** (2026-05-01)
  - [X] Added English and German content for the membership page.
  - [X] Localized the member charter, conduct rules, liability disclaimer, and join notes.
  - [X] Added English and German member insurance summaries to match the Chinese insurance page.
- [X] **Dashboard Email Password Admin Auth** (2026-04-29)
  - [X] Added email allowlist login for ride leader dashboard access.
  - [X] Required a shared dashboard password before creating a 24-hour session.
  - [X] Kept GitHub OAuth allowlist login as a fallback during migration.
  - [X] Reused the existing admin session cookie for both login methods.
- [X] **Dashboard ACC Red Theme Refresh** (2026-04-29)
  - [X] Replaced dashboard blue accent states with ACC red across admin pages.
- [X] **Ride Leader Distance Metadata Fix** (2026-04-30)
  - [X] Added explicit `distanceKm` frontmatter to current single-distance event content so dashboard occurrence sync has a reliable metadata source.
  - [X] Preserved existing backend `distance_km` values when sync payloads omit distance, avoiding accidental null overwrites.
- [X] **Recurring After Work History Preservation** (2026-05-01)
  - [X] Dashboard past/all views now include DB-only historical recurring occurrences with RSVP stats.
  - [X] Sync keeps generated after-work history as admin-only records instead of treating it as current Markdown content.
  - [X] Added a dry-run recovery report for the 2026-04-28 Süd and 2026-04-30 Nord RSVP history.
- [X] **Security Sweep — Footer, Admin Event Creation, Secret Hygiene** (2026-06-27)
  - [X] Removed the public GitHub footer link from the website footer.
  - [X] Protected `POST /api/events` with the existing admin session dependency and added regression coverage.
  - [X] Replaced a committed Neon connection string example in Waline deployment notes with placeholders.
  - [X] Verified backend tests, frontend type check, frontend build, npm audit, and pip-audit results.


## In Progress

- [ ] **Season Planner Dashboard** (Issue [#143](https://github.com/GenLI3202/acc_clubhub/issues/143))
  - [X] Board cells now show the owner name when claimed, otherwise `Unclaimed`, instead of showing the internal `claimed` status.
  - [X] Claim API accepts ready/in-planning slots without downgrading their planning status.
  - [X] Slot detail page now centers planning details, route links, ownership, backup notes, and readiness instead of manual status management.
  - [ ] Fair random auto-assignment is tracked separately in Issue [#149](https://github.com/GenLI3202/acc_clubhub/issues/149).
- [ ] **Admin Dashboard — Outstanding Issues**
  - [ ] **BLOCKED** — `/dashboard/login` returns 404 (Issue [#67](https://github.com/GenLI3202/acc_clubhub/issues/67))
  - [ ] Registration spot count mismatch in dashboard (Issue [#66](https://github.com/GenLI3202/acc_clubhub/issues/66))
  - [ ] Participant portal not tested end-to-end
- [ ] **Post-Event Survey** (Issue [#105](https://github.com/GenLI3202/acc_clubhub/issues/105))
  - [ ] Survey delivery mechanism and trigger timing still pending.
  - [ ] Survey recipient list should use RSVPs with `checked_in_at IS NOT NULL`.
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
- [ ] Frontend npm audit reports production advisories in Astro / @astrojs/vercel and transitive dependencies — high; likely needs a planned Astro major-version upgrade
- [ ] Public RSVP/subscription/login endpoints lack rate limiting or CAPTCHA — high
- [ ] `POST /api/rsvp` accepts event metadata from public clients and can create/update event rows — high; preserve workflow only with server-side event allowlisting or admin sync

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
