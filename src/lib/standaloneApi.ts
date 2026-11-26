// STANDALONE LOCAL API & REACTIVE STORE FOR ERROREX
// Integrated with Supabase PostgreSQL (Primary Cloud DB) + Express Backend + Local Reactive Cache
import { supabase, isSupabaseConfigured, initSupabaseRuntime } from './supabase';
import {
  generateUUID,
  generateSaltHex,
  hashPinClient,
  isLegacyTestAccount,
  upsertSupabaseUserProfile,
  fetchSupabaseUserProfiles,
  fetchSupabaseUserProfilesResult,
  fetchSupabaseUserProfileByUid,
  fetchSupabaseUserProfileByEmail,
  upsertSupabaseAuthCredential,
  fetchSupabaseAuthCredential,
  upsertSupabaseFriendRequest,
  fetchSupabaseFriendRequests,
  fetchSupabaseFriendRequestsResult,
  upsertSupabaseFriendship,
  fetchSupabaseFriendships,
  fetchSupabaseFriendshipsResult,
  upsertSupabaseConversation,
  upsertSupabaseStatus,
  fetchSupabaseStatuses,
  fetchSupabaseStatusesResult,
  deleteSupabaseUserAccount
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

function mergeCollectionByKey(
  collectionName: string,
  incoming: any[],
  keyField = 'id',
  replaceRemoteOwned = false
) {
  if (!Array.isArray(incoming)) return;
  const existing = getCollectionData<any>(collectionName);
  const map = new Map<string, any>();

  if (!replaceRemoteOwned) {
    existing.forEach(item => {
      const k = item[keyField] || item.uid || item.id;
      if (k && !isLegacyTestAccount(item.uid, item.username, item.displayName)) {
        map.set(k, item);
      }
    });
  } else {
    // Keep matching items plus very fresh (<15s) optimistic local writes still syncing up
    const incomingKeys = new Set(incoming.map(item => item[keyField] || item.uid || item.id).filter(Boolean));
    const nowMs = Date.now();
    existing.forEach(item => {
      const k = item[keyField] || item.uid || item.id;
      if (!k || isLegacyTestAccount(item.uid, item.username, item.displayName)) return;
      const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      const isFreshOptimistic =
        (collectionName === 'friendRequests' || collectionName === 'friendships') &&
        createdMs > 0 &&
        nowMs - createdMs < 15000;
      if (incomingKeys.has(k) || isFreshOptimistic) {
        map.set(k, item);
      }
    });
  }

  incoming.forEach(item => {
    const k = item[keyField] || item.uid || item.id;
    if (k && !isLegacyTestAccount(item.uid, item.username, item.displayName)) {
      const prev = map.get(k);
      map.set(k, prev ? { ...prev, ...item } : item);
    }
  });

  saveCollectionData(collectionName, Array.from(map.values()));
}

export async function syncUserToDirectory(profile: any): Promise<boolean> {
  if (!profile || !profile.uid) return false;
  if (isLegacyTestAccount(profile.uid, profile.username, profile.displayName)) return false;

  await initSupabaseRuntime();

  // 1. Sync to Supabase PostgreSQL (primary cloud persistence for Netlify & all devices)
  const suSaved = await upsertSupabaseUserProfile({
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    email: profile.email || '',
    photoURL: profile.photoURL || '',
    bio: profile.bio !== undefined ? profile.bio : 'Available on ERROREX',
    privacySettings: profile.privacySettings,
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

  return suSaved;
}

let realtimeSubscribedUid: string | null = null;
let realtimeChannel: any = null;
let socialPollTimer: any = null;

async function pullSocialFromSupabase(uid: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !uid) return;
  try {
    const [profilesRes, requestsRes, friendshipsRes, statusesRes] = await Promise.all([
      fetchSupabaseUserProfilesResult(),
      fetchSupabaseFriendRequestsResult(uid),
      fetchSupabaseFriendshipsResult(uid),
      fetchSupabaseStatusesResult()
    ]);

    if (profilesRes.ok) {
      const localCurrent = getCollectionData<any>('userProfiles').find(p => p.uid === uid);
      const mergedIncoming = profilesRes.data.map(p => ({ ...p, id: p.uid }));
      if (localCurrent && !mergedIncoming.some(p => p.uid === uid)) {
        mergedIncoming.push({ ...localCurrent, id: uid });
      }
      if (mergedIncoming.length > 0) {
        mergeCollectionByKey('userProfiles', mergedIncoming, 'uid', true);
      }
    }
    // Reconcile requests, friendships, statuses ONLY when Supabase query succeeded
    if (requestsRes.ok) {
      mergeCollectionByKey('friendRequests', requestsRes.data, 'id', true);
    }
    if (friendshipsRes.ok) {
      mergeCollectionByKey('friendships', friendshipsRes.data, 'id', true);
    }
    if (statusesRes.ok) {
      mergeCollectionByKey('statuses', statusesRes.data, 'id', true);
    }
  } catch (err) {
    console.warn('[Supabase Hydrate] Notice:', err);
  }
}

export async function hydrateStandaloneFromSupabase(uid: string): Promise<void> {
  if (!uid) return;
  await initSupabaseRuntime();
  if (!isSupabaseConfigured || !supabase) return;

  await pullSocialFromSupabase(uid);

  // Subscribe to Supabase Realtime updates once per UID
  if (realtimeSubscribedUid !== uid) {
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch {
        // ignore
      }
    }
    if (socialPollTimer) {
      clearInterval(socialPollTimer);
      socialPollTimer = null;
    }

    realtimeSubscribedUid = uid;
    try {
      realtimeChannel = supabase
        .channel(`errorex_social_${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, async () => {
          const profilesRes = await fetchSupabaseUserProfilesResult();
          if (profilesRes.ok) {
            const localCurrent = getCollectionData<any>('userProfiles').find(p => p.uid === uid);
            const mergedIncoming = profilesRes.data.map(p => ({ ...p, id: p.uid }));
            if (localCurrent && !mergedIncoming.some(p => p.uid === uid)) {
              mergedIncoming.push({ ...localCurrent, id: uid });
            }
            if (mergedIncoming.length > 0) {
              mergeCollectionByKey('userProfiles', mergedIncoming, 'uid', true);
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, async () => {
          const requestsRes = await fetchSupabaseFriendRequestsResult(uid);
          if (requestsRes.ok) {
            mergeCollectionByKey('friendRequests', requestsRes.data, 'id', true);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, async () => {
          const friendshipsRes = await fetchSupabaseFriendshipsResult(uid);
          if (friendshipsRes.ok) {
            mergeCollectionByKey('friendships', friendshipsRes.data, 'id', true);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, async () => {
          const statusesRes = await fetchSupabaseStatusesResult();
          if (statusesRes.ok) {
            mergeCollectionByKey('statuses', statusesRes.data, 'id', true);
          }
        })
        .subscribe();
    } catch {
      // ignore realtime subscription errors
    }

    // Gentle 5s fallback refresh across Netlify & Cloudflare even if Realtime WS drops
    socialPollTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      pullSocialFromSupabase(uid).catch(() => {});
    }, 5000);
  }
}

export function stopStandaloneRealtime(): void {
  if (realtimeChannel && supabase) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch {
      // ignore
    }
  }
  realtimeChannel = null;
  realtimeSubscribedUid = null;
  if (socialPollTimer) {
    clearInterval(socialPollTimer);
    socialPollTimer = null;
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

  private cacheProfileLocally(profile: any) {
    if (!profile || !profile.uid) return;
    mergeCollectionByKey('userProfiles', [{ ...profile, id: profile.uid }], 'uid', false);
  }

  async signInWithEmailAndPassword(email: string, pass: string): Promise<{ user: StandaloneUser }> {
    const cleanEmail = email.toLowerCase().trim();
    await initSupabaseRuntime();

    const regUsersRaw = localStorage.getItem('errorex_registered_users');
    const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];
    const matchedLocal = regUsers.find(u => u.email === cleanEmail);

    let supabaseAuthErrorMsg = '';

    // 1. Try primary Supabase Auth signInWithPassword
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass
        });

        if (data?.user) {
          if (data.user.user_metadata?.errorex_deleted === true) {
            await supabase.auth.signOut().catch(() => {});
            throw new Error('This account has been permanently deleted.');
          }
          // Fetch full cloud profile from user_profiles so displayName, username, DP, bio stay intact
          const cloudProfile =
            (await fetchSupabaseUserProfileByUid(data.user.id)) ||
            (await fetchSupabaseUserProfileByEmail(cleanEmail));

          const resolvedUid = cloudProfile?.uid || data.user.id;
          const resolvedDisplayName =
            cloudProfile?.displayName ||
            data.user.user_metadata?.display_name ||
            cleanEmail.split('@')[0];

          const suUser: StandaloneUser = {
            uid: resolvedUid,
            email: data.user.email || cleanEmail,
            displayName: resolvedDisplayName,
            photoURL: cloudProfile?.photoURL || data.user.user_metadata?.avatar_url || '',
            emailVerified: Boolean(data.user.email_confirmed_at),
            getIdToken: async () => data.session?.access_token || `token_${resolvedUid}`
          };

          if (cloudProfile) {
            this.cacheProfileLocally({ ...cloudProfile, isOnline: true, lastSeen: new Date().toISOString() });
          }

          // Store salted auth hash so future cross-device logins stay resilient
          const authSalt = generateSaltHex();
          const authHash = await hashPinClient(pass, authSalt);
          upsertSupabaseAuthCredential(resolvedUid, authHash, authSalt).catch(() => {});

          this.setCurrentUser(suUser);
          return { user: suUser };
        }

        if (error) {
          supabaseAuthErrorMsg = error.message?.toLowerCase() || '';
        }
      } catch (err: any) {
        console.warn('[Supabase Auth] Login fallback check:', err?.message || err);
      }

      // 2. Cross-device resilience: If Supabase Auth has "Confirm Email" ON or account was created during SMTP fallback,
      // resolve exact UID & profile from public.user_profiles by email + verify salted password hash!
      try {
        const existingProfile = await fetchSupabaseUserProfileByEmail(cleanEmail);
        if (existingProfile) {
          const authCred = await fetchSupabaseAuthCredential(existingProfile.uid);
          let passwordVerified = false;

          if (authCred) {
            const candidate = await hashPinClient(pass, authCred.authSalt);
            if (candidate === authCred.authHash) {
              passwordVerified = true;
            } else {
              throw new Error('Invalid email or password.');
            }
          } else if (matchedLocal) {
            if (matchedLocal.password === pass) {
              passwordVerified = true;
            } else {
              throw new Error('Invalid email or password.');
            }
          } else if (supabaseAuthErrorMsg.includes('email not confirmed')) {
            // Email confirmation is ON in Supabase dashboard and no auth_hash was saved on an older account
            passwordVerified = true;
          } else if (supabaseAuthErrorMsg.includes('invalid login credentials')) {
            throw new Error('Invalid email or password.');
          }

          if (passwordVerified) {
            this.cacheProfileLocally({
              ...existingProfile,
              isOnline: true,
              lastSeen: new Date().toISOString()
            });
            const restoredUser: StandaloneUser = {
              uid: existingProfile.uid,
              email: existingProfile.email || cleanEmail,
              displayName: existingProfile.displayName,
              photoURL: existingProfile.photoURL || '',
              emailVerified: true,
              getIdToken: async () => `token_${existingProfile.uid}`
            };
            this.setCurrentUser(restoredUser);
            return { user: restoredUser };
          }
        }
      } catch (err: any) {
        if (
          err?.message === 'Invalid email or password.' ||
          err?.message === 'This account has been permanently deleted.'
        ) {
          throw err;
        }
      }
    }

    // 3. Local registered accounts fallback (offline or before cloud sync)
    if (matchedLocal) {
      if (matchedLocal.password !== pass) {
        throw new Error('Invalid email or password.');
      }
      const user: StandaloneUser = {
        uid: matchedLocal.uid,
        email: matchedLocal.email,
        displayName: matchedLocal.displayName,
        photoURL: matchedLocal.photoURL || '',
        emailVerified: true,
        getIdToken: async () => `token_${matchedLocal.uid}`
      };
      this.setCurrentUser(user);
      return { user };
    }

    throw new Error('Invalid email or password. Please check your details or Create Account first.');
  }

  async createUserWithEmailAndPassword(
    email: string,
    pass: string,
    customDisplayName?: string
  ): Promise<{ user: StandaloneUser }> {
    const cleanEmail = email.toLowerCase().trim();
    const displayName = (customDisplayName || '').trim() || cleanEmail.split('@')[0];
    const cleanUsername =
      displayName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 20) || `user_${Date.now().toString().slice(-5)}`;
    const nowIso = new Date().toISOString();

    await initSupabaseRuntime();

    // Check if email already registered in Supabase directory first
    if (isSupabaseConfigured && supabase) {
      const alreadyInCloud = await fetchSupabaseUserProfileByEmail(cleanEmail);
      if (alreadyInCloud) {
        throw new Error('An account with this email already exists. Please Sign In instead.');
      }
    }

    let resolvedUid = generateUUID();

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
          if (!msg.includes('rate limit') && !msg.includes('sending confirmation') && !msg.includes('email')) {
            throw new Error(error.message);
          }
          console.warn('[Supabase Auth] Email dispatch notice, completing cloud profile registration:', error.message);
        } else if (data?.user) {
          // Supabase returns identities: [] when email already exists and Confirm Email is enabled
          if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            throw new Error('An account with this email already exists. Please Sign In instead.');
          }
          resolvedUid = data.user.id;
        }
      } catch (err: any) {
        if (err?.message?.includes('already exists') || err?.message?.includes('Password')) {
          throw err;
        }
        console.warn('[Supabase Auth] Registration notice:', err?.message || err);
      }
    }

    // 2. Save local registered credentials for offline/quick fallback
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

    // 3. Create & immediately persist full profile + cross-device auth hash to Supabase
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

    const authSalt = generateSaltHex();
    const authHash = await hashPinClient(pass, authSalt);

    await Promise.all([
      syncUserToDirectory(newProfile),
      upsertSupabaseAuthCredential(resolvedUid, authHash, authSalt)
    ]);

    this.setCurrentUser(newUser);
    return { user: newUser };
  }

  async signOut(): Promise<void> {
    stopStandaloneRealtime();
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
    await initSupabaseRuntime();
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

  async checkRegisteredEmail(email: string): Promise<{
    exists: boolean;
    uid?: string;
    displayName?: string;
    photoURL?: string;
    email?: string;
  }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return { exists: false };

    await initSupabaseRuntime();

    // 1. Check Supabase user_profiles first (live cloud directory)
    if (isSupabaseConfigured && supabase) {
      try {
        const suProfile = await fetchSupabaseUserProfileByEmail(cleanEmail);
        if (suProfile && suProfile.uid && !isLegacyTestAccount(suProfile.uid, suProfile.username, suProfile.displayName)) {
          return {
            exists: true,
            uid: suProfile.uid,
            displayName: suProfile.displayName,
            photoURL: suProfile.photoURL || '',
            email: suProfile.email || cleanEmail
          };
        }
      } catch {
        // continue to local check
      }
    }

    // 2. Check local userProfiles & local registered credentials
    try {
      const localProfiles = getCollectionData<any>('userProfiles');
      const localProfileMatch = localProfiles.find(
        p => typeof p.email === 'string' && p.email.toLowerCase().trim() === cleanEmail
      );
      if (localProfileMatch?.uid) {
        return {
          exists: true,
          uid: localProfileMatch.uid,
          displayName: localProfileMatch.displayName || cleanEmail.split('@')[0],
          photoURL: localProfileMatch.photoURL || '',
          email: cleanEmail
        };
      }

      const regUsersRaw = localStorage.getItem('errorex_registered_users');
      const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];
      const regMatch = regUsers.find(u => typeof u.email === 'string' && u.email.toLowerCase().trim() === cleanEmail);
      if (regMatch?.uid) {
        return {
          exists: true,
          uid: regMatch.uid,
          displayName: regMatch.displayName || cleanEmail.split('@')[0],
          photoURL: regMatch.photoURL || '',
          email: cleanEmail
        };
      }
    } catch {
      // quiet
    }

    return { exists: false };
  }

  async recoverPasswordAndStartPinSetup(
    email: string,
    newPass: string
  ): Promise<{ user: StandaloneUser }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const check = await this.checkRegisteredEmail(cleanEmail);
    if (!check.exists || !check.uid) {
      throw new Error('This Gmail address is not registered yet. Please Create Account first.');
    }

    const uid = check.uid;
    const displayName = check.displayName || cleanEmail.split('@')[0];

    await initSupabaseRuntime();

    // Store salted SHA-256 hash of new password in Supabase user_credentials
    const authSalt = generateSaltHex();
    const authHash = await hashPinClient(newPass, authSalt);
    if (isSupabaseConfigured && supabase) {
      await upsertSupabaseAuthCredential(uid, authHash, authSalt);
    }

    // Update local credential store for offline resilience
    try {
      const regUsersRaw = localStorage.getItem('errorex_registered_users');
      const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];
      const idx = regUsers.findIndex(
        u => u.uid === uid || (typeof u.email === 'string' && u.email.toLowerCase().trim() === cleanEmail)
      );
      if (idx !== -1) {
        regUsers[idx].password = newPass;
      } else {
        regUsers.push({
          uid,
          email: cleanEmail,
          password: newPass,
          displayName,
          createdAt: new Date().toISOString()
        });
      }
      localStorage.setItem('errorex_registered_users', JSON.stringify(regUsers));
    } catch {
      // quiet
    }

    // Clear lock & trigger Calculator Password selection screen next
    try {
      localStorage.removeItem(`errorex_pin_cred_${uid}`);
      localStorage.removeItem(`errorex_pin_set_${uid}`);
      localStorage.removeItem(`errorex_unlocked_${uid}`);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`errorex_force_pin_setup_${uid}`, 'true');
      }
    } catch {
      // quiet
    }

    const recoveredUser: StandaloneUser = {
      uid,
      email: cleanEmail,
      displayName,
      photoURL: check.photoURL || '',
      emailVerified: true,
      getIdToken: async () => `token_${uid}`
    };

    this.setCurrentUser(recoveredUser);
    return { user: recoveredUser };
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
    await initSupabaseRuntime();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({ password: newPass });
      } catch {
        // quiet
      }
      const authSalt = generateSaltHex();
      const authHash = await hashPinClient(newPass, authSalt);
      await upsertSupabaseAuthCredential(user.uid, authHash, authSalt);
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

  async verifyCurrentCredentials(user: StandaloneUser, email: string, password: string): Promise<void> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const accountEmail = (user.email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter your account Gmail address.');
    }
    if (accountEmail && cleanEmail !== accountEmail) {
      throw new Error('The Gmail address entered does not match your signed-in account.');
    }
    if (!password) {
      throw new Error('Please enter your account password.');
    }

    await initSupabaseRuntime();

    // 1. Verify against Supabase user_credentials salted hash (supports password resets too)
    if (isSupabaseConfigured && supabase) {
      const authCred = await fetchSupabaseAuthCredential(user.uid);
      if (authCred && authCred.authHash && authCred.authSalt) {
        const candidateHash = await hashPinClient(password, authCred.authSalt);
        if (candidateHash === authCred.authHash) {
          return;
        }
        throw new Error('Incorrect password. Please enter the correct password for this account.');
      }
    }

    // 2. Verify against local registered users store
    try {
      const regUsersRaw = localStorage.getItem('errorex_registered_users');
      const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];
      const matchedLocal = regUsers.find(
        u =>
          u.uid === user.uid ||
          (typeof u.email === 'string' && u.email.toLowerCase().trim() === cleanEmail)
      );
      if (matchedLocal) {
        if (matchedLocal.password === password) {
          return;
        }
        throw new Error('Incorrect password. Please enter the correct password for this account.');
      }
    } catch (err: any) {
      if (err?.message?.includes('Incorrect password')) throw err;
    }

    // 3. Verify directly with Supabase Auth signInWithPassword
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error || !data?.user) {
        throw new Error('Incorrect password or no password is set on this account.');
      }
      return;
    }

    throw new Error('Could not verify your account password.');
  }

  async permanentlyDeleteAccount(user: StandaloneUser, email: string, password: string): Promise<void> {
    await this.verifyCurrentCredentials(user, email, password);

    const uid = user.uid;
    const cleanEmail = (email || user.email || '').trim().toLowerCase();

    stopStandaloneRealtime();
    await initSupabaseRuntime();

    // 1. Mark Supabase Auth user as deleted & scramble password if active session exists
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const scrambled = `DELETED_${generateUUID()}_${Date.now()}`;
          await supabase.auth.updateUser({
            password: scrambled,
            data: { errorex_deleted: true, deleted_at: new Date().toISOString() }
          });
        }
      } catch {
        // non-fatal if session isn't an active Supabase Auth JWT
      }

      // 2. Delete all user records across all 7 Supabase PostgreSQL tables
      await deleteSupabaseUserAccount(uid);
    }

    // 3. Best-effort delete from Express backend directory if running on Express server
    try {
      await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
    } catch {
      // quiet on static hosting (Netlify / Cloudflare)
    }

    // 4. Purge all local storage records for this user
    try {
      const regUsersRaw = localStorage.getItem('errorex_registered_users');
      if (regUsersRaw) {
        const regUsers: any[] = JSON.parse(regUsersRaw);
        const filtered = regUsers.filter(
          u =>
            u.uid !== uid &&
            (!cleanEmail || (u.email || '').toLowerCase().trim() !== cleanEmail)
        );
        localStorage.setItem('errorex_registered_users', JSON.stringify(filtered));
      }

      saveCollectionData(
        'userProfiles',
        getCollectionData<any>('userProfiles').filter(p => p.uid !== uid && p.id !== uid)
      );
      saveCollectionData(
        'friendRequests',
        getCollectionData<any>('friendRequests').filter(
          r => r.senderId !== uid && r.receiverId !== uid
        )
      );
      saveCollectionData(
        'friendships',
        getCollectionData<any>('friendships').filter(
          f => f.userA !== uid && f.userB !== uid
        )
      );
      saveCollectionData(
        'statuses',
        getCollectionData<any>('statuses').filter(s => s.userId !== uid)
      );

      localStorage.removeItem(`errorex_pin_cred_${uid}`);
      localStorage.removeItem(`errorex_pin_set_${uid}`);
      localStorage.removeItem(`errorex_unlocked_${uid}`);
      localStorage.removeItem('errorex_standalone_user');
      localStorage.removeItem('errorex_session');

      if (localStorage.getItem('errorex_last_uid') === uid) {
        localStorage.removeItem('errorex_last_uid');
      }

      const savedCredsRaw = localStorage.getItem('errorex_saved_credentials');
      if (savedCredsRaw) {
        try {
          const parsed = JSON.parse(savedCredsRaw);
          if ((parsed?.email || '').toLowerCase().trim() === cleanEmail) {
            localStorage.removeItem('errorex_saved_credentials');
          }
        } catch {
          localStorage.removeItem('errorex_saved_credentials');
        }
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(`errorex_force_pin_setup_${uid}`);
      }
    } catch {
      // quiet
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // quiet
      }
    }

    this._currentUser = null;
    this.emitAuthChange();
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

  // If Supabase is configured, always check cloud profile if missing locally
  if (!matched && docRef.collectionName === 'userProfiles') {
    await initSupabaseRuntime();
    if (isSupabaseConfigured && supabase) {
      try {
        const found = await fetchSupabaseUserProfileByUid(docRef.id);
        if (found) {
          matched = { ...found, id: found.uid };
          mergeCollectionByKey('userProfiles', [matched], 'uid', false);
        }
      } catch {
        // quiet
      }
    }
  }

  return {
    id: docRef.id,
    exists: () => Boolean(matched),
    data: () => matched
  };
}

export async function getDocs(target: StandaloneCollectionRef | StandaloneQuery): Promise<QuerySnapshot> {
  if (target.collectionName === 'userProfiles') {
    await initSupabaseRuntime();
    if (isSupabaseConfigured && supabase) {
      try {
        const remoteProfiles = await fetchSupabaseUserProfiles();
        if (remoteProfiles.length > 0) {
          mergeCollectionByKey(
            'userProfiles',
            remoteProfiles.map(p => ({ ...p, id: p.uid })),
            'uid',
            false
          );
        }
      } catch {
        // quiet
      }
    }
  }

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

async function syncCollectionRecordToSupabase(collectionName: string, record: any): Promise<void> {
  if (collectionName === 'userProfiles') {
    await syncUserToDirectory(record);
  } else if (collectionName === 'friendRequests') {
    await upsertSupabaseFriendRequest(record);
  } else if (collectionName === 'friendships') {
    await upsertSupabaseFriendship(record);
  } else if (collectionName === 'conversations') {
    await upsertSupabaseConversation(record);
  } else if (collectionName === 'statuses') {
    await upsertSupabaseStatus(record);
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
  await syncCollectionRecordToSupabase(docRef.collectionName, existingIndex !== -1 ? items[existingIndex] : record);
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
    await syncCollectionRecordToSupabase(docRef.collectionName, items[existingIndex]);
  } else {
    const newRecord = {
      ...updates,
      id: docRef.id,
      uid: updates.uid || docRef.id,
      updatedAt: new Date().toISOString()
    };
    items.push(newRecord);
    saveCollectionData(docRef.collectionName, items);
    await syncCollectionRecordToSupabase(docRef.collectionName, newRecord);
  }
}

export async function deleteDoc(docRef: StandaloneDocRef): Promise<void> {
  const items = getCollectionData<any>(docRef.collectionName);
  const filtered = items.filter(i => i.id !== docRef.id && i.uid !== docRef.id);
  saveCollectionData(docRef.collectionName, filtered);

  await initSupabaseRuntime();
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
        const keyCol = docRef.collectionName === 'userProfiles' ? 'uid' : 'id';
        await supabase.from(table).delete().eq(keyCol, docRef.id);
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
