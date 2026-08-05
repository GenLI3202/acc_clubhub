# Plan — Sponsors Bar + Partners Page

## Context

The user has a Claude Design handoff bundle at `acc-sponsorship-show/` containing an HTML/CSS/JS prototype for two new pieces of the website:

1. **A quiet sponsor logo strip** displayed on the homepage (just before the footer) — credibility cue, not a sales banner.
2. **A dedicated Partners page** with two "Official Partners" cards (Active Nutrition International, LeDU München) and four "Friends of ACC" tiles (Brix Coffee, Sport Schuster, Velothique, Tegernsee Bräu), plus a "Become a Partner" CTA section.

The prototype is built with React/Babel for design iteration; the production site is **Astro 4 + content collections, multilingual (`zh` default, `en`, `de`)**. The prototype's CSS tokens (wine red `#C62828`, Jost/Inter, the same shadow/radius scale) already match the live site's tokens in `frontend/src/styles/variables.css`, so this is largely a port of layout + data, not a redesign.

Goal: add Sponsors-bar + Partners page in the existing Astro app, fully i18n'd, without touching anything else.

---

## Decisions (confirmed with user)

- **Route**: `/[lang]/partners`
- **Strip position**: just before the footer on home
- **Nav**: add a "Partners" entry to the main nav
- **Data**: static TS module at `frontend/src/data/sponsors.ts`

---

## Branch

Check out: `phase-sponsors/partners-page-and-strip` (off `master`).

---

## Files to create

### 1. `frontend/src/data/sponsors.ts`

Mirror the shape of `acc-sponsorship-show/project/data.jsx`. Two arrays:

```ts
export interface SponsorMain {
  id: string;
  name: string;
  parent: string;          // e.g. "PowerBar · Dymatize · Premier Protein"
  logoFull: string;        // /images/sponsors/sponsor-ani.png
  logoParent: string;      // /images/sponsors/sponsor-ani-parent.png
  catKey: string;          // i18n key, e.g. "partners.category.nutrition"
  blurbKey: string;        // i18n key
  since: string;           // "2026"
}

export interface SponsorPartner {
  id: string;
  name: string;
  catKey: string;
  // Typographic logo — render via a small inline component keyed by id
  // (no image; the four "friends" are typographic placeholders in the prototype)
  logoStyle: "brix" | "schuster" | "velothique" | "tegernsee";
}

export const SPONSORS_MAIN: readonly SponsorMain[];
export const SPONSORS_PARTNERS: readonly SponsorPartner[];
```

### 2. `frontend/public/images/sponsors/`

Copy these from `acc-sponsorship-show/project/assets/`:
- `sponsor-ani.png`
- `sponsor-ani-parent.png`
- `sponsor-ledu-trim.png`
- `logo-stamp-red-transparent.png` (background watermark on Partners hero)

### 3. `frontend/src/components/sponsors/PartnerLogo.astro`

Small component dispatching on `logoStyle` to render the four typographic "Friends" logos (Brix, Schuster, Velothique, Tegernsee). Direct port of the inline JSX in `acc-sponsorship-show/project/data.jsx:53-177`. Accepts `mono?: boolean` for the homepage strip's greyscale variant.

### 4. `frontend/src/components/home/SponsorStrip.astro`

Pure Astro port of `SponsorStrip` from `acc-sponsorship-show/project/partners.jsx:7-105`.

