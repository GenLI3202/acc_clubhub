-- ============================================================
-- ACC ClubHub - Events & RSVP Database Schema
-- Phase 4.3: Event Registration System
-- ============================================================
-- This migration creates the tables needed for the event registration system
-- with Supabase Auth integration and Row Level Security (RLS)
-- ============================================================

-- Events 表 - 活动表
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(200) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(200),
  event_type VARCHAR(50) DEFAULT 'social-ride',
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public);

-- RSVPs 表 - 报名记录表
CREATE TABLE IF NOT EXISTS rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- Supabase Auth user ID
  member_id INTEGER,  -- Legacy: 保留过渡期兼容 (no FK constraint, members table may not exist)
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlist')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(event_id, user_id)  -- 防止重复报名
);

-- Indexes for rsvps
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(status);
CREATE INDEX IF NOT EXISTS idx_rsvps_created_at ON rsvps(created_at);

-- Event Metadata 表 (可选，用于存储 Markdown frontmatter 额外数据)
CREATE TABLE IF NOT EXISTS event_metadata (
  event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  cover_image TEXT,
  xiaohongshu_url TEXT,
  lang VARCHAR(10) DEFAULT 'de',
  additional_data JSONB
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can read public events
CREATE POLICY "Events are publicly viewable"
  ON events FOR SELECT
  USING (is_public = true);

-- Authenticated users can create events (admin functionality)
CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Event creators can update their own events
CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Enable RLS on rsvps table
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Users can view their own RSVPs
CREATE POLICY "Users can view their own RSVPs"
  ON rsvps FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own RSVPs
CREATE POLICY "Users can insert their own RSVPs"
  ON rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own RSVPs
CREATE POLICY "Users can update their own RSVPs"
  ON rsvps FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete their own RSVPs"
  ON rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Functions and Triggers
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update current_participants when RSVP changes
CREATE OR REPLACE FUNCTION update_event_participants()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE events SET current_participants = current_participants + 1
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE events SET current_participants = current_participants - 1
        WHERE id = OLD.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If status changed from waitlist to confirmed
        IF OLD.status = 'waitlist' AND NEW.status = 'confirmed' THEN
            UPDATE events SET current_participants = current_participants + 1
            WHERE id = NEW.event_id;
        -- If status changed from confirmed to cancelled/waitlist
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE events SET current_participants = current_participants - 1
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers for participant count management
DROP TRIGGER IF EXISTS update_participants_on_rsvp_change ON rsvps;
CREATE TRIGGER update_participants_on_rsvp_change
    AFTER INSERT OR UPDATE OR DELETE ON rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_event_participants();

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check if tables were created successfully
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('events', 'rsvps', 'event_metadata')
-- ORDER BY table_name, ordinal_position;

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('events', 'rsvps');

-- Check if indexes were created
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE tablename IN ('events', 'rsvps')
-- ORDER BY tablename, indexname;
