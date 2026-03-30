# Sub-Plan: Participant Portal

> Part of #53 — Admin Dashboard MVP
> Status: IN PROGRESS — Backend complete, frontend integrated

## Scope

Token-based portal allowing event registrants to view the participant list for events they've signed up for.

MVP includes:
- ✅ Add `view_token` to RSVP model
- ✅ Generate token on RSVP creation
- ✅ New `/api/events/{slug}/participant?token=xxx` endpoint (uses slug, not id)
- ✅ Confirmation/waitlist emails include portal link
- ✅ Event detail page shows participant list when valid token present

---

## Implementation Steps

### Phase A: Database & Model Changes

**1. Add `view_token` to RSVP model**

File: `backend/models.py`

```python
class RSVP(Base):
    # ... existing fields ...
    view_token = Column(String(64), nullable=True, index=True)  # NEW
```

**2. Generate token on RSVP creation**

Files: `backend/routes/rsvp.py`

In both `create_rsvp()` and `create_rsvp_v2()`:
```python
new_rsvp = RSVP(
    # ... existing fields ...
    view_token=secrets.token_urlsafe(32),  # NEW
)
```

---

### Phase B: New Participant Endpoint

**3. Create `/api/events/{event_id}/participant` endpoint**

File: `backend/routes/rsvp.py`

```python
@router.get("/api/events/{event_id}/participant")
def get_participant_view(
    event_id: int,
    token: str,
    db: Session = Depends(get_db),
) -> dict:
    """View event participant list with RSVP token (no login required)."""
    # Validate token
    rsvp = db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.view_token == token,
    ).first()

    if not rsvp:
        raise HTTPException(status_code=401, detail="Invalid token")

    if rsvp.status == "cancelled":
        raise HTTPException(status_code=401, detail="Registration was cancelled")

    # Get event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get confirmed participants (names only)
    confirmed_rsvps = db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.status == "confirmed",
    ).order_by(RSVP.created_at).all()

    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "location": event.location,
            "slug": event.slug,
        },
        "participants": [
            {"name": r.name, "created_at": r.created_at.isoformat()}
            for r in confirmed_rsvps
        ],
        "total_confirmed": len(confirmed_rsvps),
        "your_status": rsvp.status,
    }
```

---

### Phase C: Email Integration

**4. Add portal link to confirmation email**

File: `backend/services/email.py`

In `send_confirmation_email()`, add to email body:
```
participant_link = f"{PUBLIC_FRONTEND_URL}/{lang}/events/{event_slug}?token={view_token}"
```

Note: `send_confirmation_email()` currently doesn't receive `event_slug` or `view_token`. Need to add these parameters.

**5. Add portal link to waitlist email**

Same in `send_waitlist_email()`.

---

### Phase D: Frontend Integration

**6. Enable SSR for event detail page**

File: `frontend/astro.config.mjs`
```js
output: 'hybrid',  // was 'static'
```

File: `frontend/src/pages/[lang]/events/[slug].astro`
```astro
---
export const prerender = false;  // SSR for this page
---
```

**7. Add participant list section**

In `[lang]/events/[slug].astro`, add server-side token check:

```astro
---
const token = Astro.url.searchParams.get('token');

if (token) {
  // Fetch participant data from API
  const apiUrl = import.meta.env.PUBLIC_API_URL;
  const res = await fetch(`${apiUrl}/api/events/${entry.data.slug}/participant?token=${token}`);
  if (res.ok) {
    const data = await res.json();
    // Pass to template
    participantData = data;
  }
}
---

{participantData && (
  <section class="participant-list">
    <h3>Participants ({participantData.total_confirmed})</h3>
    <ul>
      {participantData.participants.map(p => (
        <li>{p.name}</li>
      ))}
    </ul>
  </section>
)}
```

---

## Verification

1. Register for an event → confirmation email arrives with `?token=xxx` link
2. Visit link with valid token → see participant list with names
3. Visit link with invalid token → normal event page (no participant list)
4. Visit link after cancelling → error "Registration was cancelled"
5. Waitlisted user also receives token → can see who's already confirmed

---

## Notes

- `PUBLIC_FRONTEND_URL` env var must be set to `https://www.accross-cc.de` in Vercel
- The token link is per-RSV, not per-subscriber. If same email registers for multiple events, each gets a different token.
- If user cancels and re-registers, they get a new token, old one is invalidated (status=cancelled check)
