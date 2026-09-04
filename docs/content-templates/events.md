---
# REQUIRED FIELDS
slug: my-event-slug          # URL path: /[lang]/events/[slug] — use kebab-case, same across all languages
title: Event Title
location: Meeting point / venue
date: 2026-06-01             # ISO date YYYY-MM-DD

# DISPLAY SECTIONS — controls which parts of the events page this event appears in
# 'hero'     → featured carousel at the top (use for 2-3 flagship events max)
# 'upcoming' → upcoming events card grid (default for most events)
# 'regular'  → weekly regulars compact list (use for recurring social rides)
# Note: events with date < today automatically appear in Past Archive, regardless of this field.
displaySections:
  - upcoming

# EVENT TYPE — used for badge display only, does not affect layout
# social-ride | training-camp | race | workshop
eventType: training-camp

# OPTIONAL FIELDS
description: Short one-sentence description shown in cards and meta tags.
author: ACC Club            # defaults to 'ACC Club' if omitted

# ASSETS — place files under public/images/events/{slug}/ before referencing here
# cover image:  public/images/events/{slug}/cover.jpg
# wechat QR:    public/images/events/{slug}/wechat-qr.png
# gallery:      public/images/events/{slug}/gallery/01-descriptor.jpg
cover: /images/events/{slug}/cover.jpg
wechatQrCode: /images/events/{slug}/wechat-qr.png   # optional, omit if no QR

maxParticipants: 30         # omit for unlimited
registrationDeadline: 2026-05-25   # ISO date; registration form closes after this date
status: published           # draft | published (drafts are hidden from the site)
---

Event description body goes here. Keep it concise — one short paragraph is enough for the listing.
Full details can follow below if needed.

## Publishing checklist

- Keep the same `slug` in `zh`, `en`, and `de`; publish all three language
  entries together when the event is publicly visible.
- Set `status: published`. A draft is intentionally hidden.
- Use `displaySections` as the canonical placement field. Add `hero` only for
  a deliberate homepage feature; use `upcoming` for the normal event list.
- Use `cover`; the content schema maps it to the normalized `coverImage` value
  consumed by existing event cards and hero components.
- Omit optional values such as `maxParticipants` and
  `registrationDeadline` when unknown. Do not write `null` or an empty date.
- Run `npm run check` and `npm run build` from `frontend/` before publishing.

## Komoot embed

Use one responsive iframe pattern when a visible route embed is needed:

```html
<iframe
  src="https://www.komoot.com/tour/TOUR_ID/embed?profile=1"
  width="100%"
  height="700"
  frameborder="0"
  scrolling="no"
  loading="lazy"
  title="Route map on Komoot"
></iframe>
```

The article layout constrains Komoot embeds on desktop and mobile. Also set
`routeKomootUrl` in frontmatter when the registration flow should expose the
route link independently from the article body.
