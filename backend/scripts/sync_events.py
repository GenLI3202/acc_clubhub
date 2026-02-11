"""
Sync events from frontend markdown files to database
Run this script to populate the database with events from content collection
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add parent directory to path to import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from models import Event


def parse_event_from_markdown(file_path: Path) -> dict:
    """Parse event data from markdown frontmatter"""
    import re

    content = file_path.read_text(encoding='utf-8')

    # Extract frontmatter (between --- and ---)
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not frontmatter_match:
        return None

    frontmatter = frontmatter_match.group(1)

    # Parse frontmatter fields
    data = {}
    for line in frontmatter.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            data[key.strip()] = value.strip()

    return {
        'slug': data.get('slug', ''),
        'title': data.get('title', ''),
        'description': data.get('description', ''),
        'location': data.get('location', ''),
        'event_date': data.get('date', ''),
        'event_type': data.get('eventType', 'social-ride'),
    }


def sync_events():
    """Sync all events from markdown to database"""
    db = SessionLocal()

    try:
        # Path to frontend events directory
        frontend_dir = Path(__file__).parent.parent.parent / 'frontend'
        events_dir = frontend_dir / 'src' / 'content' / 'events'

        if not events_dir.exists():
            print(f"❌ Events directory not found: {events_dir}")
            return

        print(f"📂 Reading events from: {events_dir}")

        synced_count = 0
        skipped_count = 0

        # Iterate through language directories
        for lang_dir in events_dir.iterdir():
            if not lang_dir.is_dir():
                continue

            lang = lang_dir.name
            print(f"\n🌍 Processing language: {lang}")

            # Process each markdown file
            for md_file in lang_dir.glob('*.md'):
                try:
                    event_data = parse_event_from_markdown(md_file)

                    if not event_data or not event_data['slug']:
                        print(f"  ⚠️  Skipping {md_file.name}: Invalid frontmatter")
                        skipped_count += 1
                        continue

                    slug = event_data['slug']

                    # Check if event already exists
                    existing = db.query(Event).filter(Event.slug == slug).first()

                    if existing:
                        # Update existing event (but keep participant counts)
                        existing.title = event_data['title']
                        existing.description = event_data['description']
                        existing.location = event_data['location']
                        existing.event_type = event_data['event_type']
                        # Parse date if it's a string
                        if event_data['event_date']:
                            try:
                                existing.event_date = datetime.fromisoformat(event_data['event_date']).replace(tzinfo=timezone.utc)
                            except:
                                pass

                        print(f"  ♻️  Updated: {slug}")
                    else:
                        # Create new event
                        event_date = datetime.fromisoformat(event_data['event_date']).replace(tzinfo=timezone.utc)

                        new_event = Event(
                            slug=slug,
                            title=event_data['title'],
                            description=event_data['description'],
                            event_date=event_date,
                            location=event_data['location'],
                            event_type=event_data['event_type'],
                            max_participants=20,  # Default value
                            current_participants=0,
                            is_public=True
                        )

                        db.add(new_event)
                        print(f"  ✅ Created: {slug}")

                    synced_count += 1

                except Exception as e:
                    print(f"  ❌ Error processing {md_file.name}: {e}")
                    skipped_count += 1

        # Commit all changes
        db.commit()

        print(f"\n{'='*50}")
        print(f"✨ Sync complete!")
        print(f"  • Synced: {synced_count} events")
        print(f"  • Skipped: {skipped_count} events")
        print(f"{'='*50}")

    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == '__main__':
    # Set UTF-8 encoding for Windows console
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')

    print("Starting event sync...")
    sync_events()
