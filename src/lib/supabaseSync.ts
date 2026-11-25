import { supabase, isSupabaseConfigured, getSupabaseCredentials } from './supabase';
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

// --- Client-Side Salted SHA-256 Hashing (PIN & Password Verification Across Devices) ---
export function generateSaltHex(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPinClient(secret: string, salt: string): Promise<string> {
  const input = `${salt}:${secret}:ERROREX_VAULT_V1`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function isUserCurrentlyOnline(
  profile?: { isOnline?: boolean; lastSeen?: string } | null
): boolean {
  if (!profile) return false;
  if (profile.isOnline === false) return false;
  if (profile.lastSeen) {
    const lastMs = new Date(profile.lastSeen).getTime();
    if (!Number.isNaN(lastMs) && Date.now() - lastMs > 2 * 60 * 1000) {
      return false;
    }
  }
  return Boolean(profile.isOnline);
}

export function sendOfflineBeacon(uid: string): void {
  if (!isSupabaseConfigured || !uid) return;
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseCredentials();
  if (!supabaseUrl || !supabaseAnonKey) return;

  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/user_profiles?uid=eq.${encodeURIComponent(uid)}`;
    fetch(endpoint, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        is_online: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }).catch(() => {
      // ignore keepalive failure during unload
    });
  } catch {
    // quiet
  }
}

// --- Mappers ---
export function mapRowToUserProfile(row: any): UserProfile & { email?: string } {
  const effectiveUid = row.uid || row.id;
  return {
    uid: effectiveUid,
    username: row.username || `user_${String(effectiveUid).slice(0, 6)}`,
    displayName: row.display_name || row.displayName || row.username || 'ERROREX Member',
    email: row.email || '',
    photoURL: row.photo_url ?? row.photoURL ?? '',
    bio: row.bio || 'Available on ERROREX',
    isOnline: row.is_online !== undefined ? Boolean(row.is_online) : (row.isOnline ?? false),
    lastSeen: row.last_seen || row.lastSeen || new Date().toISOString(),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

function mapRowToConversation(c: any): Conversation {
  return {
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
  };
}

function mapRowToMessage(m: any): ChatMessage {
  return {
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

  const payload: Record<string, any> = {
    uid: profile.uid,
    username: baseUsername || `user_${profile.uid.slice(0, 6)}`,
    display_name: profile.displayName || baseUsername || 'ERROREX Member',
    photo_url: profile.photoURL || '',
    bio: profile.bio || 'Available on ERROREX',
    is_online: profile.isOnline !== false,
    last_seen: profile.lastSeen || new Date().toISOString(),
    created_at: profile.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isValidUUID(profile.uid)) {
    payload.id = profile.uid;
  }

  if (profile.email !== undefined && profile.email !== null && profile.email !== '') {
    payload.email = profile.email.toLowerCase().trim();
  }

  const attemptUpsert = async (dataObj: Record<string, any>): Promise<{ ok: boolean; error?: any }> => {
    const conflictCol = isValidUUID(dataObj.id) ? 'id' : 'uid';
    const { error } = await supabase!.from('user_profiles').upsert(dataObj, { onConflict: 'uid' });
    if (!error) return { ok: true };

    // If schema doesn't have UNIQUE(uid) yet (42P10) or has an existing row matched by id, fall back cleanly
    if (error.code === '42P10' || (error.code === '23505' && error.message?.includes('pkey'))) {
      const { error: idErr } = await supabase!.from('user_profiles').upsert(dataObj, { onConflict: conflictCol });
      if (!idErr) return { ok: true };
    }
    return { ok: false, error };
  };

  try {
    let res = await attemptUpsert(payload);
    if (res.ok) return true;

    let currentPayload = { ...payload };
    let err = res.error;

    // Handle missing email column on older schemas
    if (err && (err.message?.includes('email') || err.code === '42703' || err.code === 'PGRST204')) {
      const { email: _omitted, ...withoutEmail } = currentPayload;
      currentPayload = withoutEmail;
      res = await attemptUpsert(currentPayload);
      if (res.ok) return true;
      err = res.error;
    }

    // Handle username collision across accounts
    if (err && err.code === '23505' && err.message?.toLowerCase().includes('username')) {
      const suffix = profile.uid.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || String(Date.now()).slice(-4);
      currentPayload = { ...currentPayload, username: `${String(currentPayload.username).slice(0, 18)}_${suffix}` };
      res = await attemptUpsert(currentPayload);
      if (res.ok) return true;
      err = res.error;
    }

    // Manual select -> update or insert fallback (handles legacy uid IS NULL rows)
    const lookupFilter = isValidUUID(profile.uid)
      ? `uid.eq.${profile.uid},id.eq.${profile.uid}`
      : `uid.eq.${profile.uid}`;
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, uid')
      .or(lookupFilter)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { id: _id, ...updates } = currentPayload;
      const { error: updErr } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', existing.id);
      if (!updErr) return true;
    }

    if (err) {
      console.warn('[Supabase] user_profiles upsert notice:', err.message);
    }
    return false;
  } catch (err: any) {
    console.warn('[Supabase] user_profiles upsert error:', err?.message || err);
    return false;
  }
}

export async function fetchSupabaseUserProfiles(): Promise<Array<UserProfile & { email?: string }>> {
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
      .filter(row => {
        const effectiveUid = row.uid || row.id;
        return Boolean(effectiveUid) && !isLegacyTestAccount(effectiveUid, row.username, row.display_name);
      })
      .map(mapRowToUserProfile);
  } catch (err) {
    console.warn('[Supabase] fetch user_profiles error:', err);
    return [];
  }
}

export async function fetchSupabaseUserProfileByUid(
  uid: string
): Promise<(UserProfile & { email?: string }) | null> {
  if (!isSupabaseConfigured || !supabase || !uid) return null;
  try {
    let q = supabase.from('user_profiles').select('*');
    if (isValidUUID(uid)) {
      q = q.or(`uid.eq.${uid},id.eq.${uid}`);
    } else {
      q = q.eq('uid', uid);
    }
    const { data, error } = await q.limit(1).maybeSingle();
    if (error || !data) return null;
    const effectiveUid = data.uid || data.id;
    if (isLegacyTestAccount(effectiveUid, data.username, data.display_name)) return null;
    return mapRowToUserProfile(data);
  } catch {
    return null;
  }
}

export async function fetchSupabaseUserProfileByEmail(
  email: string
): Promise<(UserProfile & { email?: string }) | null> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!isSupabaseConfigured || !supabase || !cleanEmail) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    if (isLegacyTestAccount(data.uid, data.username, data.display_name)) return null;
    return mapRowToUserProfile(data);
  } catch {
    return null;
  }
}

// --- Secret 8-Digit PIN & Cross-Device Auth Credentials ---
async function findCredentialRowByUid(
  uid: string
): Promise<{ matchedCol: 'uid' | 'user_id'; row: any } | null> {
  if (!supabase) return null;

  const { data: byUid, error: uidErr } = await supabase
    .from('user_credentials')
    .select('uid, pin_hash, salt, has_pin, auth_hash, auth_salt')
    .eq('uid', uid)
    .limit(1)
    .maybeSingle();

  if (!uidErr && byUid) {
    return { matchedCol: 'uid', row: byUid };
  }

  // Fallback for legacy schemas where user_id stores the UUID and uid may be null
  if (isValidUUID(uid)) {
    const { data: byUserId, error: userIdErr } = await supabase
      .from('user_credentials')
      .select('uid, user_id, pin_hash, salt, has_pin, auth_hash, auth_salt')
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();

    if (!userIdErr && byUserId) {
      return { matchedCol: 'user_id', row: byUserId };
    }
  }

  return null;
}

export async function upsertSupabasePinCredential(
  uid: string,
  pinHash: string,
  salt: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !uid) return false;
  const nowIso = new Date().toISOString();
  const basePayload: Record<string, any> = {
    uid,
    pin_hash: pinHash,
    salt,
    has_pin: true,
    failed_attempts: 0,
    updated_at: nowIso
  };

  try {
    // 1. Check if row already exists by uid or user_id
    const found = await findCredentialRowByUid(uid);
    if (found) {
      const { error: updErr } = await supabase
        .from('user_credentials')
        .update({
          uid,
          pin_hash: pinHash,
          salt,
          has_pin: true,
          failed_attempts: 0,
          updated_at: nowIso
        })
        .eq(found.matchedCol, uid);
      if (!updErr) return true;
      console.warn('[Supabase] user_credentials PIN update notice:', updErr.message);
      return false;
    }

    // 2. Try standard upsert on uid
    const { error } = await supabase
      .from('user_credentials')
      .upsert(basePayload, { onConflict: 'uid' });
    if (!error) return true;

    // 3. Support legacy schemas where `user_id` is NOT NULL or PK (`23502` or `42P10`)
    if (
      (error.code === '23502' && error.message?.includes('user_id')) ||
      error.code === '42P10'
    ) {
      const withUserId = isValidUUID(uid) ? { ...basePayload, user_id: uid } : basePayload;
      const conflictTarget = error.code === '42P10' && isValidUUID(uid) ? 'user_id' : 'uid';
      const { error: retryErr } = await supabase
        .from('user_credentials')
        .upsert(withUserId, { onConflict: conflictTarget });
      if (!retryErr) return true;

      // Final manual insert fallback if ON CONFLICT fails
      const { error: insErr } = await supabase.from('user_credentials').insert(withUserId);
      if (!insErr) return true;
      console.warn('[Supabase] user_credentials PIN legacy retry notice:', insErr.message);
      return false;
    }

    console.warn('[Supabase] user_credentials PIN upsert notice:', error.message);
    return false;
  } catch (err) {
    console.warn('[Supabase] user_credentials PIN upsert error:', err);
    return false;
  }
}

export async function fetchSupabasePinCredential(
  uid: string
): Promise<{ pinHash: string; salt: string; hasPin: boolean } | null> {
  if (!isSupabaseConfigured || !supabase || !uid) return null;
  try {
    const found = await findCredentialRowByUid(uid);
    const data = found?.row;
    if (!data) return null;
    const hasValidPin = Boolean(data.has_pin && data.pin_hash && data.salt);
    if (!hasValidPin) return null;
    return {
      pinHash: data.pin_hash,
      salt: data.salt,
      hasPin: true
    };
  } catch {
    return null;
  }
}

export async function upsertSupabaseAuthCredential(
  uid: string,
  authHash: string,
  authSalt: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !uid || !authHash || !authSalt) return false;
  const nowIso = new Date().toISOString();

  try {
    const found = await findCredentialRowByUid(uid);
    if (found) {
      const { error } = await supabase
        .from('user_credentials')
        .update({
          uid,
          auth_hash: authHash,
          auth_salt: authSalt,
          updated_at: nowIso
        })
        .eq(found.matchedCol, uid);
      if (!error) return true;
      if (error.code !== '42703' && error.code !== 'PGRST204') {
        console.warn('[Supabase] auth_hash update notice:', error.message);
      }
      return false;
    }

    const baseInsert: Record<string, any> = {
      uid,
      pin_hash: '',
      salt: '',
      has_pin: false,
      auth_hash: authHash,
      auth_salt: authSalt,
      failed_attempts: 0,
      updated_at: nowIso
    };

    const { error } = await supabase.from('user_credentials').insert(baseInsert);
    if (!error) return true;

    // Legacy user_id NOT NULL fallback
    if (error.code === '23502' && error.message?.includes('user_id') && isValidUUID(uid)) {
      const { error: retryErr } = await supabase
        .from('user_credentials')
        .insert({ ...baseInsert, user_id: uid });
      if (!retryErr) return true;
      if (retryErr.code !== '42703' && retryErr.code !== 'PGRST204') {
        console.warn('[Supabase] auth_hash legacy insert notice:', retryErr.message);
      }
      return false;
    }

    if (error.code !== '42703' && error.code !== 'PGRST204') {
      console.warn('[Supabase] auth_hash insert notice:', error.message);
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchSupabaseAuthCredential(
  uid: string
): Promise<{ authHash: string; authSalt: string } | null> {
  if (!isSupabaseConfigured || !supabase || !uid) return null;
  try {
    const found = await findCredentialRowByUid(uid);
    const data = found?.row;
    if (!data || !data.auth_hash || !data.auth_salt) return null;
    return {
      authHash: data.auth_hash,
      authSalt: data.auth_salt
    };
  } catch {
    return null;
  }
}

// --- Friend Requests ---
export async function upsertSupabaseFriendRequest(req: FriendRequest): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
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

    const { error } = await supabase.from('friend_requests').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] friend_requests sync notice:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
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
  } catch {
    return [];
  }
}

// --- Friendships ---
export async function upsertSupabaseFriendship(f: Friendship): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
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

    if (error) {
      // Fallback if unique constraint on (user_a, user_b) isn't present yet
      if (error.code === '42P10') {
        const { data: existing } = await supabase
          .from('friendships')
          .select('id')
          .eq('user_a', sortedUsers[0])
          .eq('user_b', sortedUsers[1])
          .maybeSingle();
        if (existing?.id) return true;
        const { error: insErr } = await supabase.from('friendships').insert(payload);
        if (!insErr) return true;
      }
      console.warn('[Supabase] friendships sync notice:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
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
  } catch {
    return [];
  }
}

// --- Conversations & Messages (FK-Safe Ordered Sync) ---
const pendingConvSyncs = new Map<string, Promise<boolean>>();

export async function upsertSupabaseConversation(conv: Conversation): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(conv.id)) return false;

  const task = (async () => {
    try {
      const payload: Record<string, any> = {
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
      };

      const { error } = await supabase!.from('conversations').upsert(payload, { onConflict: 'id' });
      if (!error) return true;

      // Support legacy Supabase schemas where `created_by` has NOT NULL constraint
      if (error.code === '23502' && error.message?.includes('created_by')) {
        const creator =
          conv.lastMessageSenderId ||
          (Array.isArray(conv.participants) && conv.participants[0]) ||
          'system';
        const { error: retryErr } = await supabase!
          .from('conversations')
          .upsert({ ...payload, created_by: creator }, { onConflict: 'id' });
        if (!retryErr) return true;
        console.warn('[Supabase] conversations created_by retry notice:', retryErr.message);
        return false;
      }

      console.warn('[Supabase] conversations sync notice:', error.message);
      return false;
    } catch {
      return false;
    }
  })();

  pendingConvSyncs.set(conv.id, task);
  const ok = await task;
  if (pendingConvSyncs.get(conv.id) === task) {
    pendingConvSyncs.delete(conv.id);
  }
  return ok;
}

export async function fetchSupabaseConversationById(convId: string): Promise<Conversation | null> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(convId)) return null;
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .maybeSingle();
    if (error || !data) return null;
    return mapRowToConversation(data);
  } catch {
    return null;
  }
}

export async function fetchSupabaseConversations(uid: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured || !supabase || !uid) return [];
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [uid])
      .order('updated_at', { ascending: false });
    if (error || !Array.isArray(data)) {
      if (error) console.warn('[Supabase] fetch conversations notice:', error.message);
      return [];
    }
    return data.map(mapRowToConversation);
  } catch {
    return [];
  }
}

export async function deleteSupabaseConversation(convId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(convId)) return;
  try {
    await supabase.from('conversations').delete().eq('id', convId);
  } catch {
    // quiet
  }
}

export async function upsertSupabaseMessage(
  msg: ChatMessage,
  parentConv?: Conversation
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !isValidUUID(msg.id) || !isValidUUID(msg.conversationId)) {
    return false;
  }

  // Wait if the parent conversation is currently being upserted to prevent FK race (23503)
  const pendingConv = pendingConvSyncs.get(msg.conversationId);
  if (pendingConv) {
    await pendingConv;
  }

  const rowPayload = {
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
  };

  try {
    const { error } = await supabase.from('messages').upsert(rowPayload, { onConflict: 'id' });
    if (error) {
      // FK violation (23503): parent conversation didn't exist yet -> create parent first and retry!
      if (error.code === '23503') {
        const fallbackConv: Conversation = parentConv || {
          id: msg.conversationId,
          participants: [msg.senderId].filter(p => p && p !== 'system'),
          participantDetails: {},
          isGroup: false,
          lastMessageText: msg.text,
          lastMessageSenderId: msg.senderId,
          lastMessageAt: msg.createdAt,
          createdAt: msg.createdAt,
          updatedAt: msg.createdAt
        };
        const convSaved = await upsertSupabaseConversation(fallbackConv);
        if (convSaved) {
          const { error: retryErr } = await supabase
            .from('messages')
            .upsert(rowPayload, { onConflict: 'id' });
          if (!retryErr) return true;
          console.warn('[Supabase] messages retry notice:', retryErr.message);
          return false;
        }
      }
      console.warn('[Supabase] messages sync notice:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
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
    return data.map(mapRowToMessage);
  } catch {
    return [];
  }
}

// --- Statuses ---
export async function upsertSupabaseStatus(st: UserStatus): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
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
    const { error } = await supabase.from('statuses').upsert(payload, { onConflict: 'id' });
    if (error) {
      // Support legacy statuses table having NOT NULL status_type column
      if (error.code === '23502' && error.message?.includes('status_type')) {
        const { error: retryErr } = await supabase
          .from('statuses')
          .upsert({ ...payload, status_type: st.type || 'text' }, { onConflict: 'id' });
        if (!retryErr) return true;
      }
      console.warn('[Supabase] statuses sync notice:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
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
      type: s.type || s.status_type || 'text',
      text: s.text || '',
      mediaUrl: s.media_url || '',
      bgColor: s.bg_color || '#0F172A',
      caption: s.caption || '',
      viewers: Array.isArray(s.viewers) ? s.viewers : [],
      createdAt: s.created_at,
      expiresAt: s.expires_at
    }));
  } catch {
    return [];
  }
}
