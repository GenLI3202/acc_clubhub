# Historical route archive and map decision

Issue: [#175](https://github.com/GenLI3202/acc_clubhub/issues/175)  
Related: [#113](https://github.com/GenLI3202/acc_clubhub/issues/113)  
Audit date: 2026-09-08

## Decision

Publish the multilingual website archive with a direct Komoot or Strava link for
every route. Do not ship a Collection embed or a custom overview map yet.

This gives visitors a fast, filterable, no-login archive now and keeps route
details under ACC's control. A Komoot Collection embed remains the preferred
low-effort map enhancement after ACC provides a public, ACC-owned Collection
URL and confirms who maintains the Premium subscription. A custom Leaflet/Open
StreetMap overview remains deferred to issue #113 until approved geometry is
available for a representative set of routes.

## Acceptance status

- Repository archive and placeholder-cleanup requirements are complete for all
  source records currently available in the repository.
- The three map options are compared and the decision to defer a map is
  recorded.
- An ACC Collection embed is not release-ready. Its interactive checks require
  an ACC-owned public Collection containing all 18 routes, plus confirmation of
  account ownership and Premium renewal responsibility.
- The repository change can ship independently. If maintainers interpret the
  interactive Collection checklist as mandatory even for a defer decision,
  issue #175 must remain open or retain a follow-up until those inputs arrive.

## Archive result

The repository audit found 17 Chinese event records with route links. One older
South Afterwork record exists only in German. After deduplicating one repeated
Starnberg route and retaining two genuinely different Hahntennjoch starts, these
records produce 18 logical routes. Each route is published in Chinese, English,
and German, for 54 route entries in total.

| Archive slug | Ride record(s) | Distance | Elevation | Source | Notes |
| --- | --- | ---: | ---: | --- | --- |
| `season-opening-schaftlarn` | 2026-04-18 | 41.6 km | 350 m | Komoot | Return leg remains linked as a meaningful variant. |
| `eaglet-basics` | 2026-08-15 | 20–30 km | Pending | Komoot | Source reports a range only. |
| `eaglet-group-riding` | 2026-08-22 | 40–60 km | Pending | Komoot | Source reports a range only. |
| `eaglet-long-ride` | 2026-08-29 | 60–90 km | Pending | Komoot | Source reports a range only. |
| `munich-linden-schaftlarn-loop` | 2026-09-06 | 76.4 km | 564 m | Komoot | Published from the event record. |
| `english-garden-aquaride` | 2026-08-08 | 29.2 km | 120 m | Komoot | Mixed-surface leisure route. |
| `north-afterwork` | 2026-06-04 | 47.4 km | 110 m | Komoot | Current north route. |
| `south-afterwork` | 2026-05-05 | 42 km | 320 m | Komoot | Current south route. |
| `south-afterwork-thalkirchen` | 2026-05-19 | 40.1 km | 330 m | Komoot | Older German-only event, retained as a distinct route. |
| `hahntennjoch-garmisch-loop` | 2026-05-24 | 153 km | Pending | Komoot | Garmisch start; not merged with the shorter variant. |
| `hahntennjoch-ehrwald-loop` | 2026-05-24 | 109 km | Pending | Komoot | Ehrwald start; meaningfully different distance. |
| `northwest-flat-cruise` | 2026-05-03 | 61.8 km | 170 m | Komoot | Event record exists only in Chinese. |
| `starnberg-andechs-raisting-loop` | 2026-05-31, 2026-06-27 | 58 km | 590 m | Komoot, Strava | Same source route; one archive entry links both rides. |
| `laim-lakes-loop` | 2026-06-07 | 57.2 km | Pending | Komoot | Elevation was not stated in the source. |
| `holzkirchen-tegernsee` | 2026-06-14 | 47.8 km | Pending | Komoot | Elevation was not stated in the source. |
| `munich-ammersee-starnberg-loop` | 2026-07-05 | 100 km | 773 m | Komoot | Published from the event record. |
| `five-lakes-coffee-loop` | 2026-07-11 | 89 km | 715 m | Komoot | Published from the event record. |
| `wendelstein-kufstein-loop` | 2026-05-30 | 124.3 km | 1,538 m | Komoot | Event record exists only in Chinese. |

Every entry includes its associated ACC event link, available measurements,
region, difficulty, surface when the source states it, and a direct provider
link. Missing measurements remain absent instead of being estimated. The route
schema and cards support source-reported distance ranges and optional elevation.

## Known source gaps

- The repository contains no GPX files and only one GeoJSON track,
  `afterwork-ride-2026-04-30.geojson`. It is not enough for an archive overview.
- Seven logical routes have no source-confirmed elevation. Three of those also
  have only a distance range. Their pages state the limitation explicitly.
- The audit covers all route-bearing event records in the repository. ACC has
  not supplied an external historical inventory, so rides absent from the
  repository cannot be reconciled yet.
- ACC has not supplied an owned Komoot profile or target Collection URL.

These are explicit source gaps, not unpublished placeholder values.

## Placeholder cleanup

All 117 files marked `aiTemplate: true` were removed: 15 event files, 30 media
files, 24 gear files, 24 training files, and 24 route files. This represents 39
logical placeholders across three locales. The generic Munich guide entry and
its dedicated images were also removed because it was not an ACC route archive.
Collection pages, featured shelves, search indexing, internal links, and 404
coverage were checked against the remaining content. Evidence includes cleanup
commit `af9813c`, archive commit `64ea9d7`, search test commit `66b8ab1`, a
successful Astro check/build, 72 passing unit tests, and 32 passing desktop and
mobile content tests with two pre-existing skipped tests.

## Map options

### Website archive plus provider links

- Mobile: native responsive cards and detail pages; no third-party map payload.
- Login: none for browsing; Komoot requires registration only for saving or
  navigating a route.
- Coverage and overlaps: all 18 archive routes are visible and filterable, but
  overlapping track geometry is not visualized.
- Details: ACC detail page first, then a direct Komoot or Strava destination.
- Filters and languages: route content, search, filter sections, option values,
  actions, and range-input labels are localized in Chinese, English, and German.
  Surface remains visible as metadata when its source is known.
- Filter semantics: a source-reported distance range uses its upper bound for
  range filtering. Routes without elevation are excluded when an elevation
  range is active.
- Loading, cost, maintenance: lowest load and no subscription dependency; ACC
  maintains route metadata and provider links.

### Embedded Komoot Collection

- Mobile: Komoot documents responsive width, but iframe height is fixed and must
  be selected per layout.
- Login: public embeds are viewable without an account. Only public content can
  be embedded.
- Coverage and overlaps: Komoot describes a Collection embed as an overview map.
  A public Munich sample contains six real routes, but this session could not
  connect an interactive browser to verify simultaneous track display, overlap
  legibility, route selection, or the exact click destination.
- Details: the embed and a surrounding fallback link point to Komoot. Saving or
  navigating requires a Komoot account.
- Filters and languages: the provider UI has no ACC-specific filters. The
  documented locale list includes German and English but not Chinese; route
  names from personal content remain in the creator's language.
- Loading: adds a third-party iframe, map assets, and an external availability
  dependency. A plain Collection link must remain visible if it fails.
- Cost: generating and viewing embeds is free. Creating and managing a Personal
  Collection requires an active Komoot Premium subscription; Collections are
  deactivated when that subscription expires, although their routes remain.
- Maintenance: because the iframe is provider-hosted, Collection edits are
  expected to appear without a site rebuild. This is an inference that must be
  verified against ACC's Collection. ACC must own the public content and keep
  its visibility stable.

Representative validation:

- Verified from Komoot's public pages: Collection embeds are supported; the
  sample contains six real routes; the generated iframe shape is documented;
  public embeds need no viewer account; responsive width and supported locales
  are documented.
- Not verified interactively: simultaneous track display, overlap legibility,
  route selection details, exact click destination, update propagation, mobile
  rendering, and fallback behavior.

- Public sample:
  [Munich after-work Collection](https://www.komoot.com/collection/192/munich-s-best-after-work-rounds)
- Expected iframe form:
  `https://www.komoot.com/collection/<id>/<slug>/embed?layout=map`
- ACC validation status: blocked until an ACC-owned public Collection URL is
  provided. Provider-level interactive behavior remains an explicit release
  check rather than an assumed result.

### Custom Leaflet/OpenStreetMap overview

- Mobile: full design control, including a list/map toggle, but ACC must build
  and test all touch, keyboard, focus, and reduced-motion behavior.
- Login: none.
- Coverage and overlaps: can show every supplied geometry, style overlaps, and
  link a selected line to its ACC detail page.
- Filters and languages: can reuse the archive's filters and translations.
- Loading: Leaflet and OpenStreetMap tiles add client-side work; geometry needs
  simplification and lazy loading as the archive grows.
- Cost and maintenance: no Komoot subscription dependency, but tile-provider
  policy, geometry ingestion, attribution, accessibility, and data upkeep belong
  to ACC. Engineering and QA effort is substantially higher than an embed.
- Current feasibility: the repository already has Leaflet-based event map code
  and a GeoJSON SVG component, but only one approved geometry asset. Building an
  overview now would show an incomplete and misleading archive.

## Release gates for a future Collection embed

Before replacing or supplementing the current archive, verify all of the
following against ACC's real public Collection on desktop and a narrow mobile
viewport:

1. Every archived route is present, and meaningful variants remain separate.
2. All tracks can be understood together and overlaps remain selectable.
3. Selecting a track exposes useful details and reaches the intended Komoot
   tour rather than a login wall.
4. A Collection edit appears in the embed without rebuilding ClubHub.
5. German and English provider UI render as documented; the Chinese page has an
   acceptable English fallback and keeps ACC's Chinese labels around the embed.
6. A visible direct Collection link works when iframe loading is blocked.
7. ACC confirms account ownership, public visibility, subscription owner, and
   renewal responsibility.

## Sources

- [Komoot embed generator and FAQ](https://www.komoot.com/b2b/embed), accessed
  2026-09-08.
- [Komoot: Share and embed content](https://support.komoot.com/hc/en-us/articles/10331539580442-Share-and-embed-komoot-content),
  updated 2026-05-12 and accessed 2026-09-08.
- [Komoot: Collections](https://support.komoot.com/hc/en-us/articles/10269316327578-Collections),
  updated 2026-03-02 and accessed 2026-09-08.
