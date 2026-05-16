-- Migration 009: Track the single active dashboard admin session
CREATE TABLE IF NOT EXISTS admin_session_state (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'dashboard',
    active_session_id VARCHAR(128) NOT NULL,
    active_email VARCHAR(255) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
