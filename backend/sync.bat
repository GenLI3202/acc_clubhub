@echo off
REM Quick sync script for Windows
REM Run this after creating/editing event markdown files

echo Syncing events from markdown to database...
python scripts/populate_events_via_api.py
pause
