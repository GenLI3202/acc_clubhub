# Issues Sorted for Agents

> Last updated: 2026-04-08 (session 2)
> Source: [GitHub Issues](https://github.com/GenLI3202/acc_clubhub/issues)
>
> This document organises all open issues by implementation difficulty and who/what is needed to proceed.
> Agents should pick up tasks from the top tiers first.
>
> ✅ = closed/resolved

---

## Tier 1 — P1 Bug: Fix Immediately (blocks real users)

| # | Title | Root Cause | Action |
|---|-------|-----------|--------|
| ✅ [#19](https://github.com/GenLI3202/acc_clubhub/issues/19) | Android severe frame drops on Mechanical Knowledge section | ~~Too many unoptimised images loaded at once on mobile~~ | `will-change:transform` on masonry cards, `decoding="async"` on cover images, `loading="lazy"` on markdown inline images. `commit 7a70e87` |

---

## Tier 2 — Quick Bug Fixes (code-only, no design needed)

All of these have a clear root cause and a contained fix. An agent can open a PR without further discussion.

| # | Title | Fix Scope | Notes |
|---|-------|-----------|-------|
| ✅ [#39](https://github.com/GenLI3202/acc_cubhub/issues/39) | ACC contact email missing | ~~Content only~~ | Set to `letusride@accross-cc.de` in `privacy.astro` (3×) and `about.astro`. `commit e419cc0` |
| ✅ [#8](https://github.com/GenLI3202/acc_clubhub/issues/8) | Author field missing in content creation | ~~CMS schema + DB~~ | Added `author: z.string().default('ACC Club')` to events schema; backfilled 9 event md files. All collections now track author. `commit 9d27462` |
| ✅ [#22](https://github.com/GenLI3202/acc_clubhub/issues/22) | Filter cannot extract Author info | ~~Frontend filter logic~~ | Added `author` dynamic filter to `mediaFilters` in `filterConfig.ts`. `commit 75a90a6` |
| ✅ [#13](https://github.com/GenLI3202/acc_clubhub/issues/13) | HEIC image format not supported on upload | ~~Upload component~~ | Auth-protected `/dashboard/tools/heic-convert` page using `heic2any` CDN — client-side only, files never leave browser. `commit 49158f9` |
| ✅ [#25](https://github.com/GenLI3202/acc_clubhub/issues/25) | No image size limit on Admin upload | ~~Upload component validation~~ | Already implemented: `media_library.max_file_size: 5242880` in `config.yml`. Closed. |
| ✅ [#30](https://github.com/GenLI3202/acc_clubhub/issues/30) | Comment feature bugs (silent fail + wrong OAuth options) | ~~Two sub-bugs~~ | `login:'disable'` disables social login at framework level; capture-phase click listener validates nick/mail/comment and shows styled error toast. `commit 7771056` |
| [#65](https://github.com/GenLI3202/acc_clubhub/issues/65) | Remaining spots not updated after registration | Frontend display | `EventRegistrationForm.tsx` shows static `maxParticipants` instead of live count; fetch `/api/events/{slug}` on mount + update after submit |
| [#66](https://github.com/GenLI3202/acc_clubhub/issues/66) | Spot count mismatch in dashboard events list vs detail | Backend consistency | Dashboard list uses `event.available_spots` (DB trigger); detail page counts live from RSVPs. Fix: promote waitlisted RSVP to confirmed on cancel + refresh counts in page JS |
| [#67](https://github.com/GenLI3202/acc_clubhub/issues/67) | `/dashboard/login` returns 404 — i18n middleware status override | Middleware + Vercel SSR | Consume body via `response.text()` before re-wrapping with status 200 to avoid ReadableStream reuse on Vercel edge |

---

## Tier 3 — Small Feature Enhancements (clear direction, ready to build)

Direction is agreed; no design review needed before starting.

| # | Title | Complexity | Notes |
|---|-------|-----------|-------|
| ✅ [#47](https://github.com/GenLI3202/acc_clubhub/issues/47) | Add ACC Strava group link to webpage | ~~Very low~~ | Added to `Footer.astro` → `strava.com/clubs/accmunich`. `commit 195ae1a` |
| ✅ [#51](https://github.com/GenLI3202/acc_clubhub/issues/51) | Auto-broadcast email to subscribers on event publish | ~~Medium~~ | `POST /api/admin/broadcast/{event_slug}` with zh/en/de templates, unsubscribe link, CTA button; continues on per-subscriber failure; 7 tests green. `commit 5790a13` |
| [#55](https://github.com/GenLI3202/acc_clubhub/issues/55) | Dark mode (`prefers-color-scheme: dark`) | Low | Add dark-mode overrides to `variables.css`; update hardcoded `rgba(255,255,255,...)` in Header + EventHero; system-preference only (no manual toggle) |
| ✅ [#60](https://github.com/GenLI3202/acc_clubhub/issues/60) | Content authoring standards: `displaySection`, templates, past-event gate | ~~Medium~~ | Closed. `displaySection` field, past-event registration gate, and `_template.md` files implemented. |
| [#27](https://github.com/GenLI3202/acc_clubhub/issues/27) | Authorization expansion (non-GitHub users as Admin) | Medium | Add role-based manual grant in backend; decouple Admin rights from GitHub collaborator status |
| ✅ [#14](https://github.com/GenLI3202/acc_clubhub/issues/14) | Draft mode in CMS editor | ~~Medium~~ | `status: draft\|published` added to all 5 Zod schemas + 4 CMS collections; all 5 index pages filter drafts at build time. `commit 39164eb` |
| ✅ [#53](https://github.com/GenLI3202/acc_clubhub/issues/53) | Admin Dashboard — manage registrations & subscriber list | ~~Medium~~ | `/dashboard/subscribers` with summary cards, toggle active/inactive, and broadcast form; `GET /api/admin/subscribers` + `POST /api/admin/subscribers/{id}/toggle`; 8 tests green. `commit fdb4ce2` |
| [#69](https://github.com/GenLI3202/acc_clubhub/issues/69) | Cancel participation sends notification email | Low | When admin cancels an RSVP via dashboard, send a cancellation notification email to the participant; reuse existing Resend email service |

---

## Tier 4 — Needs Design / Visual Assets First

These are valid features but cannot be implemented until a designer or the product owner provides mockups, copy, or visual assets.

| # | Title | What's Missing |
|---|-------|---------------|
| [#43](https://github.com/GenLI3202/acc_clubhub/issues/43) | ACC growth timeline graph | Data structure (milestones list) + chart style confirmation |
| ✅ [#9](https://github.com/GenLI3202/acc_clubhub/issues/9) | Content card redesign (waterfall / Xiaohongshu style) | Implemented: MasonryGrid waterfall layout + Fuse.js search + filter panels (Phase 4.1). Closed. |
| [#44](https://github.com/GenLI3202/acc_clubhub/issues/44) | Progressive disclosure in Knowledge section | Define which content levels collapse; interaction spec |
| [#7](https://github.com/GenLI3202/acc_clubhub/issues/7) | About Us hero card / 3D character style | Member photos or 3D character assets required |
| [#15](https://github.com/GenLI3202/acc_clubhub/issues/15) | Homepage background redesign (team photo + overlay) | Real group photo in team kit required |
| [#5](https://github.com/GenLI3202/acc_clubhub/issues/5) | Scroll parallax cyclist animation | Animation spec / style confirmation (speed, loop behaviour) |

---

## Tier 5 — Blocked on External Information or Research

Cannot proceed without external input, API access, or feasibility investigation.

| # | Title | Blocker |
|---|-------|---------|
| [#41](https://github.com/GenLI3202/acc_clubhub/issues/41) | Event registration + WeChat group QR code | Need WeChat group QR image(s) + registration flow design |
| [#17](https://github.com/GenLI3202/acc_clubhub/issues/17) | Auto-pull Xiaohongshu content via email agent | Xiaohongshu has no public API; feasibility of email-triggered pipeline needs investigation |
| [#50](https://github.com/GenLI3202/acc_clubhub/issues/50) | Integrate Google shared activity calendar | Need Google Calendar API credentials, shared calendar ID, and sync scope decision |
| [#6](https://github.com/GenLI3202/acc_clubhub/issues/6) | AI-driven Admin page functional testing | Need to decide on test framework (e.g. Playwright + AI agent) and define coverage scope |

---

## Tier 6 — Large Projects (must be broken into Phases)

These span multiple layers of the stack or introduce new subsystems.

| # | Title | Why It's Large | Suggested Breakdown |
|---|-------|---------------|---------------------|
| [#48](https://github.com/GenLI3202/acc_clubhub/issues/48) | Community-driven event creation (anyone can post a ride) | New user role model, event submission form, moderation/approval flow, email broadcast integration, frontend list redesign | Phase A: submission form + DB schema; Phase B: moderation UI; Phase C: broadcast integration |
| [#20](https://github.com/GenLI3202/acc_clubhub/issues/20) | Interactive elevation profile + map sync on Route Database | GPX parsing, Mapbox/Leaflet + ECharts/D3 real-time cursor sync, elevation data pipeline | Phase A: GPX upload + parse; Phase B: elevation chart; Phase C: map marker sync |
| [#61](https://github.com/GenLI3202/acc_clubhub/issues/61) | Merge FastAPI backend into Astro SSR API routes | Two separate deployments (FastAPI on Vercel + Astro frontend); consolidation would eliminate CORS, reduce cold starts, simplify CI | Phase A: migrate auth routes; Phase B: migrate RSVP routes; Phase C: migrate admin routes; decommission FastAPI app |

---

## Quick Reference: Recommended Work Order

```
Immediate  ── (✅ #19 done)
Bug sweep  ── (✅ #67 #65 #66 #13 #30 #8 #22 #25 #39 done)
Features   ── #55 → #27    (✅ #69 #51 #53 #47 #14 #60 done)
Design req ── #43, #44, #7, #15, #5             (✅ #9 done)
Research   ── #50, #17, #41, #6
Roadmap    ── #48, #20, #61  (define phases before starting)
```
