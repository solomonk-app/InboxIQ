-- =============================================
-- InboxIQ Database Schema — Supabase (PostgreSQL)
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  name                  TEXT DEFAULT '',
  avatar_url            TEXT DEFAULT '',
  timezone              TEXT DEFAULT 'America/New_York',

  -- Google OAuth tokens (encrypted at rest by Supabase)
  google_access_token   TEXT,
  google_refresh_token  TEXT,
  token_expiry          TIMESTAMPTZ,

  -- Expo push notifications
  expo_push_token       TEXT,

  -- Metadata
  last_login            TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SCHEDULE PREFERENCES ────────────────────────────────────────
-- One per user, controls when and how often digests are generated
CREATE TABLE IF NOT EXISTS schedule_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  frequency             TEXT NOT NULL DEFAULT 'daily'
                        CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),

  delivery_time         TEXT NOT NULL DEFAULT '08:00',  -- HH:MM in user's timezone
  is_active             BOOLEAN DEFAULT TRUE,
  last_sent_at          TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMAIL CATEGORIES ────────────────────────────────────────────
-- Stores each email with its AI-assigned category and summary
CREATE TABLE IF NOT EXISTS email_categories (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id            TEXT NOT NULL,                  -- Gmail message ID

  -- Email metadata
  from_name             TEXT DEFAULT '',
  from_email            TEXT DEFAULT '',
  subject               TEXT DEFAULT '',
  snippet               TEXT DEFAULT '',
  email_date            TEXT,
  is_read               BOOLEAN DEFAULT FALSE,

  -- AI classification results
  category              TEXT NOT NULL DEFAULT 'other'
                        CHECK (category IN (
                          'financial', 'newsletters', 'personal',
                          'work', 'social', 'promotions', 'updates', 'other'
                        )),
  priority              TEXT DEFAULT 'medium'
                        CHECK (priority IN ('high', 'medium', 'low')),
  ai_summary            TEXT DEFAULT '',
  confidence            REAL DEFAULT 0,
  action_required       BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate emails per user
  UNIQUE(user_id, message_id)
);

-- ─── DIGEST HISTORY ──────────────────────────────────────────────
-- Stores each generated digest summary
CREATE TABLE IF NOT EXISTS digest_history (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  frequency             TEXT NOT NULL,
  total_emails          INTEGER DEFAULT 0,
  unread_count          INTEGER DEFAULT 0,

  -- AI-generated content stored as JSONB
  categories            JSONB DEFAULT '[]'::JSONB,
  highlights            JSONB DEFAULT '[]'::JSONB,
  action_items          JSONB DEFAULT '[]'::JSONB,

  generated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_email_categories_user
  ON email_categories(user_id);

CREATE INDEX IF NOT EXISTS idx_email_categories_category
  ON email_categories(user_id, category);

CREATE INDEX IF NOT EXISTS idx_email_categories_priority
  ON email_categories(user_id, priority);

CREATE INDEX IF NOT EXISTS idx_digest_history_user
  ON digest_history(user_id);

CREATE INDEX IF NOT EXISTS idx_digest_history_date
  ON digest_history(user_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_schedule_active
  ON schedule_preferences(is_active)
  WHERE is_active = TRUE;

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rows
CREATE POLICY users_self ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY schedule_self ON schedule_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY emails_self ON email_categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY digests_self ON digest_history
  FOR ALL USING (auth.uid() = user_id);

-- ─── AUTO-UPDATE updated_at TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_schedule_updated
  BEFORE UPDATE ON schedule_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
