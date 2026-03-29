# ACC ClubHub UI Overhaul — Implementation Plan

## Overview

Two-phase modernization of the ACC ClubHub Astro+Preact cycling club website. Moving from a "Der Blaue Reiter" expressionist art theme (skewed cards, noise textures, blue mountain palette) to a Rapha/Canyon-inspired premium cycling aesthetic (clean geometry, subtle shadows, wine red accents, content-focused).

---

## PHASE A: Global Style Refresh

### A1. Design Tokens Update (`frontend/src/styles/variables.css`)

**Current → New values:**

```css
:root {
  /* Color Palette — Rapha Premium */
  --color-bg-canvas: #FFFFFF;         /* Was #F0F4F5 (Mist White) → Pure white */
  --color-bg-secondary: #F7F7F8;     /* NEW: Light gray for alternating sections */
  --color-bg-surface: #FFFFFF;        /* NEW: Card/surface background */
  --color-primary: #1A1A1A;           /* Was #2D5D9B (Mountain Blue) → Near black for text-dominant design */
  --color-secondary: #6B7280;         /* Was #5CA042 (Brush Green) → Neutral gray for secondary text */
  --color-accent: #C62828;            /* Was #D63E33 (Arch Red) → Deep wine red, Rapha-style */
  --color-accent-hover: #A51D1D;      /* NEW: Darker red for hover states */
  --color-highlight: #F2C94C;         /* Keep Sun Yellow (rarely used) */
  --color-text-main: #1A1A1A;         /* Was #111111 → slightly softer near-black */
  --color-text-secondary: #6B7280;    /* NEW: replaces hardcoded #666, #555 */
  --color-text-muted: #9CA3AF;        /* NEW: replaces hardcoded #888, #999 */
  --color-text-light: #FFFFFF;
  --color-border: #E5E7EB;            /* Was --color-border-rough: #111111 → soft gray border */
  --color-border-light: #F3F4F6;      /* NEW: very subtle border */

  /* Typography — unchanged fonts, adjusted weights */
  --font-heading: 'Jost', 'Futura', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* Geometry — Clean Modern (REMOVE all skew) */
  --angle-motion: 0deg;        /* Was -4deg → eliminated */
  --angle-section: 0deg;       /* Was -3deg → eliminated */
  --radius-sm: 6px;            /* NEW */
  --radius-md: 12px;           /* Was --radius-aero: 12px → renamed for clarity */
  --radius-lg: 16px;           /* NEW: cards */
  --radius-xl: 24px;           /* NEW: large cards/modals */
  --radius-btn: 8px;           /* Was 4px → more rounded */
  --radius-full: 9999px;       /* NEW: pill shapes */

  /* Shadows — Subtle depth, NO hard offsets */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);

  /* Spacing — keep existing, add wider layout */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 4rem;
  --space-2xl: 6rem;           /* NEW */
  --space-3xl: 8rem;           /* NEW */

  /* Layout */
  --max-width: 1200px;         /* Was 960px → wider for modern feel */
  --max-width-narrow: 800px;   /* NEW: for article content */
}
```

**Commit:** `refactor(tokens): modernize design tokens to Rapha-inspired premium palette`

**Verify:** Build should succeed. Pages will look broken (expected — colors/variables changed but consumers not yet updated).

---

### A2. Global Styles + Body Background (`frontend/src/styles/global.css`)

**Changes:**

1. **Remove body::before** (noise SVG texture overlay) — delete entirely
2. **Remove body::after** (blurred photo background) — delete entirely
3. **Update body** background to simple `background-color: var(--color-bg-canvas)`
4. **Update typography**: Remove `font-style: italic` and `text-transform: uppercase` from all headings (h1-h6). Keep for buttons/nav only. Headings should be clean sentence case.
5. **Remove `.page-title h1::after`** rotated underline decoration (replace with a clean, non-rotated accent bar, or remove entirely)
6. **Replace all hardcoded colors**:
   - `#666` → `var(--color-text-secondary)`
   - `#555` → `var(--color-text-secondary)`
   - `#888` → `var(--color-text-muted)`
   - `#999` → `var(--color-text-muted)`
   - `#000` → `var(--color-text-main)`
   - `#111` → `var(--color-text-main)`
   - `#ccc` → `var(--color-border)`
