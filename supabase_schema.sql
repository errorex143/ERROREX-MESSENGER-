-- ====================================================================
-- ERROREX SOVEREIGN MESSENGER & VAULT - SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe & Idempotent: Works on both fresh projects and existing tables
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop any legacy foreign keys linking public tables to auth.users
-- (Allows seamless profile registration even when email confirmation or custom auth flows are used)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid::regclass::text IN (
        'user_profiles', 'public.user_profiles',
        'user_credentials', 'public.user_credentials',
        'friendships', 'public.friendships',
        'friend_requests', 'public.friend_requests',
        'conversations', 'public.conversations',
        'messages', 'public.messages',
        'statuses', 'public.statuses'
      )
      AND confrelid = 'auth.users'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. User Profiles Table (Website Members Directory)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  bio TEXT DEFAULT 'Available on ERROREX',
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS uid TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Available on ERROREX';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill any existing profile rows where uid was left NULL
UPDATE public.user_profiles SET uid = id::text WHERE uid IS NULL OR uid = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(uid)%'
  ) THEN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_uid_unique UNIQUE (uid);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Sovereign Vault & Calculator 8-Digit Secret PIN + Cross-Device Credentials Table
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL DEFAULT '',
  salt TEXT NOT NULL DEFAULT '',
  has_pin BOOLEAN DEFAULT false,
  auth_hash TEXT DEFAULT '',
  auth_salt TEXT DEFAULT '',
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS uid TEXT;
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS pin_hash TEXT DEFAULT '';
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS salt TEXT DEFAULT '';
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS has_pin BOOLEAN DEFAULT false;
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS auth_hash TEXT DEFAULT '';
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS auth_salt TEXT DEFAULT '';
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE public.user_credentials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_credentials'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(uid)%'
  ) THEN
    ALTER TABLE public.user_credentials ADD CONSTRAINT user_credentials_uid_unique UNIQUE (uid);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Friendships Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.friendships'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%user_a, user_b%'
  ) THEN
    ALTER TABLE public.friendships ADD CONSTRAINT friendships_pair_unique UNIQUE (user_a, user_b);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Friend Requests Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  sender_photo TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_status_check;
ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

-- 7. Encrypted Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  group_photo TEXT,
  participants JSONB DEFAULT '[]'::jsonb,
  participant_details JSONB DEFAULT '{}'::jsonb,
  last_message_text TEXT,
  last_message_sender_id TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INT DEFAULT 0,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_photo TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS participant_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_text TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_sender_id TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Relax legacy NOT NULL constraint on conversations.created_by if present
ALTER TABLE public.conversations ALTER COLUMN created_by DROP NOT NULL;

-- 8. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  media_type TEXT DEFAULT 'none' CHECK (media_type IN ('none', 'text', 'image', 'video', 'audio', 'file', 'document')),
  media_url TEXT,
  audio_duration INT,
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read')),
  read_by JSONB DEFAULT '[]'::jsonb,
  reactions JSONB DEFAULT '{}'::jsonb,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_for JSONB DEFAULT '[]'::jsonb,
  deleted_for_everyone BOOLEAN DEFAULT false,
  reply_to_message_id TEXT,
  reply_to_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_media_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_media_type_check CHECK (media_type IN ('none', 'text', 'image', 'video', 'audio', 'file', 'document'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_message_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_text TEXT;

-- 9. 24-Hour Statuses & Stories Table
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_photo TEXT DEFAULT '',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video')),
  status_type TEXT DEFAULT 'text',
  text TEXT,
  media_url TEXT,
  bg_color TEXT DEFAULT '#0F172A',
  caption TEXT,
  viewers JSONB DEFAULT '[]'::jsonb,
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS status_type TEXT DEFAULT 'text';
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS viewers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
ALTER TABLE public.statuses ALTER COLUMN status_type DROP NOT NULL;

-- 10. Indexes for High-Speed Queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_uid ON public.user_profiles(uid);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower ON public.user_profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_conversations_participants_gin ON public.conversations USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON public.statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON public.statuses(expires_at);

-- 11. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- 12. Open Sovereign Policies (Drop & recreate cleanly so re-running SQL is idempotent)
DROP POLICY IF EXISTS "Public Profiles Read" ON public.user_profiles;
DROP POLICY IF EXISTS "Public Profiles Insert" ON public.user_profiles;
DROP POLICY IF EXISTS "Public Profiles Update" ON public.user_profiles;
DROP POLICY IF EXISTS "Public Profiles All" ON public.user_profiles;
CREATE POLICY "Public Profiles All" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Messages Access" ON public.messages;
CREATE POLICY "Public Messages Access" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Conversations Access" ON public.conversations;
CREATE POLICY "Public Conversations Access" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Friendships Access" ON public.friendships;
CREATE POLICY "Public Friendships Access" ON public.friendships FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Friend Requests Access" ON public.friend_requests;
CREATE POLICY "Public Friend Requests Access" ON public.friend_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Statuses Access" ON public.statuses;
CREATE POLICY "Public Statuses Access" ON public.statuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Credentials Access" ON public.user_credentials;
CREATE POLICY "Public Credentials Access" ON public.user_credentials FOR ALL USING (true) WITH CHECK (true);

-- 13. Remove any legacy test/seed accounts so website starts 100% fresh
DELETE FROM public.user_profiles
WHERE uid IN ('test_user_noor_1434', 'user_elena', 'user_alexander', 'user_test_partner')
   OR username IN ('noor', 'elena_rostova', 'alex_vance');

-- 14. Enable Realtime Publication (safe idempotent blocks)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 15. Ensure full row data is broadcast on Realtime UPDATE / DELETE events
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.friend_requests REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.statuses REPLICA IDENTITY FULL;