- Imports `SPONSORS_MAIN` + `SPONSORS_PARTNERS` from the data module
- Renders the eyebrow label + "View all →" link
- Lays out all 6 logos in a `repeat(N, 1fr)` grid
- Uses the **color** variant + **compact** density (matches the prototype's `TWEAK_DEFAULTS`)
- All copy goes through `t(lang, ...)` (see "i18n keys" below)
- The "View all" link goes to `/${lang}/partners`

### 5. `frontend/src/pages/[lang]/partners.astro`

Port of `PartnersPage` from `acc-sponsorship-show/project/partners.jsx:216-427`.

Sections:
1. Editorial header (eyebrow, large title, accent rule, lede) with the `logo-stamp-red-transparent.png` decorative watermark in top-right
2. `<SectionLabel>` "Official Partners" + 2-column grid of `MainSponsorCard`s (with the `CornerSeal` SVG mark — port the inline SVG from `partners.jsx:111-154`)
3. `<SectionLabel>` "Friends of ACC" + 4-column grid of partner tiles on `--color-bg-secondary`
4. CTA section with `partners@across-cc.de` button + "Download Partnership Deck" ghost button (no download link yet — leave `href="#"` with a TODO comment)

Use `BaseLayout` so it inherits header/footer/dark-mode wiring. Set `export const prerender = true;` and `getStaticPaths()` from `locales` (same pattern as `frontend/src/pages/[lang]/about.astro`).

### 6. Wire the strip into homepage

Edit `frontend/src/pages/[lang]/index.astro`:
- Import `SponsorStrip`
- Render `<SponsorStrip lang={lang} />` **after** the last `<PillarSection>` (the "gear" pillar at line 151–161), so it sits just before the footer.

### 7. Add nav entry

Edit `frontend/src/lib/i18n.ts`:
- Add `'nav.partners'` keys to all three locales (`zh`/`en`/`de`):
  - zh: `合作伙伴`
  - en: `Partners`
  - de: `Partner`
- Append a row in `getNavLinks()` (line 435–445) between routes and about:
  ```ts
  { label: t(lang, 'nav.partners'), href: `/${lang}/partners` },
  ```

### 8. i18n keys for the Partners page + strip

Add to `frontend/src/lib/i18n.ts` `ui` dictionary, per locale. Source: `acc-sponsorship-show/project/i18n.jsx` (all three locales are already written out there — direct copy, just renamed to the dotted convention this codebase uses):

```
partners.strip.label          (strip_label)
partners.strip.subtitle       (strip_subtitle)
partners.viewAll              (view_all)
partners.eyebrow              (partners_eyebrow)
partners.title                (partners_title)
partners.lede1                (partners_lede_1)
partners.lede2                (partners_lede_2)
partners.officialPartners     (official_partners)
partners.friends              (friends)
partners.since                (since)
partners.becomePartner.eyebrow (become_partner_eyebrow)
partners.becomePartner.title   (become_partner_title)
partners.becomePartner.blurb   (become_partner_blurb)
partners.ctaDeck               (cta_deck)
partners.blurb.ani             (blurb_powerbar)
partners.blurb.ledu            (blurb_ledu)
partners.category.nutrition
partners.category.hospitality
partners.category.cafe
partners.category.retail
partners.category.service
partners.category.afterride
```

### 9. Footer link (optional, light touch)

Edit `frontend/src/components/Footer.astro`: append `<a href={`/${lang}/partners`}>Partners</a>` (locale-aware label) to the footer nav, after the existing About entry. Single line change.

---

## Files to NOT port

- `tweaks-panel.jsx` — dev-only design panel, no value in production
- `app.jsx` routing logic — Astro handles routing
- `nav.jsx` — existing `Header.astro` already does this job; don't duplicate
- `home.jsx` — only the SponsorStrip from `partners.jsx` is needed for home
- React/Babel `<script>` tags from `ACC Sponsorship.html` — Astro renders server-side, no runtime React

---

## Visual fidelity notes

- The prototype's design tokens (`colors_and_type.css`) already match `frontend/src/styles/variables.css`. Use the existing `--color-accent`, `--color-text-secondary`, `--font-heading`, `--font-body`, `--shadow-sm/lg`, `--radius-card` variables — don't introduce new ones.
- The prototype uses `--border-ink`, `--bg-tint`, `--accent` etc. (different prefixes). Map them when porting:
  - `--bg-canvas` → `--color-bg-canvas`
  - `--bg-secondary` → `--color-bg-secondary`
  - `--bg-tint` → no current equivalent; add `--color-bg-tint: #EFEFF1` to `variables.css` (and `#222222` for dark mode)
  - `--border-ink` → no current equivalent; add `--color-border-ink: #1A1A1A` (and `#EDEDED` for dark mode)
  - `--accent` → `--color-accent`
  - `--fg-primary` → `--color-primary`
  - `--fg-muted` → `--color-text-secondary`
- The "CornerSeal" SVG is small and inlined — port it as-is (use a deterministic `id` based on sponsor id to avoid hydration warnings).

---

## Verification

1. `cd frontend && npm run dev` — visit:
   - `http://localhost:4321/zh` — strip appears at bottom, "Partners" in nav
   - `http://localhost:4321/en/partners` — full page renders with 2 main cards + 4 friends tiles + CTA
   - `http://localhost:4321/de/partners` — German copy throughout
   - Toggle dark mode via the header sun/moon — strip + page both adapt
2. Click "View all →" on the strip → lands on `/[lang]/partners`
3. Click `partners@across-cc.de` button → opens mail client (use `mailto:` href)
4. `npm run build` succeeds, no TS errors
5. `npm run test` — existing tests still pass (no new tests required; this is presentational content)

---

## Out of scope

- Real `Download Partnership Deck` PDF (button stays as `href="#"` placeholder)
- CMS-driven sponsor entries (static TS file is sufficient for now)
- Analytics on partner-card clicks
- Mobile-specific layout polish beyond what the existing grid + `clamp()` already provide (prototype README explicitly says "Mobile not in scope — design is desktop-first"; we keep parity)