7. **Update `.hub-grid`**: Remove all skewX transforms. Replace the "2-up, 3-down" grid with a clean 5-column horizontal strip layout (the new homepage nav bar concept). More on this in A6.
8. **Remove `.section-diagonal`** clip-path polygon (not needed in clean design)
9. **Update `.hub-card` hover**: Remove translate + hard box-shadow. Replace with `box-shadow: var(--shadow-lg)` and subtle `translateY(-2px)`.
10. **Remove `.hub-card h3` text-shadow** and `.hub-card p` text-shadow.
11. **Update `.placeholder` and `.feature-placeholder`**: Remove hard-edge `box-shadow: 4px 4px 0px`. Use `var(--shadow-sm)`. Remove `border: 2px solid`.
12. **Update `.status-badge`**: Remove border-rough. Use lighter border.

**Commit:** `refactor(global): remove noise/blur backgrounds, skew transforms, and hardcoded colors`

**Verify:** Homepage should show white background, no texture. Cards should appear un-skewed. Colors may still be off in scoped component styles.

---

### A3. Buttons Modernization (`frontend/src/styles/components/buttons.css`)

**Changes:**

1. **Remove `transform: skewX(-12deg)`** from `.btn`
2. **Remove counter-skew** `.btn > span { transform: skewX(12deg) }` — no longer needed
3. **Update `.btn-primary`**:
   - `background-color: var(--color-accent)` (wine red as CTA color)
   - `color: var(--color-text-light)`
   - `box-shadow: none` (no hard offset shadows)
   - `border-radius: var(--radius-btn)` (8px)
   - `font-style: normal` (remove italic)
   - `letter-spacing: 0.02em` (tighten)
   - Hover: `background-color: var(--color-accent-hover)` + `box-shadow: var(--shadow-md)` + `transform: translateY(-1px)`
4. **Update `.btn-ghost`**:
   - `border: 1.5px solid var(--color-border)`
   - Hover: `background-color: var(--color-text-main)` stays, but `box-shadow: var(--shadow-sm)` replaces highlight shadow
5. **Add `.btn-secondary`** variant: white background, subtle border, for non-primary actions

**Commit:** `refactor(buttons): remove skew transforms, apply wine-red CTA style`

**Verify:** All buttons across the site should appear as clean rectangles with rounded corners. Check events detail page registration button, filter panel reset button.

---

### A4. Cards Modernization (`frontend/src/styles/components/cards.css`)

**Changes:**

1. **Remove `transform: skewX(var(--angle-motion))`** from `.card`
2. **Remove counter-skew** `.card > * { transform: skewX(...) }`
3. **Update `.card`**:
   - `border: 1px solid var(--color-border)` (was 2px solid charcoal)
   - `border-radius: var(--radius-lg)` (16px)
   - `box-shadow: var(--shadow-sm)` (was `6px 6px 0px var(--color-primary)`)
   - Hover: `box-shadow: var(--shadow-lg)` + `transform: translateY(-2px)` (was skew + translate + red shadow)
4. **Update `.card-header` color**: `var(--color-text-main)` (was `var(--color-primary)`)

**Commit:** `refactor(cards): clean geometry with subtle shadows, remove skew and hard-edge box-shadow`

**Verify:** Any page using `.card` class should display clean rounded cards with soft shadows.

---

### A5. Header Modernization (`frontend/src/components/Header.astro`)

**Changes to scoped `<style>`:**

1. **Header background**: Initial state = `background: transparent; border-bottom: none;` (transparent over hero)
2. **Scrolled state**: Add JS for scroll detection — when scrolled past hero height, add class `.header-scrolled` with `background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-border);`
3. **Remove** the warm beige `rgba(232, 228, 217, 0.9)` background
4. **Logo text color**: Keep `var(--color-accent)` — the red wordmark pairs with the red logo image
5. **Nav link underline**: Remove `transform: rotate(-1deg)` from `li a::after` — make it perfectly horizontal
6. **Nav link active/hover**: Change from `var(--color-primary)` (was blue) to `var(--color-accent)` (wine red)
7. **Lang menu**: `border-radius: var(--radius-md)` (was 4px)
8. **Lang toggle underline**: Remove `rotate(-1deg)` — straight

