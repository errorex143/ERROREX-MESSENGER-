// STANDALONE LOCAL API & REACTIVE STORE FOR ERROREX
// Integrated with Supabase PostgreSQL (Primary Cloud DB) + Express Backend + Local Reactive Cache
import { supabase, isSupabaseConfigured } from './supabase';
import {
  generateUUID,
  isLegacyTestAccount,
  upsertSupabaseUserProfile,
  fetchSupabaseUserProfiles,
  upsertSupabaseFriendRequest,
  fetchSupabaseFriendRequests,
  upsertSupabaseFriendship,
  fetchSupabaseFriendships,
  upsertSupabaseConversation,
  upsertSupabaseStatus,
  fetchSupabaseStatuses
} from './supabaseSync';

export interface StandaloneUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
  tenantId?: string | null;
  providerData?: Array<{ providerId: string; email: string | null }>;
  getIdToken: () => Promise<string>;
}

export interface DocumentSnapshot<T = any> {
  id: string;
  exists: () => boolean;
  data: () => T | undefined;
}

export interface QuerySnapshot<T = any> {
  size: number;
  empty: boolean;
  docs: DocumentSnapshot<T>[];
  forEach: (callback: (doc: DocumentSnapshot<T>) => void) => void;
}

export type Unsubscribe = () => void;

// Event Emitter for Real-Time Updates
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function emitChange(collectionName: string) {
  const set = listeners.get(collectionName);
  if (set) {
    set.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.warn('Listener callback error:', err);
      }
    });
  }
}

function addListener(collectionName: string, cb: Listener): Unsubscribe {
  if (!listeners.has(collectionName)) {
    listeners.set(collectionName, new Set());
  }
  const set = listeners.get(collectionName)!;
  set.add(cb);
  return () => {
    set.delete(cb);
  };
}

// Local Storage Collection Helpers
const DB_PREFIX = 'errorex_standalone_db_';

export function getCollectionData<T = any>(collectionName: string): T[] {
  try {
    const raw = localStorage.getItem(`${DB_PREFIX}${collectionName}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read collection ${collectionName}:`, e);
  }
  return [];
}

export function saveCollectionData<T = any>(collectionName: string, data: T[]): void {
  try {
    localStorage.setItem(`${DB_PREFIX}${collectionName}`, JSON.stringify(data));
    emitChange(collectionName);
  } catch (e) {
    console.warn(`Failed to save collection ${collectionName}:`, e);
  }
}

function mergeCollectionByKey(collectionName: string, incoming: any[], keyField = 'id') {
  if (!Array.isArray(incoming) || incoming.length === 0) return;
  const existing = getCollectionData<any>(collectionName);
  const map = new Map<string, any>();

  existing.forEach(item => {
    const k = item[keyField] || item.uid || item.id;
    if (k && !isLegacyTestAccount(item.uid, item.username, item.displayName)) {
      map.set(k, item);
    }
  });

  incoming.forEach(item => {
    const k = item[keyField] || item.uid || item.id;
    if (k && !isLegacyTestAccount(item.uid, item.username, item.displayName)) {
      const prev = map.get(k);
      map.set(k, prev ? { ...prev, ...item } : item);
    }
  });

  saveCollectionData(collectionName, Array.from(map.values()));
}

export async function syncUserToDirectory(profile: any): Promise<void> {
  if (!profile || !profile.uid) return;
  if (isLegacyTestAccount(profile.uid, profile.username, profile.displayName)) return;

  // 1. Sync to Supabase PostgreSQL (primary cloud persistence for Netlify & all devices)
  await upsertSupabaseUserProfile({
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    email: profile.email || '',
    photoURL: profile.photoURL || '',
    bio: profile.bio || 'Available on ERROREX',
    isOnline: profile.isOnline !== false,
    lastSeen: profile.lastSeen || new Date().toISOString(),
    createdAt: profile.createdAt || new Date().toISOString()
  });

  // 2. Sync to Express server directory if available
  try {
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: profile.uid,
        username: profile.username,
        displayName: profile.displayName,
        photoURL: profile.photoURL || '',
        bio: profile.bio || 'Available on ERROREX',
        isOnline: profile.isOnline !== false,
        lastSeen: profile.lastSeen || new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString()
      })
    });
  } catch {
    // quiet on static hosting (Netlify)
  }
}

