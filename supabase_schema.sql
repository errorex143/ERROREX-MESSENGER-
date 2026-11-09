-- ====================================================================
-- ERROREX SOVEREIGN MESSENGER & VAULT - SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  bio TEXT DEFAULT 'Available on ERROREX',
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sovereign Vault & Secret PIN Credentials Table
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  has_pin BOOLEAN DEFAULT true,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Friendships Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

-- 5. Friend Requests Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  sender_photo TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Encrypted Conversations Table
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video', 'audio', 'document')),
  media_url TEXT,
  audio_duration INT,
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read')),
  read_by JSONB DEFAULT '[]'::jsonb,
  reactions JSONB DEFAULT '{}'::jsonb,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 24-Hour Statuses & Stories Table
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_photo TEXT DEFAULT '',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video')),
  text TEXT,
  media_url TEXT,
  bg_color TEXT DEFAULT '#0F172A',
  caption TEXT,
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 9. Indexes for High-Speed Queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON public.statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON public.statuses(expires_at);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- 11. Allow Public Access Policies (for anonymous & authenticated users in sovereign mode)
CREATE POLICY "Public Profiles Read" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Public Profiles Insert" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Profiles Update" ON public.user_profiles FOR UPDATE USING (true);

CREATE POLICY "Public Messages Access" ON public.messages FOR ALL USING (true);
CREATE POLICY "Public Conversations Access" ON public.conversations FOR ALL USING (true);
CREATE POLICY "Public Friendships Access" ON public.friendships FOR ALL USING (true);
CREATE POLICY "Public Friend Requests Access" ON public.friend_requests FOR ALL USING (true);
CREATE POLICY "Public Statuses Access" ON public.statuses FOR ALL USING (true);
CREATE POLICY "Public Credentials Access" ON public.user_credentials FOR ALL USING (true);

-- 12. Pre-Seed Master Sovereign Account (Noor @noor)
INSERT INTO public.user_profiles (uid, username, display_name, photo_url, bio, is_online)
VALUES (
  'test_user_noor_1434',
  'noor',
  'Noor',
  '',
  'ERROREX Master Sovereign Account',
  true
)
ON CONFLICT (uid) DO NOTHING;

-- Pre-seed Elena & Alexander
INSERT INTO public.user_profiles (uid, username, display_name, photo_url, bio, is_online)
VALUES
  ('user_elena', 'elena_rostova', 'Elena Rostova', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Zurich diplomatic liaison • Encrypted communications only', true),
  ('user_alexander', 'alex_vance', 'Alexander Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Geneva vault custodian • Verified partner', true)
ON CONFLICT (uid) DO NOTHING;

-- Enable Realtime Publication for Messages & Statuses
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
