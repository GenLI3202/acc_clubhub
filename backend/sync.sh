#!/bin/bash
# Quick sync script for Linux/Mac
# Run this after creating/editing event markdown files

echo "Syncing events from markdown to database..."
python backend/scripts/sync_events_from_markdown.py
