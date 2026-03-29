# ACC ClubHub — Maintenance Guide

Quick reference for maintainers. Covers database queries, publishing events, email, domains, and deployment.

**Live site:** [www.accross-cc.de](https://www.accross-cc.de) · **API + Swagger:** [acc-clubhub-events-ms.vercel.app/docs](https://acc-clubhub-events-ms.vercel.app/docs)

---

## 1. Database Access

**Provider:** Neon Postgres — [console.neon.tech](https://console.neon.tech)

Log in → select project `acc-clubhub` (or similar) → **SQL Editor** tab.

The connection string is stored as `DATABASE_URL` in the Vercel backend project:
Vercel → `acc-clubhub-backend` → Settings → Environment Variables.

---

## 2. Common SQL Queries

### View all active subscribers

```sql
SELECT id, name, email, lang, subscribed_at
FROM subscribers
WHERE is_active = true
ORDER BY subscribed_at DESC;
```

### Count subscribers by language

```sql
SELECT lang, COUNT(*) AS total
FROM subscribers
WHERE is_active = true
GROUP BY lang;
```

### View RSVPs for a specific event

```sql
SELECT r.name, r.email, r.status, r.created_at
FROM rsvps r
JOIN events e ON r.event_id = e.id
WHERE e.slug = 'summer-alps-2025'   -- replace with actual slug
ORDER BY r.created_at;
```

### View all events with participant counts

```sql
SELECT slug, title, event_date, max_participants, current_participants, registration_deadline
FROM events
ORDER BY event_date DESC;
```

### View confirmed RSVPs for all upcoming events

```sql
SELECT e.title, e.event_date, r.name, r.email, r.status
FROM rsvps r
JOIN events e ON r.event_id = e.id
WHERE e.event_date > NOW()
  AND r.status = 'confirmed'
ORDER BY e.event_date, r.created_at;
```

### View waitlist for an event

```sql
SELECT r.name, r.email, r.created_at,
       ROW_NUMBER() OVER (ORDER BY r.created_at) AS waitlist_position
FROM rsvps r
JOIN events e ON r.event_id = e.id
WHERE e.slug = 'summer-alps-2025'   -- replace with actual slug
  AND r.status = 'waitlist';
```

### Manually cancel an RSVP

```sql
UPDATE rsvps SET status = 'cancelled'
WHERE email = 'user@example.com'
  AND event_id = (SELECT id FROM events WHERE slug = 'summer-alps-2025');
```

---

## 3. Publishing a New Event

Events are managed entirely through the CMS — no SQL required. Or one can simply add a new markdown file in the `docs/events` folder.

> **Template:** `docs/content-templates/events.md` — copy this file when creating a new event.

### Steps

1. Go to `/admin` on the frontend site (requires GitHub OAuth)
2. Navigate to **Events** → **New Event**
3. Fill in the frontmatter fields:

| Field                    | Required    | Notes                                                            |
| ------------------------ | ----------- | ---------------------------------------------------------------- |
| `title`                | ✅          | Event name (shown in form + emails)                              |
| `date`                 | ✅          | ISO format e.g.`2026-04-19`                                    |
| `location`             | ✅          | Shown in confirmation email                                      |
| `slug`                 | ✅          | URL path, e.g.`spring-classic-2026`                            |
| `eventType`            | ✅          | `social-ride` · `training-camp` · `race` · `workshop` |
| `displaySection`       | ✅          | Where this event appears on the events page — see table below   |
| `coverImage`           | recommended | Path to hero image e.g.`/images/uploads/photo.jpg`             |
| `maxParticipants`      | optional    | Leave blank for unlimited                                        |
| `registrationDeadline` | optional    | ISO date; registration form closes after this date               |
| `author`               | optional    | Defaults to `"ACC Club"`                                       |

**`displaySection` values:**

| Value        | Where it appears                                  | When to use                              |
| ------------ | ------------------------------------------------- | ---------------------------------------- |
| `hero`     | Full-width carousel at the top of the events page | Flagship events only — keep to 2–3 max |
| `upcoming` | Upcoming events card grid                         | Default for most events                  |
| `regular`  | Weekly Regulars compact list                      | Recurring social rides                   |

> Past events (date < today) always appear in the **Past Archive** section regardless of `displaySection`.
> Registration is automatically disabled on past events — no manual action needed.

**`eventType`** controls the badge colour/label only (training-camp, race, workshop, social-ride). It is independent of `displaySection`.

1. Save → Sveltia CMS commits to GitHub → Vercel rebuilds automatically (~2 min)

The event page is live at `/zh/events/[slug]` (and `/en/`, `/de/` variants).

**Important:** The first RSVP submission automatically creates the event record in the database. No manual SQL needed.

---

## 4. Email Subscriptions

### How subscribers are collected

- Via the RSVP form: users tick "订阅 ACC 活动通知" before submitting
- Via the standalone subscribe form (if present on the site)

### What is NOT yet automated

> **New event notifications are not sent automatically.**
> When you publish a new event, subscribers do **not** receive an email automatically.
> This feature (broadcast on publish) is planned but not yet implemented.

### Manually sending a newsletter / event announcement

Not yet available in the admin UI. As a workaround, export subscriber emails from Neon SQL Editor and use Resend's broadcast feature manually:

1. Run the query in Section 2 to get active subscriber emails
2. Log in to [resend.com](https://resend.com) → **Broadcasts** (if on a paid plan)
3. Or export CSV and send via your preferred email tool

### Unsubscribe

Each subscriber has a unique `unsubscribe_token`. The unsubscribe link format is:

```
https://acc-clubhub-events-ms.vercel.app/api/unsubscribe/{token}
```

This is a GET request — clicking the link deactivates the subscriber instantly, no login required.

---

## 5. API Endpoints (Backend)

Base URL: `https://acc-clubhub-events-ms.vercel.app`
Interactive docs: [acc-clubhub-events-ms.vercel.app/docs](https://acc-clubhub-events-ms.vercel.app/docs)

| Method | Path                                | Description                            |
| ------ | ----------------------------------- | -------------------------------------- |
| GET    | `/`                               | Health check / API info                |
| GET    | `/health`                         | Detailed health status                 |
| GET    | `/docs`                           | Interactive API docs (Swagger)         |
| POST   | `/api/rsvp`                       | Submit event registration (CMS-driven) |
| POST   | `/api/subscribe`                  | Subscribe to event notifications       |
| GET    | `/api/unsubscribe/{token}`        | Unsubscribe via token                  |
| GET    | `/api/events/{id}/rsvps`          | List RSVPs for an event (admin)        |
| DELETE | `/api/events/{id}/rsvp?email=...` | Cancel an RSVP                         |

The interactive Swagger UI at `/docs` lets you test all endpoints in the browser.

---

## 6. Deployment

### Frontend (Astro)

- **Live URL:** [www.accross-cc.de](https://www.accross-cc.de)
- **Vercel project:** `acc-clubhub`
- **GitHub repo:** `GenLI3202/acc_clubhub`
- Auto-deploys on push to `master`; CMS edits also trigger deploys via GitHub commit

### Backend (FastAPI)

- **Live URL:** [acc-clubhub-events-ms.vercel.app](https://acc-clubhub-events-ms.vercel.app)
- **Vercel project:** `acc-clubhub-backend`
- Auto-deploys on push to `master`
- Entry point: `backend/app.py`

### Environment Variables

| Variable            | Project  | Purpose                                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | backend  | Neon Postgres — includes `?sslmode=require` (stripped at runtime by `database.py`) |
| `RESEND_API_KEY`  | backend  | Resend email API key                                                                    |
| `ALLOWED_ORIGINS` | backend  | CORS allowed origins (comma-separated)                                                  |
| `PUBLIC_API_URL`  | frontend | Backend base URL                                                                        |

### To redeploy manually

Push any commit to `master`, or: Vercel → project → **Deployments** → **Redeploy**.

---

## 7. Domain & DNS

All DNS is managed at **IONOS** ([ionos.de](https://ionos.de)) → Domains & SSL → `accross-cc.de` → DNS tab.

| Record        | Type  | Hostname                     | Value                                     | Purpose               |
| ------------- | ----- | ---------------------------- | ----------------------------------------- | --------------------- |
| Site (apex)   | A     | `@`                        | `216.198.79.1`                          | Vercel frontend       |
| Site (www)    | CNAME | `www`                      | `dfc7627abbb7145b.vercel-dns-017.com.`  | Vercel frontend       |
| Email DKIM    | TXT   | `resend._domainkey.events` | `p=MIGfMA0G...`                         | Resend signing        |
| Email SPF MX  | MX    | `send.events`              | `feedback-smtp.eu-west-1.amazonses.com` | Resend bounce routing |
| Email SPF TXT | TXT   | `send.events`              | `v=spf1 include:amazonses.com ~all`     | Resend sending auth   |

## 8. Email Configuration

- **Provider:** Resend ([resend.com](https://resend.com)) — sending domain `events.accross-cc.de` (verified)
- **From address:** `noreply@events.accross-cc.de`
- **Language:** Always English, regardless of registrant's UI language

Emails sent automatically:

- Confirmed RSVP → confirmation email to registrant
- Waitlist RSVP → waitlist position notification to registrant

> New event announcements to subscribers are **not yet automated** — see Section 4 and Issue [#51](https://github.com/GenLI3202/acc_clubhub/issues/51).

---

## 9. Frontend Design System

The site uses a **hand-rolled CSS custom-property system** (no Tailwind). All design tokens live in:

```
frontend/src/styles/variables.css   ← all tokens (colours, spacing, radius, shadows)
frontend/src/styles/global.css      ← base resets + shared layout classes
frontend/src/styles/components/     ← buttons.css, cards.css
```

Key tokens:

| Token                   | Value       | Usage                        |
| ----------------------- | ----------- | ---------------------------- |
| `--color-accent`      | `#C62828` | Wine-red primary CTA colour  |
| `--color-accent-dark` | `#a81f1f` | Hover state for accent       |
| `--color-bg-canvas`   | `#FFFFFF` | Page background              |
| `--color-primary`     | `#1A1A1A` | Dark text / dark backgrounds |
| `--color-border`      | `#E5E7EB` | Dividers, card borders       |

**Transparent header:** Pages pass `headerTransparent={true}` to `BaseLayout`. The header uses `position: fixed` and `background: transparent` until the user scrolls 40px, then transitions to white with blur. Currently used on: homepage (`/[lang]/index.astro`) and events index (`/[lang]/events/index.astro`).

---

## 10. Content Authoring Guide

Each content collection has a `_template.md` that lists every available field with comments. **Copy the template** when creating new content — do not reverse-engineer from existing files.

| Collection         | Template path                                    | URL pattern                           |
| ------------------ | ------------------------------------------------ | ------------------------------------- |
| Events             | `docs/content-templates/events.md`             | `/[lang]/events/[slug]`             |
| Gear knowledge     | `docs/content-templates/knowledge-gear.md`     | `/[lang]/knowledge/gear/[slug]`     |
| Training knowledge | `docs/content-templates/knowledge-training.md` | `/[lang]/knowledge/training/[slug]` |
| Media              | `docs/content-templates/media.md`              | `/[lang]/media/[slug]`              |
| Routes             | `docs/content-templates/routes.md`             | `/[lang]/routes/[slug]`             |

### File naming

- Use **kebab-case** for file names: `spring-classic-2026.md`
- Multilingual content: create the same file in `zh/`, `en/`, and `de/` subdirectories with the same filename
- The `slug` field in frontmatter must match across all language versions

### Draft workflow

Set `status: draft` to hide content from the live site without deleting it. Switch to `status: published` when ready. The CMS **draft** toggle maps to this field.

---

## 11. Planned Features (not yet implemented)

- [ ] Auto-broadcast to subscribers when new event is published (Issue [#51](https://github.com/GenLI3202/acc_clubhub/issues/51))
- [ ] Admin UI for subscriber management (Issue [#53](https://github.com/GenLI3202/acc_clubhub/issues/53))
- [ ] Dark mode (`prefers-color-scheme: dark`) (Issue [#55](https://github.com/GenLI3202/acc_clubhub/issues/55))
- [ ] Phase 4.4 — Authentication
