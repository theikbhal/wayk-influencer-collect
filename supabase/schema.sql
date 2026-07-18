-- Run this in Supabase SQL Editor
-- Adds new tables + extends ig_accounts for the influencer collector

-- ============================================================
-- TARGET ACCOUNTS: Instagram accounts whose followers we collect
-- ============================================================
CREATE TABLE IF NOT EXISTS target_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  followers_count BIGINT DEFAULT 0,
  following_count INT DEFAULT 0,
  posts_count INT DEFAULT 0,
  bio TEXT,
  profile_pic_url TEXT,
  full_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  notes TEXT,
  scrape_status TEXT DEFAULT 'pending',
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COLLECTED FOLLOWERS: Extend ig_accounts with follow workflow
-- ============================================================
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS target_id UUID REFERENCES target_accounts(id) ON DELETE SET NULL;
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS follow_status TEXT DEFAULT 'pending_review' 
  CHECK (follow_status IN ('pending_review','approved','followed','skipped','unfollowed'));
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS followed_at TIMESTAMPTZ;
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- EXTENSION STATE: Chrome extension sync state
-- ============================================================
CREATE TABLE IF NOT EXISTS extension_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOLLOW ACTIONS: Audit log of follow/unfollow actions
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES ig_accounts(id) ON DELETE CASCADE,
  target_id UUID REFERENCES target_accounts(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('follow','unfollow','approve','skip','review')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ig_accounts_target_id ON ig_accounts (target_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_follow_status ON ig_accounts (follow_status);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_followers ON ig_accounts (followers DESC);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_collected_at ON ig_accounts (collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_target_accounts_username ON target_accounts (username);
CREATE INDEX IF NOT EXISTS idx_follow_actions_account_id ON follow_actions (account_id);
CREATE INDEX IF NOT EXISTS idx_follow_actions_created_at ON follow_actions (created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (allow anon for now)
-- ============================================================
ALTER TABLE target_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON target_accounts;
CREATE POLICY "Allow all" ON target_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON follow_actions;
CREATE POLICY "Allow all" ON follow_actions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON extension_state;
CREATE POLICY "Allow all" ON extension_state FOR ALL USING (true) WITH CHECK (true);

-- Re-apply on ig_accounts just in case
DROP POLICY IF EXISTS "Allow all" ON ig_accounts;
CREATE POLICY "Allow all" ON ig_accounts FOR ALL USING (true) WITH CHECK (true);