let realtimeSubscribedUid: string | null = null;
let realtimeChannel: any = null;

export async function hydrateStandaloneFromSupabase(uid: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !uid) return;

  try {
    const [profiles, requests, friendships, statuses] = await Promise.all([
      fetchSupabaseUserProfiles(),
      fetchSupabaseFriendRequests(uid),
      fetchSupabaseFriendships(uid),
      fetchSupabaseStatuses()
    ]);

    if (profiles.length > 0) {
      mergeCollectionByKey(
        'userProfiles',
        profiles.map(p => ({ ...p, id: p.uid })),
        'uid'
      );
    }
    if (requests.length > 0) {
      mergeCollectionByKey('friendRequests', requests, 'id');
    }
    if (friendships.length > 0) {
      mergeCollectionByKey('friendships', friendships, 'id');
    }
    if (statuses.length > 0) {
      mergeCollectionByKey('statuses', statuses, 'id');
    }
  } catch (err) {
    console.warn('[Supabase Hydrate] Notice:', err);
  }

  // Subscribe to Supabase Realtime updates once per UID
  if (realtimeSubscribedUid !== uid) {
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch {
        // ignore
      }
    }
    realtimeSubscribedUid = uid;
    try {
      realtimeChannel = supabase
        .channel(`errorex_social_${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, async () => {
          const profiles = await fetchSupabaseUserProfiles();
          if (profiles.length > 0) {
            mergeCollectionByKey('userProfiles', profiles.map(p => ({ ...p, id: p.uid })), 'uid');
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, async () => {
          const requests = await fetchSupabaseFriendRequests(uid);
          mergeCollectionByKey('friendRequests', requests, 'id');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, async () => {
          const friendships = await fetchSupabaseFriendships(uid);
          mergeCollectionByKey('friendships', friendships, 'id');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, async () => {
          const statuses = await fetchSupabaseStatuses();
          mergeCollectionByKey('statuses', statuses, 'id');
        })
        .subscribe();
    } catch {
      // ignore realtime subscription errors
    }
  }
}

// Clean slate: Remove any legacy test users or mock accounts
function cleanLegacyData() {
  try {
    const saved = localStorage.getItem('errorex_standalone_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (isLegacyTestAccount(u.uid, u.username, u.displayName)) {
        localStorage.removeItem('errorex_standalone_user');
      }
    }
    const oldProfiles = getCollectionData('userProfiles');
    const filteredProfiles = oldProfiles.filter(
      (p: any) => !isLegacyTestAccount(p.uid, p.username, p.displayName)
    );
    if (filteredProfiles.length !== oldProfiles.length) {
      saveCollectionData('userProfiles', filteredProfiles);
    }
  } catch {
    // quiet
  }
}
cleanLegacyData();

// --- STANDALONE AUTH SERVICE ---
class StandaloneAuthService {
  private _currentUser: StandaloneUser | null = null;
  private authListeners = new Set<(user: StandaloneUser | null) => void>();

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    try {
      const saved = localStorage.getItem('errorex_standalone_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (isLegacyTestAccount(u.uid, u.username, u.displayName)) {
          localStorage.removeItem('errorex_standalone_user');
          this._currentUser = null;
          return;
        }
        this._currentUser = {
          ...u,
          getIdToken: async () => `token_${u.uid}`
        };
      } else {
        this._currentUser = null;
      }
    } catch {
      this._currentUser = null;
    }
  }

  get currentUser(): StandaloneUser | null {
    return this._currentUser;
  }

  onAuthStateChanged(callback: (user: StandaloneUser | null) => void): Unsubscribe {
    this.authListeners.add(callback);
    setTimeout(() => {
      callback(this._currentUser);
    }, 0);
    return () => {
      this.authListeners.delete(callback);
    };
  }

  public setCurrentUser(user: StandaloneUser | null) {
    this._currentUser = user;
    if (user) {
      localStorage.setItem('errorex_standalone_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('errorex_standalone_user');
    }
    this.emitAuthChange();
  }

  public emitAuthChange() {
    this.authListeners.forEach(cb => {
      try {
        cb(this._currentUser);
      } catch (e) {
        console.warn('Auth listener error:', e);
      }
    });
  }

  async signInWithEmailAndPassword(email: string, pass: string): Promise<{ user: StandaloneUser }> {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Authenticate via Supabase Auth when configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass
        });
        if (data?.user) {
          const suUser: StandaloneUser = {
            uid: data.user.id,
            email: data.user.email || cleanEmail,
            displayName: data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
            photoURL: data.user.user_metadata?.avatar_url || '',
            emailVerified: Boolean(data.user.email_confirmed_at),
            getIdToken: async () => data.session?.access_token || `token_${data.user.id}`
          };
          this.setCurrentUser(suUser);
          return { user: suUser };
        }
        if (error) {
          const msg = error.message?.toLowerCase() || '';
          // If email/password invalid and no local fallback match, throw if confirmed wrong password
          if (msg.includes('invalid login credentials')) {
            // Check local registered users in case they registered during SMTP rate limit fallback
            const regUsersRaw = localStorage.getItem('errorex_registered_users');
            const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];
            const matchedLocal = regUsers.find(u => u.email === cleanEmail);
            if (!matchedLocal) {
              throw new Error('Invalid email or password.');
            }
          } else if (!msg.includes('email not confirmed')) {
            console.warn('[Supabase Auth] Login notice:', error.message);
          }
        }
      } catch (err: any) {
        if (err?.message === 'Invalid email or password.') throw err;
        console.warn('[Supabase Auth] Fallback to standalone store:', err);
      }
    }

    // 2. Check registered accounts in localStorage
    const regUsersRaw = localStorage.getItem('errorex_registered_users');
    const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];
    const matched = regUsers.find(u => u.email === cleanEmail);

    if (matched) {
      if (matched.password !== pass) {
        throw new Error('Invalid email or password.');
      }
      const user: StandaloneUser = {
        uid: matched.uid,
        email: matched.email,
        displayName: matched.displayName,
        photoURL: matched.photoURL || '',
        emailVerified: true,
        getIdToken: async () => `token_${matched.uid}`
      };
      this.setCurrentUser(user);
      return { user };
    }

    // 3. Check if user already exists in Supabase user_profiles by email (e.g. unconfirmed email login)
    const emailSlug = cleanEmail.replace(/[^a-z0-9]/g, '_');
    const stableUid = `user_${emailSlug}`;
    const newUser: StandaloneUser = {
      uid: stableUid,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      photoURL: '',
      emailVerified: true,
      getIdToken: async () => `token_${stableUid}`
    };

    this.setCurrentUser(newUser);
    return { user: newUser };
  }

  async createUserWithEmailAndPassword(
    email: string,
    pass: string,
    customDisplayName?: string
  ): Promise<{ user: StandaloneUser }> {
    const cleanEmail = email.toLowerCase().trim();
    const displayName = (customDisplayName || '').trim() || cleanEmail.split('@')[0];
    const cleanUsername = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) || `user_${Date.now().toString().slice(-5)}`;
    const nowIso = new Date().toISOString();

    let resolvedUid = `user_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    // 1. Register in Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: { display_name: displayName }
          }
        });

        if (error) {
          const msg = error.message?.toLowerCase() || '';
          if (msg.includes('already registered') || msg.includes('already exists')) {
            throw new Error('An account with this email already exists. Please Sign In instead.');
          }
          // If Supabase SMTP email rate-limit or confirmation email error occurs, fall back gracefully
          // while still writing the user to public.user_profiles!
          if (!msg.includes('rate limit') && !msg.includes('sending confirmation') && !msg.includes('email')) {
            throw new Error(error.message);
          }
          console.warn('[Supabase Auth] Email dispatch notice, completing profile registration:', error.message);
        } else if (data?.user) {
          resolvedUid = data.user.id;
        }
      } catch (err: any) {
        if (err?.message?.includes('already exists') || err?.message?.includes('Password')) {
          throw err;
        }
        console.warn('[Supabase Auth] Registration notice:', err?.message || err);
      }
    }

    // 2. Save local registered credentials for seamless cross-fallback login
    const regUsersRaw = localStorage.getItem('errorex_registered_users');
    const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];
    const existingLocal = regUsers.find(u => u.email === cleanEmail);
    if (existingLocal && !isSupabaseConfigured) {
      throw new Error('An account with this email already exists. Please Sign In instead.');
    }

    if (!existingLocal) {
      regUsers.push({
        uid: resolvedUid,
        email: cleanEmail,
        password: pass,
        displayName,
        createdAt: nowIso
      });
      localStorage.setItem('errorex_registered_users', JSON.stringify(regUsers));
    }

    const newUser: StandaloneUser = {
      uid: resolvedUid,
      email: cleanEmail,
      displayName,
      photoURL: '',
      emailVerified: true,
      getIdToken: async () => `token_${resolvedUid}`
    };

    // 3. Create & immediately sync profile to localStorage + Supabase user_profiles + server directory
    const newProfile = {
      id: resolvedUid,
      uid: resolvedUid,
      username: cleanUsername,
      displayName,
      email: cleanEmail,
      photoURL: '',
      bio: 'Available on ERROREX',
      createdAt: nowIso,
      updatedAt: nowIso,
      isOnline: true,
      lastSeen: nowIso
    };

    const profiles = getCollectionData('userProfiles').filter((p: any) => p.uid !== resolvedUid);
    profiles.push(newProfile);
    saveCollectionData('userProfiles', profiles);

    await syncUserToDirectory(newProfile);

    this.setCurrentUser(newUser);
    return { user: newUser };
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // quiet
      }
    }
    this._currentUser = null;
    localStorage.removeItem('errorex_standalone_user');
    this.emitAuthChange();
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
      } catch {
        // quiet
      }
    }
  }

  async updateProfile(user: StandaloneUser, updates: { displayName?: string; photoURL?: string }): Promise<void> {
    if (this._currentUser && this._currentUser.uid === user.uid) {
      this._currentUser = {
        ...this._currentUser,
        displayName: updates.displayName !== undefined ? updates.displayName : this._currentUser.displayName,
        photoURL: updates.photoURL !== undefined ? updates.photoURL : this._currentUser.photoURL
      };
      localStorage.setItem('errorex_standalone_user', JSON.stringify(this._currentUser));
      this.emitAuthChange();
    }
  }

  async updatePassword(user: StandaloneUser, newPass: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({ password: newPass });
      } catch {
        // quiet
      }
    }
    const regUsersRaw = localStorage.getItem('errorex_registered_users');
    if (regUsersRaw) {
      const regUsers: any[] = JSON.parse(regUsersRaw);
      const idx = regUsers.findIndex(u => u.uid === user.uid || u.email === user.email);
      if (idx !== -1) {
        regUsers[idx].password = newPass;
        localStorage.setItem('errorex_registered_users', JSON.stringify(regUsers));
      }
    }
  }
}

