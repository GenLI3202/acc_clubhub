# ACC ClubHub — Progress Log

> Tracks completed work by session. Each entry links to the relevant issue and commit.

---

## 2026-04-08 — Phase 4: Bug sweep + feature backlog (Sessions 1–2)

Branch: `phase-4/tier2-tier3-fixes`

### Issues resolved

#### Infrastructure / P1

| # | Title | Commit | Notes |
|---|-------|--------|-------|
| [#67](https://github.com/GenLI3202/acc_clubhub/issues/67) | Dashboard 404 — i18n middleware status override | `3fed7d6` | Consume `response.text()` before re-wrapping; fixes ReadableStream reuse on Vercel edge |

#### Bug fixes

| # | Title | Commit | Notes |
|---|-------|--------|-------|
| [#19](https://github.com/GenLI3202/acc_clubhub/issues/19) | Android frame drops on Masonry section | `7a70e87` | `will-change:transform` on cards, `decoding="async"` on images, `loading="lazy"` on markdown images |
| [#30](https://github.com/GenLI3202/acc_clubhub/issues/30) | Comment silent fail + wrong OAuth options | `7771056` | `login:'disable'` disables social login; capture-phase click validates nick/mail/comment and shows toast |
| [#55](https://github.com/GenLI3202/acc_clubhub/issues/55) | Dark mode (`prefers-color-scheme: dark`) | `5e43689` | All color tokens overridden in `variables.css`; Header uses `color-mix()` instead of hardcoded white |
| [#65](https://github.com/GenLI3202/acc_clubhub/issues/65) | Remaining spots not updated after registration | `3fed7d6` | `EventRegistrationForm` fetches live `available_spots` on mount; decrements after confirmed submit |
| [#66](https://github.com/GenLI3202/acc_clubhub/issues/66) | Spot count mismatch dashboard list vs detail | see admin.py | `cancel_rsvp` explicitly decrements `current_participants`; promotes first waitlisted RSVP; dashboard reloads after cancel |

#### Features

| # | Title | Commit | Notes |
|---|-------|--------|-------|
| [#13](https://github.com/GenLI3202/acc_clubhub/issues/13) | HEIC image support | `49158f9` | Auth-protected `/dashboard/tools/heic-convert`; client-side via `heic2any` CDN; drag-and-drop + multi-file |
| [#51](https://github.com/GenLI3202/acc_clubhub/issues/51) | Broadcast event announcement emails | `5790a13` | `POST /api/admin/broadcast/{event_slug}`; zh/en/de templates; unsubscribe link; 7 tests green |
| [#53](https://github.com/GenLI3202/acc_clubhub/issues/53) | Admin Dashboard subscriber management | `fdb4ce2` | `/dashboard/subscribers` with summary cards, toggle, broadcast form; `GET/POST` endpoints; 8 tests green |
| [#69](https://github.com/GenLI3202/acc_clubhub/issues/69) | Cancel RSVP sends notification email | see admin.py | `send_cancellation_email()` in zh/en/de; non-fatal (RSVP cancel succeeds even if email fails); 9 tests green |

### Test coverage added

| File | Tests | Covers |
|------|-------|--------|
| `backend/tests/test_admin_cancel.py` | 9 | #66, #69 — cancel decrement, waitlist promotion, email notification |
| `backend/tests/test_broadcast.py` | 7 | #51 — broadcast to active subscribers only, per-language, failure resilience |
| `backend/tests/test_subscribers_admin.py` | 8 | #53 — list endpoint, toggle active/inactive, no token exposure |

### Verification checklist

| # | How to verify |
|---|--------------|
| #67 | Visit `/dashboard` and `/dashboard/login` — both load without 404 |
| #19 | On Android, open the Knowledge section — scroll and card hover animations are smooth |
| #30 | On any event page, submit comment without filling nick or email — red toast appears at bottom of screen; no social login buttons visible |
| #55 | Set system to dark mode — site background/text/header follows; no white flash |
| #65 | Open an event with available spots — spots count loads from API (`…` briefly); after registering, count decrements |
| #66 | Admin cancels an RSVP in dashboard — page reloads with updated counts; if waitlisted RSVPs exist, first one is promoted |
| #13 | `/dashboard/tools/heic-convert` — drag a `.heic` file, convert, thumbnail appears with Download link |
| #51 | `/dashboard/subscribers` — enter an event slug, click Broadcast — sees `sent/skipped/failed` summary; subscriber receives email |
| #53 | `/dashboard/subscribers` — subscriber list loads; clicking toggle changes status badge without page reload |
| #69 | Admin cancels a participant's RSVP — participant receives cancellation email in their registered language |

---

## Remaining open issues (as of 2026-04-08)

| Priority | # | Title |
|----------|---|-------|
| Medium | [#55](https://github.com/GenLI3202/acc_clubhub/issues/55) | ✅ Done (dark mode) |
| Medium | [#27](https://github.com/GenLI3202/acc_clubhub/issues/27) | Authorization expansion (non-GitHub admin users) — needs discussion |
| Design | [#43](https://github.com/GenLI3202/acc_clubhub/issues/43) | Growth timeline graph — needs milestone data |
| Design | [#44](https://github.com/GenLI3202/acc_clubhub/issues/44) | Progressive disclosure in Knowledge section — needs interaction spec |
| Research | [#50](https://github.com/GenLI3202/acc_clubhub/issues/50) | Google Calendar integration — needs API credentials |
| Roadmap | [#48](https://github.com/GenLI3202/acc_clubhub/issues/48) | Community event creation — multi-phase |
| Roadmap | [#20](https://github.com/GenLI3202/acc_clubhub/issues/20) | Elevation profile + map sync — multi-phase |
| Roadmap | [#61](https://github.com/GenLI3202/acc_clubhub/issues/61) | Merge FastAPI into Astro API routes — multi-phase |

---

## 2026-09-08 — Historical route archive and map decision

Branch: `phase-12/historical-route-archive-map`

Issue: [#175](https://github.com/GenLI3202/acc_clubhub/issues/175)

### Completed

- Removed all 117 files marked `aiTemplate: true`, representing 39 logical
  placeholders across events, media, gear, training, and routes. Removed the
  generic non-ACC Munich guide entry and its dedicated images.
- Audited every repository event with a route source, deduplicated the repeated
  Starnberg route, and retained the two distinct Hahntennjoch variants.
- Published 18 logical historical routes as 54 aligned Chinese, English, and
  German entries with ride records, provider sources, available measurements,
  regions, difficulty, and source-confirmed surface.
- Added distance-range and optional-elevation support so incomplete source data
  is displayed honestly instead of being estimated.
- Localized route filter sections, actions, option values, and range-input
  accessibility labels in Chinese, English, and German.
- Recorded the archive inventory, Komoot Collection evaluation, custom-map
  trade-offs, and defer decision in
  `docs/decisions/historical_route_archive_and_map.md`.

### Commits

- `af9813c` — remove AI placeholder content.
- `64ea9d7` — publish the verified multilingual route archive.
- `66b8ab1` — cover archived routes in global search.
- `8a6835d` — record the route inventory and map decision.
- `817149a` — localize shared route filter controls.

### Verification

- `npm run check`: 0 errors and 0 warnings; 33 existing hints.
- `npm run test`: 75 tests passed.
- `npm run build`: passed; all 54 localized route detail paths generated.
- `npx playwright test e2e/content.spec.ts`: 34 tests passed on desktop and
  mobile, with two pre-existing skipped tests.
- Route slugs match across all three locales, no duplicate route slugs remain,
  all route-to-event links resolve, and no `aiTemplate: true` marker remains.

### External inputs and follow-up

- The selected production approach is the native archive with direct Komoot or
  Strava links. No Collection embed or custom overview map ships in this change.
- ACC still needs to provide its complete off-repository ride inventory and the
  missing source measurements for seven routes.
- A future Collection embed requires an ACC-owned public Collection with all 18
  routes, plus confirmed account ownership and Premium renewal responsibility.
  Its interactive desktop/mobile checks remain a release gate.
- A custom Leaflet/OpenStreetMap overview remains coordinated through
  [#113](https://github.com/GenLI3202/acc_clubhub/issues/113) and requires
  approved geometry beyond the repository's single GeoJSON track.
