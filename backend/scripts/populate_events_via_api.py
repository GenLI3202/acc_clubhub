"""
Populate events in production database via API
This script reads events from markdown and creates them via the backend API
"""

import sys
import json
import requests
from pathlib import Path
from datetime import datetime

# API base URL (production)
API_BASE_URL = "https://acc-clubhub-events-ms.vercel.app"


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


def create_event_via_api(event_data: dict):
    """Create event via API"""
    # Convert date string to ISO format
    event_date = datetime.fromisoformat(event_data['event_date']).isoformat()

    payload = {
        'slug': event_data['slug'],
        'title': event_data['title'],
        'description': event_data['description'],
        'event_date': event_date,
        'location': event_data['location'],
        'event_type': event_data['event_type'],
        'max_participants': 30  # Default value
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/events",
            json=payload,
            timeout=10
        )

        if response.status_code == 200:
            return True, "Created"
        elif response.status_code == 400 and 'already exists' in response.text:
            return False, "Already exists"
        else:
            return False, f"Error: {response.status_code} - {response.text}"

    except Exception as e:
        return False, f"Exception: {e}"


def main():
    """Main function"""
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')

    print("Starting event population via API...")
    print(f"Target: {API_BASE_URL}")
    print("=" * 50)

    # Path to frontend events directory
    script_dir = Path(__file__).parent
    frontend_dir = script_dir.parent.parent / 'frontend'
    events_dir = frontend_dir / 'src' / 'content' / 'events'

    if not events_dir.exists():
        print(f"Error: Events directory not found: {events_dir}")
        return

    created_count = 0
    skipped_count = 0
    error_count = 0

    # Process only Chinese events (to avoid duplicates)
    lang_dir = events_dir / 'zh'

    if not lang_dir.exists():
        print(f"Error: Chinese events directory not found: {lang_dir}")
        return

    print(f"\nProcessing Chinese events from: {lang_dir}")

    for md_file in lang_dir.glob('*.md'):
        try:
            event_data = parse_event_from_markdown(md_file)

            if not event_data or not event_data['slug']:
                print(f"  Skip: {md_file.name} (invalid frontmatter)")
                skipped_count += 1
                continue

            slug = event_data['slug']
            print(f"\n  Processing: {slug}")

            success, message = create_event_via_api(event_data)

            if success:
                print(f"    OK: {message}")
                created_count += 1
            elif "already exists" in message.lower():
                print(f"    Info: {message}")
                skipped_count += 1
            else:
                print(f"    Error: {message}")
                error_count += 1

        except Exception as e:
            print(f"  Error processing {md_file.name}: {e}")
            error_count += 1

    print("\n" + "=" * 50)
    print("Summary:")
    print(f"  Created: {created_count} events")
    print(f"  Skipped: {skipped_count} events")
    print(f"  Errors: {error_count} events")
    print("=" * 50)


if __name__ == '__main__':
    main()
