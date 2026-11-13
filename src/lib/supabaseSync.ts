import { supabase, isSupabaseConfigured } from './supabase';
import { ChatMessage, Conversation, FriendRequest, Friendship, UserProfile, UserStatus } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(val?: string | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isLegacyTestAccount(uid?: string, username?: string, displayName?: string): boolean {
  const u = (uid || '').toLowerCase();
  const un = (username || '').toLowerCase();
  const dn = (displayName || '').toLowerCase();
  return (
    u.includes('noor') ||
    u.includes('test_user_noor') ||
    u === 'user_test_partner' ||
    u === 'user_elena' ||
    u === 'user_alexander' ||
    un === 'noor' ||
    dn === 'noor'
  );
}

// --- Client-Side Salted SHA-256 PIN Hashing (Works on Netlify & Static Hosting) ---
export function generateSaltHex(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPinClient(pin: string, salt: string): Promise<string> {
  const input = `${salt}:${pin}:ERROREX_VAULT_V1`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback if SubtleCrypto unavailable in insecure context
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// --- Mappers ---
export function mapRowToUserProfile(row: any): UserProfile {
  return {
    uid: row.uid,
    username: row.username || `user_${String(row.uid).slice(0, 6)}`,
    displayName: row.display_name || row.displayName || row.username || 'ERROREX Member',
    photoURL: row.photo_url ?? row.photoURL ?? '',
    bio: row.bio || 'Available on ERROREX',
    isOnline: row.is_online !== undefined ? Boolean(row.is_online) : (row.isOnline ?? false),
    lastSeen: row.last_seen || row.lastSeen || new Date().toISOString(),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

// --- User Profiles ---
export async function upsertSupabaseUserProfile(
  profile: Partial<UserProfile> & { uid: string; email?: string | null }
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !profile.uid) return false;
  if (isLegacyTestAccount(profile.uid, profile.username, profile.displayName)) return false;

  const baseUsername = (profile.username || `user_${profile.uid.slice(0, 6)}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 24);

  const payload = {
    uid: profile.uid,
    username: baseUsername || `user_${profile.uid.slice(0, 6)}`,
    display_name: profile.displayName || baseUsername || 'ERROREX Member',
    email: profile.email || '',
    photo_url: profile.photoURL || '',
    bio: profile.bio || 'Available on ERROREX',
    is_online: profile.isOnline !== false,
    last_seen: profile.lastSeen || new Date().toISOString(),
    created_at: profile.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'uid' });

    if (error) {
      // Handle duplicate username collision gracefully
      if (error.code === '23505' && error.message?.toLowerCase().includes('username')) {
        const suffix = profile.uid.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || String(Date.now()).slice(-4);
        const retryPayload = { ...payload, username: `${payload.username.slice(0, 18)}_${suffix}` };
        const { error: retryErr } = await supabase
          .from('user_profiles')
          .upsert(retryPayload, { onConflict: 'uid' });
        if (!retryErr) return true;
        console.warn('[Supabase] user_profiles retry notice:', retryErr.message);
        return false;
      }
      // If email column missing on older table schema, retry without email
      if (error.message?.includes('email')) {
        const { email: _omitted, ...withoutEmail } = payload;
        const { error: fallbackErr } = await supabase
          .from('user_profiles')
          .upsert(withoutEmail, { onConflict: 'uid' });
        if (!fallbackErr) return true;
      }
      console.warn('[Supabase] user_profiles upsert notice:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] user_profiles upsert error:', err?.message || err);
    return false;
  }
}

export async function fetchSupabaseUserProfiles(): Promise<UserProfile[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      if (error) console.warn('[Supabase] fetch user_profiles notice:', error.message);
      return [];
    }

    return data
      .filter(row => !isLegacyTestAccount(row.uid, row.username, row.display_name))
      .map(mapRowToUserProfile);
  } catch (err) {
    console.warn('[Supabase] fetch user_profiles error:', err);
    return [];
  }
}

// --- Secret 8-Digit PIN Credentials ---
export async function upsertSupabasePinCredential(
  uid: string,
  pinHash: string,
  salt: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !uid) return false;
  try {
    const { error } = await supabase
      .from('user_credentials')
      .upsert(
        {
          uid,
          pin_hash: pinHash,
          salt,
          has_pin: true,
          failed_attempts: 0,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'uid' }
      );
    if (error) {
      console.warn('[Supabase] user_credentials upsert notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] user_credentials upsert error:', err);
    return false;
  }
}

export async function fetchSupabasePinCredential(
  uid: string
): Promise<{ pinHash: string; salt: string; hasPin: boolean } | null> {
  if (!isSupabaseConfigured || !supabase || !uid) return null;
  try {
    const { data, error } = await supabase
      .from('user_credentials')
      .select('pin_hash, salt, has_pin')
      .eq('uid', uid)
      .maybeSingle();

    if (error || !data) return null;
    return {
      pinHash: data.pin_hash,
      salt: data.salt,
      hasPin: Boolean(data.has_pin)
    };
  } catch (err) {
    return null;
  }
}

// --- Friend Requests ---
export async function upsertSupabaseFriendRequest(req: FriendRequest): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const payload: any = {
      sender_id: req.senderId,
      receiver_id: req.receiverId,
      sender_name: req.senderName,
      sender_username: req.senderUsername,
      sender_photo: req.senderPhoto || '',
      status: req.status,
      created_at: req.createdAt || new Date().toISOString()
    };
    if (isValidUUID(req.id)) payload.id = req.id;

    const { error } = await supabase.from('friend_requests').upsert(payload);
    if (error) console.warn('[Supabase] friend_requests sync notice:', error.message);
  } catch (err) {
    // quiet
  }
}

export async function fetchSupabaseFriendRequests(uid: string): Promise<FriendRequest[]> {
  if (!isSupabaseConfigured || !supabase || !uid) return [];
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
    if (error || !Array.isArray(data)) return [];
    return data.map((r: any) => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      senderName: r.sender_name,
      senderUsername: r.sender_username,
      senderPhoto: r.sender_photo || '',
      status: r.status,
      createdAt: r.created_at
    }));
  } catch (err) {
    return [];
  }
}

// --- Friendships ---
export async function upsertSupabaseFriendship(f: Friendship): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const sortedUsers = [f.user1Id, f.user2Id].sort();
    const payload: any = {
      user_a: sortedUsers[0],
      user_b: sortedUsers[1],
      created_at: f.createdAt || new Date().toISOString()
    };
    if (isValidUUID(f.id)) payload.id = f.id;

    const { error } = await supabase
      .from('friendships')
      .upsert(payload, { onConflict: 'user_a,user_b' });
    if (error) console.warn('[Supabase] friendships sync notice:', error.message);
  } catch (err) {
    // quiet
  }
}

export async function fetchSupabaseFriendships(uid: string): Promise<Friendship[]> {
  if (!isSupabaseConfigured || !supabase || !uid) return [];
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_a.eq.${uid},user_b.eq.${uid}`);
    if (error || !Array.isArray(data)) return [];
    return data.map((f: any) => ({
      id: f.id,
      user1Id: f.user_a,
      user2Id: f.user_b,
      users: [f.user_a, f.user_b],
      createdAt: f.created_at
    }));
  } catch (err) {
    return [];
  }
}

// --- Conversations & Messages ---
export async function upsertSupabaseConversation(conv: Conversation): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(conv.id)) return;
  try {
    const { error } = await supabase.from('conversations').upsert({
      id: conv.id,
      is_group: Boolean(conv.isGroup),
      group_name: conv.groupName || null,
      group_photo: conv.groupPhoto || null,
      participants: conv.participants || [],
      participant_details: conv.participantDetails || {},
      last_message_text: conv.lastMessageText || null,
      last_message_sender_id: conv.lastMessageSenderId || null,
      last_message_at: conv.lastMessageAt || new Date().toISOString(),
      unread_count: conv.unreadCount || 0,
      created_at: conv.createdAt || new Date().toISOString(),
      updated_at: conv.updatedAt || new Date().toISOString()
    });
    if (error) console.warn('[Supabase] conversations sync notice:', error.message);
  } catch (err) {
    // quiet
  }
}

export async function fetchSupabaseConversations(uid: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured || !supabase || !uid) return [];
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [uid]);
    if (error || !Array.isArray(data)) return [];
    return data.map((c: any) => ({
      id: c.id,
      isGroup: Boolean(c.is_group),
      groupName: c.group_name || undefined,
      groupPhoto: c.group_photo || undefined,
      participants: Array.isArray(c.participants) ? c.participants : [],
      participantDetails: c.participant_details || {},
      lastMessageText: c.last_message_text || undefined,
      lastMessageSenderId: c.last_message_sender_id || undefined,
      lastMessageAt: c.last_message_at || c.updated_at,
      unreadCount: c.unread_count || 0,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));
  } catch (err) {
    return [];
  }
}

