-- ============================================================
-- ACC ClubHub - Events, RSVP & Subscription Database Schema
-- Phase 4.3: Email-based Event Registration System
-- ============================================================
-- Database: Neon (Vercel Postgres)
-- Auth: Email-based (no OAuth required)
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

-- RSVPs 表 - 报名记录表 (Email-based, 不需要 OAuth)
CREATE TABLE IF NOT EXISTS rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'waitlist')),
  notes TEXT,
  privacy_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(event_id, email)  -- 同一邮箱只能报名一次同一活动
);

-- Indexes for rsvps
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_email ON rsvps(email);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(status);

-- Subscribers 表 - 活动订阅者
CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  lang VARCHAR(10) DEFAULT 'zh',
  privacy_accepted BOOLEAN DEFAULT false,
  unsubscribe_token VARCHAR(64) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(unsubscribe_token);

-- Event Metadata 表 (可选，用于存储 Markdown frontmatter 额外数据)
CREATE TABLE IF NOT EXISTS event_metadata (
  event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  cover_image TEXT,
  xiaohongshu_url TEXT,
  lang VARCHAR(10) DEFAULT 'de',
  additional_data JSONB
);

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
        IF OLD.status = 'waitlist' AND NEW.status = 'confirmed' THEN
            UPDATE events SET current_participants = current_participants + 1
            WHERE id = NEW.event_id;
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

-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('events', 'rsvps', 'subscribers', 'event_metadata')
-- ORDER BY table_name, ordinal_position;
