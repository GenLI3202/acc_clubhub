# Issues Sorted for Agents

> Last updated: 2026-03-29
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
| [#19](https://github.com/GenLI3202/acc_clubhub/issues/19) | Android severe frame drops on Mechanical Knowledge section | Too many unoptimised images loaded at once on mobile | Add lazy loading + image size cap; consider `loading="lazy"` + responsive `srcset` |

---

## Tier 2 — Quick Bug Fixes (code-only, no design needed)

All of these have a clear root cause and a contained fix. An agent can open a PR without further discussion.

| # | Title | Fix Scope | Notes |
|---|-------|-----------|-------|
| ✅ [#39](https://github.com/GenLI3202/acc_cubhub/issues/39) | ACC contact email missing | ~~Content only~~ | Set to `letusride@accross-cc.de` in `privacy.astro` (3×) and `about.astro`. `commit e419cc0` |
| ✅ [#8](https://github.com/GenLI3202/acc_clubhub/issues/8) | Author field missing in content creation | ~~CMS schema + DB~~ | Added `author: z.string().default('ACC Club')` to events schema; backfilled 9 event md files. All collections now track author. `commit 9d27462` |
| ✅ [#22](https://github.com/GenLI3202/acc_clubhub/issues/22) | Filter cannot extract Author info | ~~Frontend filter logic~~ | Added `author` dynamic filter to `mediaFilters` in `filterConfig.ts`. `commit 75a90a6` |
| [#13](https://github.com/GenLI3202/acc_clubhub/issues/13) | HEIC image format not supported on upload | Upload component | Convert HEIC→JPEG client-side (`heic2any`) or server-side (Pillow) before storing |
| ✅ [#25](https://github.com/GenLI3202/acc_clubhub/issues/25) | No image size limit on Admin upload | ~~Upload component validation~~ | Already implemented: `media_library.max_file_size: 5242880` in `config.yml`. Closed. |
| [#30](https://github.com/GenLI3202/acc_clubhub/issues/30) | Comment feature bugs (silent fail + wrong OAuth options) | Two sub-bugs | ① Show error/toast on unauthenticated submit; ② restrict OAuth provider list to Google + GitHub only |

---

## Tier 3 — Small Feature Enhancements (clear direction, ready to build)

Direction is agreed; no design review needed before starting.

| # | Title | Complexity | Notes |
|---|-------|-----------|-------|
| ✅ [#47](https://github.com/GenLI3202/acc_clubhub/issues/47) | Add ACC Strava group link to webpage | ~~Very low~~ | Added to `Footer.astro` → `strava.com/clubs/accmunich`. `commit 195ae1a` |
| [#51](https://github.com/GenLI3202/acc_clubhub/issues/51) | Auto-broadcast email to subscribers on event publish | Medium | New `POST /api/admin/broadcast/{event_slug}`; reuses existing Resend email service; spec fully written in issue; already tracked as **Phase 4.3.4** in `progress.md` |
| [#55](https://github.com/GenLI3202/acc_clubhub/issues/55) | Dark mode (`prefers-color-scheme: dark`) | Low | Add dark-mode overrides to `variables.css`; update hardcoded `rgba(255,255,255,...)` in Header + EventHero; system-preference only (no manual toggle) |
| [#27](https://github.com/GenLI3202/acc_clubhub/issues/27) | Authorization expansion (non-GitHub users as Admin) | Medium | Add role-based manual grant in backend; decouple Admin rights from GitHub collaborator status |
| ✅ [#14](https://github.com/GenLI3202/acc_clubhub/issues/14) | Draft mode in CMS editor | ~~Medium~~ | `status: draft\|published` added to all 5 Zod schemas + 4 CMS collections; all 5 index pages filter drafts at build time. `commit 39164eb` |

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

---

## Quick Reference: Recommended Work Order

```
Immediate  ── #19 (P1 mobile performance)
Bug sweep  ── #13 → #30                         (✅ #8 #22 #25 #39 done)
Features   ── #51 (Phase 4.3.4) → #55 → #27    (✅ #47 #14 done)
Design req ── #43, #44, #7, #15, #5             (✅ #9 done)
Research   ── #50, #17, #41, #6
Roadmap    ── #48, #20  (define phases before starting)
```
