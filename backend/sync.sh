#!/bin/bash
# Quick sync script for Linux/Mac
# Run this after creating/editing event markdown files

echo "Syncing events from markdown to database..."
python scripts/populate_events_via_api.py
