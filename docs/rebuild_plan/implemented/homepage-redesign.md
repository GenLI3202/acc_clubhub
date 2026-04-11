Here is a draft plan to refine:

# Homepage Redesign Plan: ACC ClubHub (11.Apr.2026)

## Context

### Why this change

ACC ClubHub's current homepage treats all 5 content pillars (Events, Media, Gear, Training, Routes) as equal-weight cards in a grid. This creates two problems:

1. **Identity crisis** — a new visitor can't answer "what is this site?" in 3 seconds
2. **No clear call-to-action** — the grid is a directory, not a story

### Positioning Clarity

From the 2026 planning doc, ACC's identity actually IS clear — the homepage just doesn't reflect it:

```
ACC = 骑行社区(核心) + 专业内容(差异化) + 工具服务(留存)
```

* **Core product** : Organized rides & events (what members DO together)
* **Growth engine** : Professional content (why people DISCOVER ACC)
* **Differentiation** : European perspective on cycling knowledge (why ACC, not others)
* **Retention tools** : Route database, Strava/Komoot integration

The homepage should tell this story in order: **感受氛围 → 参与骑行 → 探索内容 → 深入了解**

### Design Direction (User-approved)

Hybrid of Plan B (event-first banner) + Plan A (editorial alternating sections):

* Hero: Keep existing (cycling photo + tagline + CTA)
* Next Ride Banner: Prominent upcoming event strip (Plan B)
* Content Pillars: Full-width alternating editorial sections (Plan A)
* Remove: Card grid + watermark background

### Current State Constraint

Content is sparse (AI templates). Design must look complete NOW and scale when real content arrives in 2 months.

---

## Implementation Plan

### Commit 1: Add i18n keys for homepage sections

 **File** : `frontend/src/lib/i18n.ts`

Add homepage-specific translation keys to all 3 locale objects (zh/en/de):

* `home.nextRide` — "下一次骑行" / "Next Ride" / "Nächste Ausfahrt"
* `home.noUpcoming` — "更多活动即将公布" / "More rides coming soon" / "Weitere Ausfahrten folgen"
* `home.events.title/subtitle/cta` — Events section text
* `home.media.title/subtitle/cta` — Media section text
* `home.gear.title/subtitle/cta` — Gear section text
* `home.training.title/subtitle/cta` — Training section text
* `home.routes.title/subtitle/cta` — Routes section text
* `home.comingSoon` — "内容筹备中" / "Coming Soon" / "Demnächst"
* `home.viewAll` — "查看全部 →" / "View All →" / "Alle ansehen →"

This also removes the inline ternary chains currently in `index.astro`.

---

### Commit 2: Create NextRideBanner component

 **New file** : `frontend/src/components/home/NextRideBanner.astro`

 **Props** : `event: CollectionEntry<'events'> | null`, `lang: Locale`

 **Behavior** :

* If `event` exists: show date (locale-formatted), title, location, event type badge, CTA link to event detail page
* If `event` is null: show "more rides coming soon" fallback
* No API call for registration count in v1 (keep it pure static)

 **Layout** :

* Full-width strip using CSS breakout: `width: 100vw; margin-left: calc(50% - 50vw)`
* Inner container: `max-width: var(--max-width); margin: 0 auto`
* Background: `var(--color-bg-secondary)` with subtle top border accent
* Horizontal layout at desktop (info left, CTA right), stacks on mobile
* Scoped `<style>` block (matches existing component pattern)

 **Data source** : Content collection `events`, filtered by `splitEvents()` from `frontend/src/lib/events/eventHelpers.ts`

---

### Commit 3: Create PillarSection component

 **New file** : `frontend/src/components/home/PillarSection.astro`

 **Props** :

```ts
interface Props {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';  // alternates per section
  alternate: boolean;                // alternating bg color
  items?: Array<{ title: string; href: string; meta?: string }>;
  comingSoon?: string;               // fallback when items is empty
}
```

 **Layout** :

* Full-width breakout (same CSS pattern as NextRideBanner)
* 2-column grid at desktop (`1fr 1fr`), stacks on mobile (image on top)
* `imagePosition` controls CSS `order` to alternate image/text sides
* `alternate` toggles between `var(--color-bg-canvas)` and `var(--color-bg-secondary)`
* Image: `loading="lazy"`, `border-radius: var(--radius-aero)`, `object-fit: cover`
* Text side: h2 title, subtitle paragraph, optional featured item links (max 2-3), CTA link
* If no `items` AND `comingSoon` is set: show styled "coming soon" message instead of empty space
* Scoped `<style>` block
* Responsive breakpoint at 768px