**New: Add scroll detection script** in Header.astro:

```html
<script>
  const header = document.querySelector('header');
  const scrollThreshold = 50;
  function onScroll() {
    if (window.scrollY > scrollThreshold) {
      header?.classList.add('header-scrolled');
    } else {
      header?.classList.remove('header-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check
</script>
```

**New: Accept a `transparent` prop** in Header.astro to control initial transparency:

- On homepage and events page (with heroes): `transparent={true}` → starts transparent, transitions on scroll
- On inner pages: `transparent={false}` → starts with white background + border immediately

**BaseLayout.astro change**: Pass a new `headerTransparent` prop through to Header.

**Commit:** `feat(header): transparent-to-white scroll transition, remove beige background and rotated underlines`

**Verify:** On homepage, header should be transparent at top, white on scroll. On inner pages like privacy, header should be white immediately.

---

### A6. Homepage Overhaul (`frontend/src/pages/[lang]/index.astro`)

**Layout restructure (top to bottom):**

1. **Full-screen hero section** — replaces the fixed transparent logo:

   - Full viewport height (100vh) or min-height 70vh
   - Background: static hero image (use existing `/images/uploads/RR120-SONNTAG-cPIARAZZI-20.jpg` or another cycling image from uploads)
   - Dark gradient overlay for text readability
   - Centered content: Club name + tagline + CTA button
   - The red logo can appear small in the hero, but NOT as the giant fixed watermark
2. **Compact section navigation strip** — replaces the hub-grid:

   - Horizontal bar below hero, white/light-gray background
   - 5 section links in a row: Events, Media, Gear, Training, Routes
   - Each is a clean card/button with icon + title (no emoji, use simple text or SVG icons)
   - On mobile: horizontally scrollable strip or 2x3 grid
3. **Optional latest content section** below the strip:

   - Can show 1-3 latest events or featured content
   - Uses the modernized MasonryCard or a simpler card grid

**Remove:**

- The giant fixed `hero-logo` (80vh transparent red logo as background)
- The `sections-hub` with 270px margin-top offset
- The `.status-badge` "Beta Under Construction" if no longer needed

**Decision on hero content source:** The homepage hero should be a **static hero image** (not dynamically pulled from events). Rationale: The homepage represents the club brand, not a specific event. The events page has its own dynamic hero. The homepage hero image can be changed seasonally by updating a single image path. If desired later, a CMS field can control this.

**Commit:** `feat(homepage): full-screen hero + compact nav strip, replace skewed hub-grid`

**Verify:** Homepage should show a full-bleed hero image → a clean horizontal strip of 5 section links → optional content preview. Mobile should stack or scroll.

---

### A7. Footer Modernization (`frontend/src/components/Footer.astro`)

**Changes:**

1. Replace `border-top: 2px solid var(--color-border-rough)` → `border-top: 1px solid var(--color-border)`
2. Replace `color: #666` → `color: var(--color-text-secondary)`
3. Replace `color: #ccc` (divider) → `color: var(--color-border)`
4. Optionally expand footer with club info, social links section

**Commit:** `refactor(footer): modernize borders and color tokens`

**Verify:** Footer appears with subtle top border and consistent gray text.

---

### A8. Masonry Card + Content Card Modernization

**`frontend/src/components/ui/Masonry.css`:**

1. Update `.masonry-card`: `border-radius: var(--radius-lg)` (was 16px hardcoded, now references token)
2. Replace `background: rgba(255, 255, 255, 0.85)` → `background: var(--color-bg-surface)`
3. Replace `#e0e0e0` fallback → `var(--color-border)`
4. Replace `.masonry-card-desc` `color: #666` → `var(--color-text-secondary)`
5. Replace `.masonry-card-date` `color: #999` → `var(--color-text-muted)`
6. Update `.masonry-card-tag` background to use `var(--color-accent)` at low opacity

**`frontend/src/components/ContentCard.astro` (scoped styles):**

1. Remove `border: 2px solid var(--color-border-rough)` → `border: 1px solid var(--color-border)`
2. Replace hover `box-shadow: 6px 6px 0px` → `box-shadow: var(--shadow-lg)`
3. Replace `#666` → `var(--color-text-secondary)`
4. Replace `#888` → `var(--color-text-muted)`

