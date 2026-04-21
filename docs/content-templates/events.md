---
# REQUIRED FIELDS
slug: my-event-slug          # URL path: /[lang]/events/[slug] — use kebab-case, same across all languages
title: Event Title
location: Meeting point / venue
date: 2026-06-01             # ISO date YYYY-MM-DD

# DISPLAY SECTION — controls which part of the events page this event appears in
# 'hero'     → featured carousel at the top (use for 2-3 flagship events max)
# 'upcoming' → upcoming events card grid (default for most events)
# 'regular'  → weekly regulars compact list (use for recurring social rides)
# Note: events with date < today automatically appear in Past Archive, regardless of this field.
displaySection: upcoming

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