export async function deleteSupabaseConversation(convId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(convId)) return;
  try {
    await supabase.from('conversations').delete().eq('id', convId);
  } catch (err) {
    // quiet
  }
}

export async function upsertSupabaseMessage(msg: ChatMessage): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(msg.id) || !isValidUUID(msg.conversationId)) return;
  try {
    const { error } = await supabase.from('messages').upsert({
      id: msg.id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      sender_name: msg.senderName,
      text: msg.text,
      media_type: msg.mediaType || 'none',
      media_url: msg.mediaUrl || null,
      audio_duration: msg.audioDuration || null,
      delivery_status: msg.deliveryStatus || 'sent',
      read_by: msg.readBy || [],
      reactions: msg.reactions || {},
      is_edited: Boolean(msg.isEdited),
      is_deleted: Boolean(msg.isDeleted),
      deleted_for: msg.deletedFor || [],
      deleted_for_everyone: Boolean(msg.deletedForEveryone),
      reply_to_message_id: msg.replyToMessageId || null,
      reply_to_text: msg.replyToText || null,
      created_at: msg.createdAt || new Date().toISOString()
    });
    if (error) console.warn('[Supabase] messages sync notice:', error.message);
  } catch (err) {
    // quiet
  }
}

export async function fetchSupabaseMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(conversationId)) return [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return data.map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      text: m.text,
      mediaType: m.media_type || 'none',
      mediaUrl: m.media_url || undefined,
      audioDuration: m.audio_duration || undefined,
      deliveryStatus: m.delivery_status || 'sent',
      readBy: Array.isArray(m.read_by) ? m.read_by : [],
      reactions: m.reactions || {},
      isEdited: Boolean(m.is_edited),
      isDeleted: Boolean(m.is_deleted),
      deletedFor: Array.isArray(m.deleted_for) ? m.deleted_for : [],
      deletedForEveryone: Boolean(m.deleted_for_everyone),
      replyToMessageId: m.reply_to_message_id || undefined,
      replyToText: m.reply_to_text || undefined,
      createdAt: m.created_at
    }));
  } catch (err) {
    return [];
  }
}

// --- Statuses ---
export async function upsertSupabaseStatus(st: UserStatus): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const payload: any = {
      user_id: st.userId,
      user_name: st.userName,
      user_photo: st.userPhoto || '',
      type: st.type || 'text',
      text: st.text || '',
      media_url: st.mediaUrl || '',
      bg_color: st.bgColor || '#0F172A',
      caption: st.caption || '',
      viewers: st.viewers || [],
      created_at: st.createdAt || new Date().toISOString(),
      expires_at: st.expiresAt
    };
    if (isValidUUID(st.id)) payload.id = st.id;
    await supabase.from('statuses').upsert(payload);
  } catch (err) {
    // quiet
  }
}

export async function fetchSupabaseStatuses(): Promise<UserStatus[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      userName: s.user_name,
      userPhoto: s.user_photo || '',
      type: s.type || 'text',
      text: s.text || '',
      mediaUrl: s.media_url || '',
      bgColor: s.bg_color || '#0F172A',
      caption: s.caption || '',
      viewers: Array.isArray(s.viewers) ? s.viewers : [],
      createdAt: s.created_at,
      expiresAt: s.expires_at
    }));
  } catch (err) {
    return [];
  }
}
