# ACC ClubHub — Maintenance Guide

Quick reference for maintainers. Covers database queries, publishing events, email subscriptions, and deployment.

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

Events are managed entirely through the CMS — no SQL required.

### Steps

1. Go to `/admin` on the frontend site (requires GitHub OAuth)
2. Navigate to **Events** → **New Event**
3. Fill in the frontmatter fields:

| Field | Required | Notes |
|-------|----------|-------|
| `title` | ✅ | Event name (shown in form + emails) |
| `date` | ✅ | ISO format e.g. `2025-08-15T09:00:00` |
| `location` | ✅ | Shown in confirmation email |
| `slug` | ✅ | URL path, e.g. `summer-alps-2025` |
| `eventType` | ✅ | e.g. `social-ride`, `training-camp`, `race` |
| `maxParticipants` | optional | Leave blank for unlimited |
| `registrationDeadline` | optional | ISO format; form closes after this date |

4. Save → Sveltia CMS commits to GitHub → Vercel rebuilds automatically (~2 min)

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

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check / API info |
| GET | `/health` | Detailed health status |
| GET | `/docs` | Interactive API docs (Swagger) |
| POST | `/api/rsvp` | Submit event registration (CMS-driven) |
| POST | `/api/subscribe` | Subscribe to event notifications |
| GET | `/api/unsubscribe/{token}` | Unsubscribe via token |
| GET | `/api/events/{id}/rsvps` | List RSVPs for an event (admin) |
| DELETE | `/api/events/{id}/rsvp?email=...` | Cancel an RSVP |

The interactive Swagger UI at `/docs` lets you test all endpoints in the browser.

---

## 6. Deployment

### Frontend (Astro)

- Repo: `acc-clubhub` on GitHub
- Vercel project: `acc-clubhub`
- Auto-deploys on push to `master`
- CMS edits also auto-trigger a deploy via GitHub commit

### Backend (FastAPI)

- Vercel project: `acc-clubhub-backend`
- Auto-deploys on push to `master`
- Entry point: `backend/app.py`

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Vercel backend | Neon Postgres connection string |
| `RESEND_API_KEY` | Vercel backend | Resend email API key |
| `ALLOWED_ORIGINS` | Vercel backend | CORS allowed origins |
| `PUBLIC_API_URL` | Vercel frontend | Backend base URL |

### To redeploy manually

Push any commit to `master`, or go to Vercel → project → **Deployments** → **Redeploy**.

---

## 7. Email Configuration

- **Provider:** Resend ([resend.com](https://resend.com))
- **Sending domain:** `events.accross-cc.de` (verified via IONOS DNS)
- **From address:** `noreply@events.accross-cc.de`
- **Domain DNS managed at:** IONOS ([ionos.de](https://ionos.de))

Emails sent on:
- Confirmed RSVP → confirmation email to registrant
- Waitlist RSVP → waitlist notification to registrant

Emails are multilingual (zh / en / de) based on the `lang` field submitted with the RSVP.

---

## 8. Planned Features (not yet implemented)

- [ ] Auto-broadcast to subscribers when new event is published
- [ ] Admin UI for subscriber management
- [ ] Event UI redesign (featured events hero, weekly regulars grid)
- [ ] Phase 4.4 — Authentication
