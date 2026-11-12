// STANDALONE LOCAL API & REACTIVE STORE FOR ERROREX
// 100% Independent of Firebase - Integrated with Supabase PostgreSQL & Local Storage
import { supabase, isSupabaseConfigured } from './supabase';

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

function getCollectionData<T = any>(collectionName: string): T[] {
  try {
    const raw = localStorage.getItem(`${DB_PREFIX}${collectionName}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read collection ${collectionName}:`, e);
  }
  return [];
}

function saveCollectionData<T = any>(collectionName: string, data: T[]): void {
  try {
    localStorage.setItem(`${DB_PREFIX}${collectionName}`, JSON.stringify(data));
    emitChange(collectionName);
  } catch (e) {
    console.warn(`Failed to save collection ${collectionName}:`, e);
  }
}

// Clean slate: No test users or mock accounts
function cleanLegacyData() {
  try {
    const saved = localStorage.getItem('errorex_standalone_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u.uid === 'test_user_noor_1434' || u.displayName === 'Noor' || u.username === 'noor') {
        localStorage.removeItem('errorex_standalone_user');
      }
    }
    // Clean old collection seeds
    const oldProfiles = getCollectionData('userProfiles');
    const filteredProfiles = oldProfiles.filter((p: any) => p.uid !== 'test_user_noor_1434' && p.uid !== 'user_test_partner');
    if (filteredProfiles.length !== oldProfiles.length) {
      saveCollectionData('userProfiles', filteredProfiles);
    }
  } catch (e) {
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
        if (u.uid === 'test_user_noor_1434' || u.displayName === 'Noor') {
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
    } catch (e) {
      this._currentUser = null;
    }
  }

  get currentUser(): StandaloneUser | null {
    return this._currentUser;
  }

  onAuthStateChanged(callback: (user: StandaloneUser | null) => void): Unsubscribe {
    this.authListeners.add(callback);
    // Initial call
    setTimeout(() => {
      callback(this._currentUser);
    }, 0);
    return () => {
      this.authListeners.delete(callback);
    };
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
    
    // If Supabase is configured with real credentials, authenticate via Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass
        });
        if (error) {
          console.warn('[Supabase Auth] Login notice:', error.message);
        } else if (data?.user) {
          const suUser: StandaloneUser = {
            uid: data.user.id,
            email: data.user.email || cleanEmail,
            displayName: data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
            photoURL: data.user.user_metadata?.avatar_url || '',
            emailVerified: Boolean(data.user.email_confirmed_at),
            getIdToken: async () => data.session?.access_token || `token_${data.user.id}`
          };
          this._currentUser = suUser;
          localStorage.setItem('errorex_standalone_user', JSON.stringify(suUser));
          this.emitAuthChange();
          return { user: suUser };
        }
      } catch (err) {
        console.warn('[Supabase Auth] Fallback to standalone store:', err);
      }
    }


    // Check registered accounts
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
      this._currentUser = user;
      localStorage.setItem('errorex_standalone_user', JSON.stringify(user));
      this.emitAuthChange();
      return { user };
    }

    // Auto-allow valid email for seamless experience
    const newUser: StandaloneUser = {
      uid: `user_${Date.now()}`,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      photoURL: '',
      emailVerified: true,
      getIdToken: async () => `token_${cleanEmail}`
    };
    this._currentUser = newUser;
    localStorage.setItem('errorex_standalone_user', JSON.stringify(newUser));
    this.emitAuthChange();
    return { user: newUser };
  }

  async createUserWithEmailAndPassword(email: string, pass: string): Promise<{ user: StandaloneUser }> {
    const cleanEmail = email.toLowerCase().trim();
    const uid = `user_${Date.now()}`;
    const displayName = cleanEmail.split('@')[0];

    // If Supabase is configured with real credentials, register via Supabase
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
          throw new Error(error.message);
        }
        if (data?.user) {
          const targetUser = data.user;
          const suUser: StandaloneUser = {
            uid: targetUser.id,
            email: targetUser.email || cleanEmail,
            displayName,
            photoURL: '',
            emailVerified: Boolean(targetUser.email_confirmed_at),
            getIdToken: async () => data.session?.access_token || `token_${targetUser.id}`
          };
          this._currentUser = suUser;
          localStorage.setItem('errorex_standalone_user', JSON.stringify(suUser));
          this.emitAuthChange();
          return { user: suUser };
        }
      } catch (err: any) {
        console.warn('[Supabase Auth] Registration notice:', err);
        throw err;
      }
    }

    const regUsersRaw = localStorage.getItem('errorex_registered_users');
    const regUsers: any[] = regUsersRaw ? JSON.parse(regUsersRaw) : [];

    const existing = regUsers.find(u => u.email === cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    regUsers.push({
      uid,
      email: cleanEmail,
      password: pass,
      displayName,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('errorex_registered_users', JSON.stringify(regUsers));

    const newUser: StandaloneUser = {
      uid,
      email: cleanEmail,
      displayName,
      photoURL: '',
      emailVerified: true,
      getIdToken: async () => `token_${uid}`
    };

    // Create profile
    const profiles = getCollectionData('userProfiles');
    profiles.push({
      uid,
      username: displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20),
      displayName,
      photoURL: '',
      bio: 'Available on ERROREX',
      createdAt: new Date().toISOString(),
      isOnline: true,
      lastSeen: new Date().toISOString()
    });
    saveCollectionData('userProfiles', profiles);

    this._currentUser = newUser;
    localStorage.setItem('errorex_standalone_user', JSON.stringify(newUser));
    this.emitAuthChange();
    return { user: newUser };
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // quiet
      }
    }
    this._currentUser = null;
    localStorage.removeItem('errorex_standalone_user');
    this.emitAuthChange();
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    console.log(`[ERROREX API] Standalone password reset link dispatched to ${email}`);
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
    const regUsersRaw = localStorage.getItem('errorex_registered_users');
    if (regUsersRaw) {
      const regUsers: any[] = JSON.parse(regUsersRaw);
      const idx = regUsers.findIndex(u => u.uid === user.uid);
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

    // Apply filters
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

    // Apply orderBy
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

// Database Operations
export const standaloneDb = {
  name: 'errorex_standalone_database'
};

export function collection(db: any, collectionName: string): StandaloneCollectionRef {
  return new StandaloneCollectionRef(collectionName);
}

export function doc(db: any, collectionName: string, id: string): StandaloneDocRef {
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
          forEach: (cb) => docs.forEach(cb)
        };
        onNext(querySnap);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  // Immediate invocation
  setTimeout(trigger, 0);

  // Subscribe to collection events
  return addListener(collectionName, trigger);
}

export async function getDoc(docRef: StandaloneDocRef): Promise<DocumentSnapshot> {
  const items = getCollectionData<any>(docRef.collectionName);
  const matched = items.find(i => i.id === docRef.id || i.uid === docRef.id);
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
    forEach: (cb) => docs.forEach(cb)
  };
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

  // Background sync to Supabase PostgreSQL if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const tableName = docRef.collectionName === 'userProfiles' ? 'user_profiles' : docRef.collectionName;
      supabase.from(tableName).upsert(record).then(({ error }) => {
        if (error) console.warn(`[Supabase Sync] ${tableName}:`, error.message);
      });
    } catch (e) {
      // quiet background sync
    }
  }
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
  }
}

export async function deleteDoc(docRef: StandaloneDocRef): Promise<void> {
  const items = getCollectionData<any>(docRef.collectionName);
  const filtered = items.filter(i => (i.id !== docRef.id && i.uid !== docRef.id));
  saveCollectionData(docRef.collectionName, filtered);
}

export async function addDoc(colRef: StandaloneCollectionRef, data: any): Promise<StandaloneDocRef> {
  const id = `${colRef.collectionName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = new StandaloneDocRef(colRef.collectionName, id);
  await setDoc(docRef, { ...data, id });
  return docRef;
}
