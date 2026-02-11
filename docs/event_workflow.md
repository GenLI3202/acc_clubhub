# Event Management Workflow

## Overview

Events in ACC ClubHub exist in **two places**:
1. **Frontend**: Markdown files in `frontend/src/content/events/[lang]/*.md`
2. **Backend**: PostgreSQL database (Neon) for registration tracking

This dual-storage is necessary because:
- Markdown = Static content (title, description, date)
- Database = Dynamic data (registrations, participant counts, seat availability)

## Current Workflow

### Creating a New Event

1. **Create markdown file**:
   ```bash
   # Create in all three languages
   frontend/src/content/events/zh/my-event.md
   frontend/src/content/events/en/my-event.md
   frontend/src/content/events/de/my-event.md
   ```

2. **Sync to database**:
   ```bash
   cd backend
   python scripts/populate_events_via_api.py
   # Or use the convenience script:
   # Windows: sync.bat
   # Linux/Mac: ./sync.sh
   ```

3. **Verify**:
   ```bash
   curl https://acc-clubhub-events-ms.vercel.app/api/events
   ```

### Automatic Sync (Production)

When you push to `main`/`master`:
- GitHub Actions automatically runs the sync script
- Events are synced to production database
- No manual intervention needed

See: `.github/workflows/sync-events.yml`

## Limitations

⚠️ **Manual sync required during development**
- If you create an event on a feature branch, it won't be synced automatically
- You must run `python scripts/populate_events_via_api.py` manually
- Or wait until you merge to main and let GitHub Actions handle it

## Future Improvements

Consider:
1. **Unified CMS**: Use a headless CMS for both content and registration
2. **Database-first**: Create events via admin panel, auto-generate markdown
3. **Git hooks**: Use pre-push hooks to auto-sync locally

## Troubleshooting

### "Event not found" error in frontend
→ Run the sync script to populate the database

### "Event already exists" during sync
→ This is normal, the script updates existing events

### Backend API returns 500
→ Check backend logs: `vercel logs acc-clubhub-events-ms`