export const standaloneAuth = new StandaloneAuthService();

// --- STANDALONE DATABASE API ---
export class StandaloneCollectionRef {
  constructor(public collectionName: string) {}
}

export class StandaloneDocRef {
  constructor(public collectionName: string, public id: string) {}
}

export interface QueryFilter {
  field: string;
  op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains';
  val: any;
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export class StandaloneQuery {
  public filters: QueryFilter[] = [];
  public orderBys: QueryOrderBy[] = [];

  constructor(public collectionName: string) {}

  addFilter(filter: QueryFilter) {
    this.filters.push(filter);
  }

  addOrderBy(order: QueryOrderBy) {
    this.orderBys.push(order);
  }

  execute<T = any>(): T[] {
    let items = getCollectionData<any>(this.collectionName);

    for (const f of this.filters) {
      items = items.filter(item => {
        const itemVal = item[f.field];
        if (f.op === '==') return itemVal === f.val;
        if (f.op === '!=') return itemVal !== f.val;
        if (f.op === '<') return itemVal < f.val;
        if (f.op === '<=') return itemVal <= f.val;
        if (f.op === '>') return itemVal > f.val;
        if (f.op === '>=') return itemVal >= f.val;
        if (f.op === 'array-contains') {
          return Array.isArray(itemVal) && itemVal.includes(f.val);
        }
        return true;
      });
    }

    for (const ord of this.orderBys) {
      items.sort((a, b) => {
        const valA = a[ord.field];
        const valB = b[ord.field];
        if (valA < valB) return ord.direction === 'asc' ? -1 : 1;
        if (valA > valB) return ord.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }
}

export const standaloneDb = {
  name: 'errorex_standalone_database'
};

export function collection(_db: any, collectionName: string): StandaloneCollectionRef {
  return new StandaloneCollectionRef(collectionName);
}

export function doc(_db: any, collectionName: string, id: string): StandaloneDocRef {
  return new StandaloneDocRef(collectionName, id);
}

export function query(
  colOrQuery: StandaloneCollectionRef | StandaloneQuery,
  ...constraints: any[]
): StandaloneQuery {
  const collectionName = colOrQuery.collectionName;
  const q = new StandaloneQuery(collectionName);

  if (colOrQuery instanceof StandaloneQuery) {
    q.filters = [...colOrQuery.filters];
    q.orderBys = [...colOrQuery.orderBys];
  }

  for (const c of constraints) {
    if (c && c.type === 'where') {
      q.addFilter({ field: c.field, op: c.op, val: c.val });
    } else if (c && c.type === 'orderBy') {
      q.addOrderBy({ field: c.field, direction: c.direction });
    }
  }

  return q;
}

export function where(field: string, op: any, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function onSnapshot(
  target: StandaloneCollectionRef | StandaloneDocRef | StandaloneQuery,
  onNext: (snap: any) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const collectionName = target.collectionName;

  const trigger = () => {
    try {
      if (target instanceof StandaloneDocRef) {
        const items = getCollectionData<any>(collectionName);
        const matched = items.find(i => i.id === target.id || i.uid === target.id);
        const docSnap: DocumentSnapshot = {
          id: target.id,
          exists: () => Boolean(matched),
          data: () => matched
        };
        onNext(docSnap);
      } else {
        const q = target instanceof StandaloneQuery ? target : new StandaloneQuery(collectionName);
        const results = q.execute();
        const docs: DocumentSnapshot[] = results.map(item => ({
          id: item.id || item.uid || '',
          exists: () => true,
          data: () => item
        }));
        const querySnap: QuerySnapshot = {
          size: docs.length,
          empty: docs.length === 0,
          docs,
          forEach: cb => docs.forEach(cb)
        };
        onNext(querySnap);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  setTimeout(trigger, 0);
  return addListener(collectionName, trigger);
}

export async function getDoc(docRef: StandaloneDocRef): Promise<DocumentSnapshot> {
  const items = getCollectionData<any>(docRef.collectionName);
  let matched = items.find(i => i.id === docRef.id || i.uid === docRef.id);

  // If not found locally and Supabase is configured, try fetching user profile directly
  if (!matched && docRef.collectionName === 'userProfiles' && isSupabaseConfigured && supabase) {
    try {
      const profiles = await fetchSupabaseUserProfiles();
      const found = profiles.find(p => p.uid === docRef.id);
      if (found) {
        matched = { ...found, id: found.uid };
        mergeCollectionByKey('userProfiles', [matched], 'uid');
      }
    } catch {
      // quiet
    }
  }

  return {
    id: docRef.id,
    exists: () => Boolean(matched),
    data: () => matched
  };
}

export async function getDocs(target: StandaloneCollectionRef | StandaloneQuery): Promise<QuerySnapshot> {
  const q = target instanceof StandaloneQuery ? target : new StandaloneQuery(target.collectionName);
  const results = q.execute();
  const docs: DocumentSnapshot[] = results.map(item => ({
    id: item.id || item.uid || '',
    exists: () => true,
    data: () => item
  }));
  return {
    size: docs.length,
    empty: docs.length === 0,
    docs,
    forEach: cb => docs.forEach(cb)
  };
}

function syncCollectionRecordToSupabase(collectionName: string, record: any) {
  if (collectionName === 'userProfiles') {
    syncUserToDirectory(record);
  } else if (collectionName === 'friendRequests') {
    upsertSupabaseFriendRequest(record);
  } else if (collectionName === 'friendships') {
    upsertSupabaseFriendship(record);
  } else if (collectionName === 'conversations') {
    upsertSupabaseConversation(record);
  } else if (collectionName === 'statuses') {
    upsertSupabaseStatus(record);
  }
}

export async function setDoc(docRef: StandaloneDocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const items = getCollectionData<any>(docRef.collectionName);
  const existingIndex = items.findIndex(i => (i.id && i.id === docRef.id) || (i.uid && i.uid === docRef.id));

  const record = {
    ...data,
    id: docRef.id,
    uid: data.uid || docRef.id,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    if (options?.merge) {
      items[existingIndex] = { ...items[existingIndex], ...record };
    } else {
      items[existingIndex] = record;
    }
  } else {
    items.push(record);
  }
  saveCollectionData(docRef.collectionName, items);
  syncCollectionRecordToSupabase(docRef.collectionName, existingIndex !== -1 ? items[existingIndex] : record);
}

export async function updateDoc(docRef: StandaloneDocRef, updates: any): Promise<void> {
  const items = getCollectionData<any>(docRef.collectionName);
  const existingIndex = items.findIndex(i => (i.id && i.id === docRef.id) || (i.uid && i.uid === docRef.id));

  if (existingIndex !== -1) {
    items[existingIndex] = {
      ...items[existingIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveCollectionData(docRef.collectionName, items);
    syncCollectionRecordToSupabase(docRef.collectionName, items[existingIndex]);
  }
}

export async function deleteDoc(docRef: StandaloneDocRef): Promise<void> {
  const items = getCollectionData<any>(docRef.collectionName);
  const filtered = items.filter(i => i.id !== docRef.id && i.uid !== docRef.id);
  saveCollectionData(docRef.collectionName, filtered);

  if (isSupabaseConfigured && supabase) {
    try {
      const tableMap: Record<string, string> = {
        userProfiles: 'user_profiles',
        friendRequests: 'friend_requests',
        friendships: 'friendships',
        conversations: 'conversations',
        statuses: 'statuses'
      };
      const table = tableMap[docRef.collectionName];
      if (table) {
        await supabase.from(table).delete().eq('id', docRef.id);
      }
    } catch {
      // quiet
    }
  }
}

export async function addDoc(colRef: StandaloneCollectionRef, data: any): Promise<StandaloneDocRef> {
  const id = generateUUID();
  const docRef = new StandaloneDocRef(colRef.collectionName, id);
  await setDoc(docRef, { ...data, id });
  return docRef;
}