---

### Commit 4: Rewrite homepage

 **File** : `frontend/src/pages/[lang]/index.astro`

 **Frontmatter data fetching** :

```
getCollection('events') → filter by lang, exclude drafts → splitEvents() → heroEvent (nearest future)
getCollection('media')  → filter by lang → sort by date desc → slice(0, 2) → featured media items
getCollection('routes') → filter by lang → slice(0, 2) → featured route items
gear/training: empty arrays (content sparse, will show "coming soon")
```

 **Template structure** :

```
<BaseLayout>
  <section slot="hero"> ... (keep existing hero, use i18n keys) </section>

  <NextRideBanner event={heroEvent} lang={lang} />

  <PillarSection title="慕城日常" imagePosition="left"  alternate={false} items={upcoming[0:2]} />
  <PillarSection title="车影骑踪" imagePosition="right" alternate={true}  items={media[0:2]} />
  <PillarSection title="器械知识" imagePosition="left"  alternate={false} comingSoon="..." />
  <PillarSection title="科学训练" imagePosition="right" alternate={true}  comingSoon="..." />
  <PillarSection title="骑行路线库" imagePosition="left" alternate={false} items={routes[0:2]} />
</BaseLayout>
```

 **What gets removed** :

* The `sections` array with inline ternary i18n chains
* The `.hub-grid` div and all `.hub-card` elements
* The watermark `::before` pseudo-element styles
* All `.hub-grid` and `.hub-card` CSS rules (scoped in current `<style>`)

**Image assignments** (from existing `/images/uploads/`):

* Events: `rr120_2026_group_turn.jpg`
* Media: `DSC04622.jpg`
* Gear: `buy_canyon.webp`
* Training: `RR120-SONNTAG-cPIARAZZI-20.jpg`
* Routes: `ivan-bandura-Vdv_3HmV-tk-unsplash.jpg`

---

### Commit 5: Clean up orphaned global CSS (if any)

Check `frontend/src/styles/global.css` for any `.hub-grid` / `.hub-card` rules that live outside the scoped `<style>` block. Remove if found. (From my read, all hub-grid styles are scoped inside `index.astro`, so this commit may be a no-op.)

---

## Files Modified

| File                                                  | Action                                      |
| ----------------------------------------------------- | ------------------------------------------- |
| `frontend/src/lib/i18n.ts`                          | Add ~30 homepage translation keys           |
| `frontend/src/components/home/NextRideBanner.astro` | **New**— event strip component       |
| `frontend/src/components/home/PillarSection.astro`  | **New**— editorial section component |
| `frontend/src/pages/[lang]/index.astro`             | Rewrite template + remove card grid         |
| `frontend/src/styles/global.css`                    | Remove orphaned hub-grid rules (if any)     |

## Existing Code to Reuse

| What                                     | Where                                       |
| ---------------------------------------- | ------------------------------------------- |
| `splitEvents()`                        | `frontend/src/lib/events/eventHelpers.ts` |
| `t()`,`Locale`,`ui`dict            | `frontend/src/lib/i18n.ts`                |
| `getLangFromEntry()`                   | `frontend/src/lib/i18n.ts`                |
| CSS variables (colors, spacing, shadows) | `frontend/src/styles/variables.css`       |
| BaseLayout hero slot                     | `frontend/src/layouts/BaseLayout.astro`   |
| Hero section styles                      | Keep as-is from current `index.astro`     |

## Verification

1. **3-locale check** : Visit `/zh`, `/en`, `/de` — all text from i18n, no raw keys
2. **Dark mode** : Toggle theme — all sections have correct contrast
3. **Mobile (375px)** : Sections stack, images scale, banner readable
4. **Empty state** : Remove all events → NextRideBanner shows fallback, no crash
5. **Performance** : Hero preloaded, all pillar images `loading="lazy"`
6. **Links** : Every CTA navigates to correct section page
7. **Build** : `npm run build` passes without errors
8. **No regressions** : Events page (`/zh/events`) still works (uses its own components)