**Commit:** `refactor(cards): modernize MasonryCard and ContentCard with token colors and clean shadows`

**Verify:** All listing pages (Events, Media, Gear, Training, Routes) should display cards with soft shadows and correct colors.

---

### A9. Filter Panel + Search Bar Color Alignment

**`frontend/src/components/filter/FilterComponents.css`:**

1. Replace `--filter-active-color: #ff4d00` → use `var(--color-accent)` (#C62828)
2. Replace `color: #333` → `var(--color-text-main)`
3. Replace `color: #666` → `var(--color-text-secondary)`
4. Replace `color: #222` → `var(--color-text-main)`
5. Replace `color: #444` → `var(--color-text-secondary)`
6. Replace `color: #999` → `var(--color-text-muted)`
7. Replace `background: rgba(255, 77, 0, 0.05)` → `rgba(198, 40, 40, 0.05)`
8. Update border-radius values to use tokens

**`frontend/src/components/search/SearchBar.css`:**

1. Replace dark dropdown `background: #1a1a1a` → `var(--color-bg-surface)` (white) or keep dark if preferred as a design choice — recommendation: switch to light theme dropdown matching the overall clean white aesthetic
2. Update all `rgba(255, 255, 255, ...)` colors in the dropdown to `rgba(0, 0, 0, ...)` if switching to light dropdown
3. Replace badge colors with token-based values

**Commit:** `refactor(filter,search): align colors with design token system`

**Verify:** Open filter panel on any listing page — should use wine red accent. Search dropdown should be visually consistent.

---

### A10. Article Layout + Event Detail Page

**`frontend/src/layouts/ArticleLayout.astro`:**

1. Replace `.article-cover` `border: 2px solid var(--color-border-rough)` → `border: none; border-radius: var(--radius-lg)`
2. Replace `.article-meta` `color: #666` → `var(--color-text-secondary)`
3. Replace blockquote `color: #555` → `var(--color-text-secondary)`
4. Replace table header `background: rgba(45, 93, 155, 0.1)` → `var(--color-bg-secondary)`
5. Keep pre/code dark theme (functional, not decorative)

**`frontend/src/components/EventRegistrationForm.css`:**

1. Remove `box-shadow: 3px 3px 0` → `box-shadow: var(--shadow-md)`
2. Remove `transform: scale(0.95)` → keep full size
3. Replace `border: 2px solid var(--color-border-rough)` → `border: 1px solid var(--color-border)`
4. Replace fallback hex values `#2A5CA6` → `var(--color-accent)` since primary is now dark and accent is the CTA color
5. Update form title `::before` border to use `var(--color-border)`

**`frontend/src/pages/[lang]/events/[slug].astro`:**

1. Update `.event-register-btn`: Remove `border: 2px solid var(--color-border-rough)`, remove hard box-shadow, use `var(--shadow-sm)`, use `border-radius: var(--radius-btn)`
2. Replace `.event-location` `color: #666` → `var(--color-text-secondary)`

**Commit:** `refactor(article,events-detail): modernize article layout and registration form styling`

**Verify:** Visit an event detail page. Form should have clean borders, soft shadows, wine-red submit button. Article cover should have no hard border.

---

### A11. Remaining Listing Pages (Hardcoded Colors)

**Files to update (scoped styles only):**

- `frontend/src/pages/[lang]/media/index.astro` — replace `#666` in `.page-subtitle`
- `frontend/src/pages/[lang]/routes/index.astro` — same
- `frontend/src/pages/[lang]/knowledge/gear/index.astro` — same
- `frontend/src/pages/[lang]/knowledge/training/index.astro` — same
- `frontend/src/pages/[lang]/events/index.astro` — same
- `frontend/src/pages/[lang]/routes/[slug].astro` — multiple hardcoded colors (#666, #888, Strava orange #fc4c02, Komoot green #6aa127 — Strava/Komoot brand colors can stay as they are brand-specific)
- `frontend/src/pages/[lang]/privacy.astro` — replace #666, #333
- `frontend/src/components/WalineComments.astro` — replace #666, #444

**Commit:** `refactor(pages): replace hardcoded hex colors with design tokens across all pages`

**Verify:** Visually scan every page. No #666/#888/#555 should appear in styles (grep to confirm).

---

### A12. Typography Fine-Tuning

After all structural changes, one pass to ensure:

1. Headings in article/content pages are NOT uppercase (remove from global h1-h6 rule)
2. Navigation + buttons CAN remain uppercase as a design choice
3. Heading `letter-spacing: -0.02em` is good for the clean look — keep
4. Body text line-height 1.6 is good — keep

**Commit:** `refactor(typography): normalize heading casing, keep uppercase for nav/buttons only`

---

## PHASE B: Events Page Three-Layer Restructure

### B1. Schema: Add `featured` Flag

**`frontend/src/content.config.ts`:**
Add to events schema object:

```typescript
featured: z.boolean().optional().default(false),
```

In the transform, pass through: `featured: data.featured`

**Update one event markdown** to test: e.g. `summer-alps-2025.md` in all 3 languages — add `featured: true` to frontmatter.

**Commit:** `feat(schema): add optional featured flag to events content collection`

**Verify:** `astro build` succeeds. Existing events without `featured` default to false.

---

### B2. Events Helper Utilities

**Create new file: `frontend/src/lib/events/eventHelpers.ts`**

```typescript
interface EventEntry {
  data: {
    slug: string;
    title: string;
    date: string;
    featured?: boolean;
    eventType?: string;
    cover?: string;
    description?: string;
    location?: string;
  };
}

/**
 * Get the hero event: first featured event, or next upcoming event by date.
 * Returns null if no events exist.
 */
export function getHeroEvent(events: EventEntry[]): EventEntry | null {
  const now = new Date();
  const featured = events.find(e => e.data.featured);
  if (featured) return featured;
  
  const upcoming = events
    .filter(e => new Date(e.data.date) >= now)
    .sort((a, b) => new Date(a.data.date).valueOf() - new Date(b.data.date).valueOf());
  
  return upcoming[0] || null;
}

/**
 * Split events into upcoming and past.
 */
export function splitEvents(events: EventEntry[]): {
  upcoming: EventEntry[];
  past: EventEntry[];
} {
  const now = new Date();
  const upcoming = events
    .filter(e => new Date(e.data.date) >= now)
    .sort((a, b) => new Date(a.data.date).valueOf() - new Date(b.data.date).valueOf());
  const past = events
    .filter(e => new Date(e.data.date) < now)
    .sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf());
  return { upcoming, past };
}

/**
 * Separate weekly regulars (social-ride type, recurring) from one-off events.
 */
export function separateRegulars(events: EventEntry[]): {
  regulars: EventEntry[];
  specials: EventEntry[];
} {
  const regulars = events.filter(e => e.data.eventType === 'social-ride');
  const specials = events.filter(e => e.data.eventType !== 'social-ride');
  return { regulars, specials };
}
```

**Commit:** `feat(events): add helper utilities for hero selection, timeline splitting, and regulars separation`

**Verify:** Unit logic is straightforward. Tested implicitly when events page loads.

---

### B3. Events Hero Component

**Create new file: `frontend/src/components/events/EventHero.astro`**

A full-width hero section showing the featured/next event:

- Full-width banner (not constrained by `--max-width`)
- Background: event cover image with dark gradient overlay
- Content overlay: event title, date, location, type badge, CTA button ("View Details" or "Register")
- When no event exists: show a fallback — static hero with club cycling imagery and "No upcoming events" message

**Key styles:**

```css
.event-hero {
  position: relative;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  min-height: 50vh;
  display: flex;
  align-items: flex-end;
  padding: var(--space-2xl) var(--space-lg);
  background-size: cover;
  background-position: center;
  color: var(--color-text-light);
}

.event-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
}

.event-hero-content {
  position: relative;
  z-index: 1;
  max-width: var(--max-width);
  margin: 0 auto;
  width: 100%;
}
```

**Fallback (0 events):** Show a generic hero with a static cycling image, text like "Stay tuned for upcoming events" and a subtitle.

**Commit:** `feat(events): create EventHero.astro component for featured event display`

**Verify:** Component renders with a test event. Fallback renders when passed null.

---

### B4. Events Section Components

**Create: `frontend/src/components/events/UpcomingEvents.astro`**

- Grid of upcoming event cards (2 or 3 columns)
- Uses modernized card style
- Each card shows: cover image, title, date, location, type badge
- If no upcoming events: "No upcoming events scheduled" message

**Create: `frontend/src/components/events/WeeklyRegulars.astro`**

- Simpler display for recurring rides (social-ride type)
- Could be a compact list or small cards
- Shows: name, day/time, meeting point

**Create: `frontend/src/components/events/PastEvents.astro`**

- Grid of past event cards
- **Grayscale by default**, color on hover:

```css
.past-event-card img {
  filter: grayscale(100%);
  transition: filter 0.4s ease;
}
.past-event-card:hover img {
  filter: grayscale(0%);
}
```

- Collapsible or "Show more" pattern if many past events
- Section heading: "Past Events" / "Archive"

**Commit:** `feat(events): create UpcomingEvents, WeeklyRegulars, and PastEvents section components`

---

### B5. Restructure Events Index Page

**Rewrite: `frontend/src/pages/[lang]/events/index.astro`**

Replace the current flat FilterPanel + MasonryGrid layout with the three-layer structure:

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
import EventHero from '../../../components/events/EventHero.astro';
import UpcomingEvents from '../../../components/events/UpcomingEvents.astro';
import WeeklyRegulars from '../../../components/events/WeeklyRegulars.astro';
import PastEvents from '../../../components/events/PastEvents.astro';
import { getCollection } from 'astro:content';
import { getHeroEvent, splitEvents, separateRegulars } from '../../../lib/events/eventHelpers';
// ... lang handling ...

const heroEvent = getHeroEvent(sortedEvents);
const { upcoming, past } = splitEvents(sortedEvents);
const { regulars, specials } = separateRegulars(upcoming);
---

<BaseLayout title={pageTitle} lang={lang} headerTransparent={true}>
  <!-- Layer 1: Hero -->
  <EventHero event={heroEvent} lang={lang} />

  <!-- Layer 2: Upcoming + Regulars -->
  <section class="events-layer-2">
    <UpcomingEvents events={specials} lang={lang} />
    <WeeklyRegulars events={regulars} lang={lang} />
  </section>

  <!-- Layer 3: Past Archive -->
  <PastEvents events={past} lang={lang} />
</BaseLayout>
```

**Important:** The FilterPanel + MasonryGrid pattern is REMOVED from the events page. It remains on Media, Gear, Training, Routes pages (those are unaffected).

**BaseLayout change:** Accept `headerTransparent` prop, pass to Header. When events page has a hero, the header should start transparent.

**Layout considerations:** The hero needs to break out of the `<main>` max-width constraint. Options:

- Use `width: 100vw; margin-left: calc(-50vw + 50%);` on the hero
- Or modify BaseLayout to have an optional "full-width" slot before `<main>`
- Recommendation: Add a `<slot name="hero" />` in BaseLayout between Header and main, rendered without max-width constraint

**Commit:** `feat(events-page): implement three-layer events layout with hero, upcoming, regulars, and archive`

**Verify:** Events page shows: hero with featured event → upcoming events grid + weekly regulars → past events in grayscale. Filter panel is gone from events page.

---

### B6. BaseLayout Hero Slot

**Modify: `frontend/src/layouts/BaseLayout.astro`**

```astro
<body>
  <Header lang={lang} transparent={headerTransparent} />
  <slot name="hero" />
  <main>
    <slot />
  </main>
  <Footer />
</body>
```

The `hero` named slot renders outside `<main>` (no max-width constraint), allowing full-bleed hero sections.

**Update Props interface** to include `headerTransparent?: boolean`.

**Commit:** `feat(layout): add hero slot to BaseLayout for full-bleed sections`

---

## Design Decisions & Edge Cases

### Homepage hero: events or static?

**Decision: Static image.** The homepage hero represents the club brand. It should not change when events change. A seasonal photo swap is easy (one image path edit). The events page already has its own dynamic hero.

### What happens with 0 upcoming events?

- **Events hero (B3):** Falls back to a static cycling image with "Stay tuned" messaging. Never shows empty/broken state.
- **Upcoming events section (B4):** Shows a brief "No upcoming events — check back soon" message in a clean card.
- **Weekly regulars:** If no social-ride type events exist, the section is hidden entirely.

### Skew removal — intermediate breakage strategy

The key risk is that removing skew transforms from global tokens (`--angle-motion: 0deg`) while components still reference counter-skew (`.card > * { transform: skewX(calc(var(--angle-motion) * -1)) }`) could misalign content.

**Mitigation:** In commit A1 (tokens), set angles to 0deg. This immediately neutralizes all skew everywhere because `skewX(0deg)` is identity. Counter-skew of 0deg is also identity. So content remains properly aligned. Then in A4 (cards), remove the now-unnecessary counter-skew rules entirely. This two-step approach means there is NO intermediate broken state.

### Responsive breakpoints

Maintain existing breakpoints:

- 600px: tablet
- 768px: nav collapse to hamburger
- 900px: desktop
  Add consideration for the events page hero at mobile (reduce min-height, adjust text sizing).

---

## Commit Sequence Summary

### Phase A (Global Refresh)

1. `refactor(tokens): modernize design tokens to Rapha-inspired premium palette`
2. `refactor(global): remove noise/blur backgrounds, skew transforms, and hardcoded colors`
3. `refactor(buttons): remove skew transforms, apply wine-red CTA style`
4. `refactor(cards): clean geometry with subtle shadows, remove skew and hard-edge box-shadow`
5. `feat(header): transparent-to-white scroll transition, remove beige background`
6. `feat(homepage): full-screen hero + compact nav strip, replace skewed hub-grid`
7. `refactor(footer): modernize borders and color tokens`
8. `refactor(cards): modernize MasonryCard and ContentCard with token colors`
9. `refactor(filter,search): align colors with design token system`
10. `refactor(article,events-detail): modernize article layout and registration form`
11. `refactor(pages): replace hardcoded hex colors with design tokens across all pages`
12. `refactor(typography): normalize heading casing, keep uppercase for nav/buttons only`

### Phase B (Events Restructure)

13. `feat(schema): add optional featured flag to events content collection`
14. `feat(events): add helper utilities for hero selection and timeline splitting`
15. `feat(events): create EventHero.astro component`
16. `feat(events): create UpcomingEvents, WeeklyRegulars, PastEvents components`
17. `feat(layout): add hero slot to BaseLayout for full-bleed sections`
18. `feat(events-page): implement three-layer events layout`

---

## Files Changed Summary

### Phase A — Modified Files

- `frontend/src/styles/variables.css`
- `frontend/src/styles/global.css`
- `frontend/src/styles/components/buttons.css`
- `frontend/src/styles/components/cards.css`
- `frontend/src/components/Header.astro`
- `frontend/src/components/Footer.astro`
- `frontend/src/pages/[lang]/index.astro`
- `frontend/src/layouts/BaseLayout.astro`
- `frontend/src/components/ui/Masonry.css`
- `frontend/src/components/ContentCard.astro`
- `frontend/src/components/filter/FilterComponents.css`
- `frontend/src/components/search/SearchBar.css`
- `frontend/src/layouts/ArticleLayout.astro`
- `frontend/src/components/EventRegistrationForm.css`
- `frontend/src/pages/[lang]/events/[slug].astro`
- `frontend/src/pages/[lang]/media/index.astro`
- `frontend/src/pages/[lang]/routes/index.astro`
- `frontend/src/pages/[lang]/routes/[slug].astro`
- `frontend/src/pages/[lang]/knowledge/gear/index.astro`
- `frontend/src/pages/[lang]/knowledge/training/index.astro`
- `frontend/src/pages/[lang]/privacy.astro`
- `frontend/src/components/WalineComments.astro`

### Phase B — New Files

- `frontend/src/lib/events/eventHelpers.ts`
- `frontend/src/components/events/EventHero.astro`
- `frontend/src/components/events/UpcomingEvents.astro`
- `frontend/src/components/events/WeeklyRegulars.astro`
- `frontend/src/components/events/PastEvents.astro`

### Phase B — Modified Files

- `frontend/src/content.config.ts`
- `frontend/src/content/events/en/summer-alps-2025.md` (add featured: true)
- `frontend/src/content/events/zh/summer-alps-2025.md`
- `frontend/src/content/events/de/summer-alps-2025.md`
- `frontend/src/pages/[lang]/events/index.astro` (major rewrite)
- `frontend/src/layouts/BaseLayout.astro` (add hero slot)
